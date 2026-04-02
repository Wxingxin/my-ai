import { ObjectId } from "mongodb";

import { callModel } from "@/lib/models";
// 统一调用大模型的方法
// 可以理解成：把消息、工具、provider 传进去，拿到 AI 返回结果

import { resolveProvider } from "@/lib/models/provider";
// 根据前端传入的 provider，解析出当前要使用哪个模型提供商
// 比如 openai / deepseek / anthropic

import type { Message } from "@/lib/models/types/ai";
// 聊天消息类型
// 一般包含 role、content，可能还会带 tool_calls 等字段

import {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} from "@/lib/tools/todos";
// Todo 相关工具函数：
// createTodo -> 创建 Todo
// deleteTodo -> 删除 Todo
// listTodos   -> 查询当前用户 Todo 列表
// updateTodo  -> 更新 Todo（这里主要用来标记完成）

import { validateSession } from "@/lib/vaildateSession";
// 登录态校验函数
// 用来确认当前请求是否来自已登录用户

const TODO_AI_PROMPT = `
// 给 AI 的系统提示词
// 用来约束 AI 的职责和回复风格
你是 Todo 助手。
- 用中文回答。
- 当用户要求查看、创建、完成、删除 Todo 时，优先调用工具。
- 工具执行完成后，用自然语言告诉用户你做了什么，并顺手总结当前 Todo 状态。
- 不要输出原始 JSON。
- 不要使用复杂 Markdown。
`;

const todoTools = [
  // 提供给大模型的“工具列表”
  // 模型可以根据用户意图决定调用哪个工具
  {
    type: "function",
    function: {
      name: "get_todos",
      // 工具名称：获取 Todo 列表

      description: "获取当前用户的 todo 列表",
      // 给模型看的描述，帮助模型理解这个工具的用途

      parameters: {
        type: "object",
        properties: {},
      },
      // 这个工具不需要传参数
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      // 工具名称：创建 Todo

      description: "创建一条 todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          // Todo 标题

          description: { type: "string" },
          // Todo 描述

          priority: { type: "string", enum: ["low", "medium", "high"] },
          // 优先级，只允许 low / medium / high

          category: {
            type: "string",
            enum: ["work", "study", "life", "health", "finance", "other"],
          },
          // 分类，只允许固定值
        },
        required: ["title"],
        // 创建 Todo 最少必须有 title
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      // 工具名称：完成 Todo

      description: "将指定 todo 标记为完成",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          // 要完成的 Todo 的 id
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      // 工具名称：删除 Todo

      description: "删除指定 todo",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          // 要删除的 Todo 的 id
        },
        required: ["id"],
      },
    },
  },
];

const MAX_TOOL_ROUNDS = 6;
// 限制“模型调用工具”的最大轮数
// 防止模型陷入死循环：一直调用工具不停止

export async function POST(req: Request) {
  // 这个接口只处理 POST 请求
  // 前端会把消息 messages 和可选 provider 发过来

  const sessionResult = await validateSession();
  // 先校验用户是否登录

  if (!sessionResult.ok) {
    // 如果没有登录，或者 session 已失效，直接返回错误
    return Response.json(
      { ok: false, message: sessionResult.message },
      { status: sessionResult.status },
    );
  }

  try {
    const {
      messages,
      provider,
    }: {
      messages: Message[];
      provider?: string;
    } = await req.json();
    // 读取前端传来的请求体
    // messages: 聊天记录
    // provider: 指定使用哪个 AI 服务商（可选）

    const resolvedProvider = resolveProvider(provider);
    // 解析 provider，得到真正可用的模型提供商配置

    if (!resolvedProvider) {
      // 如果没有可用 provider，直接返回 500
      return Response.json(
        {
          ok: false,
          message:
            "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
        },
        { status: 500 },
      );
    }

    const fullMessages: Message[] = [
      { role: "system", content: TODO_AI_PROMPT },
      // 第一条消息放系统提示词，告诉模型它应该怎么做

      ...messages,
      // 再拼接用户和历史消息
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      // 开始工具调用循环
      // 每一轮都让模型根据当前 fullMessages 决定：
      // 1. 直接回答
      // 2. 还是继续调用工具

      const response = await callModel(
        fullMessages,
        todoTools,
        resolvedProvider,
      );
      // 调用模型
      // fullMessages: 当前完整上下文
      // todoTools: 可调用工具列表
      // resolvedProvider: 当前 provider

      if (!response.tool_calls || response.tool_calls.length === 0) {
        // 如果模型这一轮没有请求调用工具
        // 说明模型已经准备好直接回复用户了

        const todos = await listTodos(sessionResult.userId);
        // 这里顺便再查一次最新 Todo 列表
        // 这样前端能拿到当前最新状态

        return Response.json({
          ok: true,
          role: "assistant",
          content: response.content,
          // 模型最终生成给用户看的自然语言内容

          todos,
          // 当前最新 Todo 列表
        });
      }

      fullMessages.push({
        role: "assistant",
        content: response.content ?? "",
        tool_calls: response.tool_calls,
      });
      // 如果模型请求调用工具
      // 要先把这一条 assistant 消息追加到上下文中
      // 因为后续工具返回结果时，模型需要知道“是基于哪次工具调用得到的结果”

      for (const toolCall of response.tool_calls) {
        // 遍历模型本轮请求的所有工具调用

        const args = JSON.parse(toolCall.function.arguments);
        // 解析模型传来的工具参数
        // 例如 { title: "买牛奶" }、{ id: "xxx" }

        let result: unknown;
        // 用来保存工具执行结果
        // 类型不固定，所以先写 unknown

        if (toolCall.function.name === "get_todos") {
          // 如果模型要获取 todo 列表
          result = await listTodos(sessionResult.userId);
        } else if (toolCall.function.name === "add_todo") {
          // 如果模型要创建 todo
          result = await createTodo({
            userId: sessionResult.userId,
            // 绑定当前登录用户

            title: args.title,
            description: args.description,
            priority: args.priority,
            category: args.category,
            // 模型传什么，就写什么
          });
        } else if (toolCall.function.name === "complete_todo") {
          // 如果模型要完成某条 todo

          if (!ObjectId.isValid(args.id)) {
            // 先校验 id 是否合法
            throw new Error("Todo id 无效");
          }

          result = await updateTodo(sessionResult.userId, args.id, {
            status: "done",
          });
          // 把这条 todo 的状态更新为 done
        } else if (toolCall.function.name === "delete_todo") {
          // 如果模型要删除某条 todo

          if (!ObjectId.isValid(args.id)) {
            // 删除前也先校验 id
            throw new Error("Todo id 无效");
          }

          result = await deleteTodo(sessionResult.userId, args.id);
          // 删除该用户的指定 todo
        } else {
          // 如果模型返回了未定义的工具名称
          throw new Error(`未知工具: ${toolCall.function.name}`);
        }

        fullMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
        // 把工具执行结果再塞回 fullMessages
        // 这样下一轮模型就能看到工具返回值
        // 然后基于结果继续决定：
        // - 要不要继续调工具
        // - 还是直接生成回答
      }
    }

    return Response.json(
      { ok: false, message: "Todo AI 工具调用次数过多，请稍后重试" },
      { status: 500 },
    );
    // 如果循环跑满 MAX_TOOL_ROUNDS 还没有结束
    // 说明可能进入异常状态或死循环，直接中断
  } catch (error) {
    console.error("Todo AI error:", error);
    // 服务端打印错误日志，方便排查问题

    return Response.json(
      { ok: false, message: "Todo AI 暂时不可用，请稍后再试" },
      { status: 500 },
    );
    // 返回统一错误信息给前端
  }
}
