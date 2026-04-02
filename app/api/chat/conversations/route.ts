import { ObjectId } from "mongodb"; // 引入 MongoDB 的 ObjectId，用于构造用户 id 查询条件

import { createChatMessage, toChatConversationDto } from "@/lib/chat"; // 创建聊天消息、把数据库文档转换成前端可用 DTO
import {
  getChatConversationsCollection, // 获取聊天会话集合
  type ChatConversationDocument, // 聊天会话文档类型
} from "@/lib/linkcollection";
import { validateSession } from "@/lib/vaildateSession"; // 校验当前登录会话

/**
 * TODO: 获取当前用户的所有对话列表
 *
 */
export async function GET() {
  const sessionResult = await validateSession(); // 先判断用户是否登录

  if (!sessionResult.ok) {
    return Response.json(
      { ok: false, message: sessionResult.message }, // 返回未登录 / 会话失效原因
      { status: sessionResult.status },
    );
  }

  try {
    const collection = await getChatConversationsCollection(); // 拿到 MongoDB 集合
    const conversations = await collection
      .find({ userId: new ObjectId(sessionResult.userId) }) // 只查询当前用户自己的对话
      .sort({ updatedAt: -1 }) // 按最后更新时间倒序，最新的放最前面
      .toArray(); // 转成数组

    return Response.json({
      ok: true,
      conversations: conversations.map(toChatConversationDto), // 每条会话都转换成前端需要的格式
    });
  } catch (error) {
    console.error("List conversations error:", error); // 服务端打印错误日志
    return Response.json(
      { ok: false, message: "读取对话失败，请稍后再试" }, // 返回统一错误提示
      { status: 500 },
    );
  }
}

/**
 * TODO: 创建一个新的对话
 *
 */
export async function POST() {
  const sessionResult = await validateSession(); // 先校验登录状态

  if (!sessionResult.ok) {
    return Response.json(
      { ok: false, message: sessionResult.message }, // 如果没通过校验，直接返回
      { status: sessionResult.status },
    );
  }

  try {
    const collection = await getChatConversationsCollection(); // 获取聊天会话集合
    const now = new Date(); // 统一记录当前时间

    // 构造一条新的会话文档
    const conversation: ChatConversationDocument = {
      userId: new ObjectId(sessionResult.userId), // 当前用户 id
      title: "新的对话", // 新对话的默认标题
      createdAt: now, // 创建时间
      updatedAt: now, // 更新时间（刚创建时和创建时间相同）
      messages: [
        createChatMessage(
          "assistant", // 默认先放一条 assistant 欢迎消息
          "我是 Aria。你可以直接提问，我可以帮你整理思路、生成内容、拆解任务和润色文本。",
          now,
        ),
      ],
    };

    const insertResult = await collection.insertOne(conversation); // 插入数据库

    // 手动拼出一份“创建后的完整文档”
    const createdConversation = {
      _id: insertResult.insertedId, // insertOne 返回的新文档 id
      userId: conversation.userId,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages,
    } satisfies ChatConversationDocument; // 用 satisfies 保证结构满足 ChatConversationDocument

    return Response.json({
      ok: true,
      conversation: toChatConversationDto(createdConversation), // 转成前端需要的格式后返回
    });
  } catch (error) {
    console.error("Create conversation error:", error); // 打印错误日志
    return Response.json(
      { ok: false, message: "创建对话失败，请稍后再试" }, // 返回统一失败提示
      { status: 500 },
    );
  }
}
