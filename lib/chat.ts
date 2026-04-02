import { ObjectId } from "mongodb"; // 引入 MongoDB 的 ObjectId，用于生成唯一 _id

import type {
  ChatConversationDocument, // 会话文档类型（数据库中的结构）
  ChatMessageDocument, // 消息文档类型
} from "@/lib/linkcollection";

/**
 * 标题清洗函数
 *
 * 1. 去空格
 * 2. 压缩连续空格
 * 3. 截取前 18 个字符
 * 4. 如果结果为空，返回默认标题 "新的对话"
 */
function trimTitle(value: string) {
  const normalized = value.trim().replace(/\s+/g, " "); // 去掉首尾空格，并将多个空格压缩成一个

  if (!normalized) {
    return "新的对话"; // 如果为空字符串，返回默认标题
  }

  return normalized.slice(0, 18); // 截取前 18 个字符作为标题
}

/**
 * 本质：语义封装
 */
export function createConversationTitleFromMessage(content: string) {
  return trimTitle(content); // 根据用户输入内容生成对话标题（复用 trimTitle）
}

/**
 * 这是整个系统最重要的一层：数据库 → 前端 DTO（数据传输对象）
 *
 * 为什么必须有 DTO？MongoDB 原始数据：前端不能直接用：❌ ObjectId❌ Date
 * 1. 检查 _id
 * 2. 转换 _id 为字符串（前端更友好）
 * 3. 转换 Date 为 ISO 字符串（前端更友好）
 * 4. messages 转换（重点）
 * 
 *
 */
export function toChatConversationDto(conversation: ChatConversationDocument) {
  if (!conversation._id) {
    throw new Error("Conversation _id is missing"); // 防御式编程，确保 _id 存在
  }

  return {
    id: conversation._id.toString(), // ObjectId 转 string，方便前端使用
    title: conversation.title, // 会话标题
    createdAt: conversation.createdAt.toISOString(), // Date 转 ISO 字符串（JSON 传输）
    updatedAt: conversation.updatedAt.toISOString(), // 同上

    messages: conversation.messages.map((message) => ({
      id: message._id?.toString() ?? "", // 消息 id 转 string，如果不存在则给空字符串
      role: message.role, // 消息角色（user / assistant）
      content: message.content, // 消息内容
      createdAt: message.createdAt.toISOString(), // 时间转字符串
    })),
  };
}

/**
 * 👉 统一创建消息结构
 * 
*/
export function createChatMessage(
  role: ChatMessageDocument["role"], // 使用类型约束，确保 role 合法
  content: string,
  createdAt = new Date(), // 默认当前时间
): ChatMessageDocument {
  return {
    _id: new ObjectId(), // 生成唯一 _id
    role, // 消息角色
    content, // 消息内容
    createdAt, // 创建时间
  };
}
