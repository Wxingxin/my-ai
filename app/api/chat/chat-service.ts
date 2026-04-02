import type { Collection } from "mongodb";

import {
  createChatMessage,
  createConversationTitleFromMessage,
  toChatConversationDto,
} from "@/lib/chat";
import { callModel } from "@/lib/models";
// 调用 AI 模型，拿到模型回复 / 工具调用请求

import type { Message, ModelProvider } from "@/lib/models/types/ai";
import { allTools, executeTool } from "@/lib/tools";
// allTools: 提供给模型可调用的全部工具定义
// executeTool: 真正执行某个工具

import type { ChatConversationDocument } from "@/lib/linkcollection";

const MAX_TOOL_ROUNDS = 6;
// 限制工具调用轮数，防止模型不断循环调用工具导致死循环

type PersistReplyParams = {
  collection: Collection<ChatConversationDocument>; // MongoDB 对话集合
  conversation: ChatConversationDocument; // 当前对话
  userMessage: ChatConversationDocument["messages"][number]; // 当前用户这次发送的消息
  assistantContent: string; // AI 最终回复内容
  trimmedContent: string; // 用户消息裁剪后的内容（通常用于生成标题）
};

type ExecuteChatParams = {
  collection: Collection<ChatConversationDocument>; // MongoDB 对话集合
  conversation: ChatConversationDocument; // 当前对话
  fullMessages: Message[]; // 完整消息上下文，提供给模型
  resolvedProvider: ModelProvider; // 当前实际使用的模型提供商
  trimmedContent: string; // 用户消息裁剪后的内容
  userMessage: ChatConversationDocument["messages"][number]; // 当前用户消息
  userId: string; // 当前登录用户 id
};

/**
 * 把 assistant 的最终回复持久化到数据库
 * 作用：
 * 1. 创建 assistant 消息
 * 2. 更新对话标题（如果是第一轮）
 * 3. 更新 updatedAt
 * 4. 把 userMessage + assistantMessage 一起写回数据库
 */
async function persistAssistantReply({
  collection,
  conversation,
  userMessage,
  assistantContent,
  trimmedContent,
}: PersistReplyParams) {
  // 创建一条 assistant 消息对象
  const assistantMessage = createChatMessage(
    "assistant",
    assistantContent,
    new Date(),
  );

  // 如果当前对话消息很少，说明可能是新对话
  // 这时根据用户输入生成一个标题
  // 否则继续使用原来的标题
  const nextTitle =
    conversation.messages.length <= 1
      ? createConversationTitleFromMessage(trimmedContent)
      : conversation.title;

  // 构造更新后的对话对象
  const updatedConversation = {
    ...conversation,
    title: nextTitle,
    updatedAt: assistantMessage.createdAt,
    messages: [...conversation.messages, userMessage, assistantMessage],
    // 旧消息 + 当前用户消息 + 当前 assistant 回复
  };

  // 持久化更新到 MongoDB
  await collection.updateOne(
    { _id: conversation._id, userId: conversation.userId },
    {
      $set: {
        title: nextTitle,
        updatedAt: assistantMessage.createdAt,
        messages: updatedConversation.messages,
      },
    },
  );

  // 返回更新后的对话，后面要继续转成 DTO 返回给前端
  return updatedConversation;
}

/**
 * 流式聊天
 * 特点：
 * 1. 支持模型调用工具
 * 2. 支持一边生成一边返回给前端
 * 3. 最终把完整回复写入数据库
 */
export async function executeStreamingChat({
  collection, // 聊天会话集合，后面可能要更新数据库
  conversation, // 当前会话文档，里面有历史消息等信息
  fullMessages, // 完整消息上下文，发给模型
  resolvedProvider, // 最终确定的 provider，例如 openai
  trimmedContent, // 当前用户输入的纯净文本
  userMessage, // 已经封装好的用户消息对象
  userId // 当前用户 id，后续保存数据库可能要用
}: ExecuteChatParams) {
  const encoder = new TextEncoder();
  // TextEncoder 用来把字符串编码成 Uint8Array
  // ReadableStream 里 enqueue 的是二进制数据

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // 复制一份消息上下文，避免直接污染传进来的 fullMessages
        const toolMessages = [...fullMessages];

        // console.log("allTools:", JSON.stringify(allTools, null, 2));

        // 最多允许模型进行 MAX_TOOL_ROUNDS 轮工具调用
        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
          // 调用模型
          // 模型可能返回：
          // 1. content（直接文本回答）
          // 2. tool_calls（要求调用某些工具）
          const modelResponse = await callModel(
            toolMessages,
            allTools,
            resolvedProvider,
          );

          // 如果模型没有要求调用工具
          // 说明当前 content 就是最终答案
          if (
            !modelResponse.tool_calls ||
            modelResponse.tool_calls.length === 0
          ) {
            const finalText = modelResponse.content ?? "";

            // 将最终文本按字符流式返回给前端
            // 前端可以边接收边显示，形成“打字机效果”
            for (const char of finalText) {
              controller.enqueue(
                encoder.encode(
                  `${JSON.stringify({ type: "chunk", content: char })}\n`,
                ),
              );

              // 这里人为加了一个很小的延迟，让流式效果更明显
              await new Promise((resolve) => setTimeout(resolve, 8));
            }

            // 把最终 assistant 回复写入数据库
            const updatedConversation = await persistAssistantReply({
              collection,
              conversation,
              userMessage,
              assistantContent: finalText,
              trimmedContent,
            });

            // 通知前端：流式输出结束，并附带最新 conversation 数据
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  type: "done",
                  conversation: toChatConversationDto(updatedConversation),
                })}\n`,
              ),
            );

            return;
          }

          // 如果模型要求调用工具：
          // 先把 assistant 这一轮“发起工具调用”的消息也加入上下文
          // 这样后续模型知道自己刚刚请求过哪些工具
          toolMessages.push({
            role: "assistant",
            content: modelResponse.content ?? "",
            tool_calls: modelResponse.tool_calls,
          });

          // 依次执行模型要求的每个工具
          for (const toolCall of modelResponse.tool_calls) {
            // 模型传回来的 arguments 是 JSON 字符串，这里先解析
            const args = JSON.parse(toolCall.function.arguments);

            // 真正执行工具
            const result = await executeTool(toolCall.function.name, args, {
              userId,
            });

            // 把工具执行结果作为 role=tool 的消息加入上下文
            // 下一轮再调用模型时，模型就能看到工具返回的数据
            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          }
        }

        // 如果超过最大工具轮数还没得到最终结果
        // 说明模型可能陷入循环了，直接返回错误
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              message: "工具调用次数过多，请稍后重试",
            })}\n`,
          ),
        );
      } catch (error) {
        // 整个流式执行过程出错
        // console.error("Streaming chat error:", error);

        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              message: "流式回复失败，请稍后再试",
            })}\n`,
          ),
        );
      } finally {
        // 无论成功还是失败，最后都关闭流
        controller.close();
      }
    },
  });

  // 返回一个流式响应
  // application/x-ndjson 表示每一行都是一个 JSON 对象
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

/**
 * 非流式聊天
 * 特点：
 * 1. 也支持工具调用
 * 2. 但不会一边生成一边输出
 * 3. 会等模型全部处理完成后一次性返回 JSON
 */
export async function executeNonStreamingChat({
  collection, // 聊天会话集合，后面可能要更新数据库
  conversation, // 当前会话文档，里面有历史消息等信息
  fullMessages, // 完整消息上下文，发给模型
  resolvedProvider, // 最终确定的 provider，例如 openai
  trimmedContent, // 当前用户输入的纯净文本
  userMessage, // 已经封装好的用户消息对象
  userId, // 当前用户 id，后续保存数据库可能要用
}: ExecuteChatParams) {
  // 最多循环 MAX_TOOL_ROUNDS 轮，防止工具调用死循环
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    // 调用模型
    const response = await callModel(fullMessages, allTools, resolvedProvider);

    // 如果这轮模型没有请求工具
    // 说明 response.content 就是最终答案
    if (!response.tool_calls || response.tool_calls.length === 0) {
      // 把最终回复写入数据库
      const updatedConversation = await persistAssistantReply({
        collection,
        conversation,
        userMessage,
        assistantContent: response.content ?? "",
        trimmedContent,
      });

      // 一次性返回最终结果给前端
      return Response.json({
        ok: true,
        conversation: toChatConversationDto(updatedConversation),
      });
    }

    // 把 assistant 的工具调用请求加入上下文
    fullMessages.push({
      role: "assistant",
      content: response.content ?? "",
      tool_calls: response.tool_calls,
    });

    // 执行每一个工具
    for (const toolCall of response.tool_calls) {
      // 解析工具参数
      const args = JSON.parse(toolCall.function.arguments);

      // console.log(`调用工具: ${toolCall.function.name}`, args);

      // 执行工具
      const result = await executeTool(toolCall.function.name, args, {
        userId,
      });

      // 把工具结果作为 tool 消息继续加入上下文
      // 供下一轮模型推理使用
      fullMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  // 如果执行到这里，说明超过最大工具轮数仍然没有最终答案
  return Response.json(
    { ok: false, message: "工具调用次数过多，请稍后重试" },
    { status: 500 },
  );
}
