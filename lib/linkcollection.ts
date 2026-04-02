// lib/linkcollections.ts

import { getMongoDb } from "@/lib/db";

import { ObjectId, Collection } from "mongodb";

// FIXME:
// 定义 users 集合中每一条用户文档的数据结构
export type UsersCollectionType = {
  _id?: ObjectId; // MongoDB 自动生成的主键，新增前通常没有，所以写成可选

  username: string; // 用户名
  email: string; // 用户邮箱
  hashpassword: string; // 加密后的密码（不是明文密码）

  createdAt?: Date; // 用户创建时间
  updatedAt?: Date; // 用户更新时间

  // 用户头像信息
  // 为 null 表示还没有上传头像
  avatar: null | {
    objectName: string; // 文件在 MinIO / OSS / S3 中保存的唯一对象名
    url: string; // 图片访问地址
    contentType: string; // 文件类型，比如 image/png、image/jpeg
    size: number; // 文件大小，单位一般是字节
  };

  // 用户个人简介
  bio?: string;

  // 忘记密码相关字段
  resetPasswordCodeHash?: string | null; // 验证码的 hash 值（推荐真正存这个）
  resetPasswordCodeExpireAt?: Date | null; // 验证码过期时间
  resetPasswordCode?: string | null; // 原始验证码（一般不推荐直接存库）
  resetPasswordAttempts?: number; // 重试次数，防止暴力尝试
  resetPasswordLockedAt?: Date | null; // 被锁定的时间
};

// 获取 users 集合
// 返回值类型是 Promise<Collection<UsersCollectionType>>
// 也就是：异步拿到一个“元素结构受 UsersCollectionType 约束”的 MongoDB 集合
export async function getUsersCollection(): Promise<
  Collection<UsersCollectionType>
> {
  const db = await getMongoDb();
  // TODO: MONGODB_COLLECTION_XXX * 1 || xxx * 1
  const collectionName = process.env.MONGODB_COLLECTION_USERS || "users";
  if (!collectionName) {
    throw new Error(`Missing collectionName`);
  }
  return db.collection<UsersCollectionType>(collectionName);
}

// FIXME:
// Todo 优先级类型
export type TodoPriority = "low" | "medium" | "high";

// Todo 状态类型
export type TodoStatus = "todo" | "in_progress" | "done";

// Todo 分类类型
export type TodoCategory =
  | "work" // 工作
  | "study" // 学习
  | "life" // 生活
  | "health" // 健康
  | "finance" // 财务
  | "other"; // 其他

// 定义 todos 集合中每一条待办文档的数据结构
export type TodosCollectionType = {
  _id?: ObjectId; // MongoDB 主键

  userId: ObjectId; // 该待办属于哪个用户，对应 users._id

  title: string; // 待办标题，必填
  description?: string; // 待办详细描述，可选

  status: TodoStatus; // 当前状态：待开始 / 进行中 / 已完成
  priority: TodoPriority; // 优先级：低 / 中 / 高
  category: TodoCategory; // 分类

  dueDate?: Date; // 截止日期，可选
  completedAt?: Date; // 完成时间，可选

  createdAt: Date; // 创建时间
  updatedAt: Date; // 更新时间
};

// 获取 todos 集合
export async function getTodosCollection(): Promise<
  Collection<TodosCollectionType>
> {
  const db = await getMongoDb();
  const collectionName = process.env.MONGODB_COLLECTION_TODOS || "todos";
  return db.collection<TodosCollectionType>(collectionName);
}

// FIXME:
// 定义一条聊天消息的数据结构
export type ChatMessageDocument = {
  _id?: ObjectId; // 消息主键

  role: "user" | "assistant"; // 角色：用户消息 or AI 助手消息

  content: string; // 消息文本内容

  createdAt: Date; // 消息创建时间
};

// 定义一个聊天会话（对话）的数据结构
export type ChatConversationDocument = {
  _id?: ObjectId; // 对话主键

  userId: ObjectId; // 该对话属于哪个用户

  title: string; // 对话标题，比如“今天的待办安排”

  createdAt: Date; // 对话创建时间
  updatedAt: Date; // 对话最近更新时间

  messages: ChatMessageDocument[]; // 该对话下的所有消息，采用内嵌数组方式存储
};

// 给 globalThis 扩展一个自定义属性
// 用来缓存“创建 chat_conversations 索引”的 Promise
// 这样在开发环境热更新时，不会重复创建索引
const globalForChatCollection = globalThis as typeof globalThis & {
  __chatConversationsIndexesPromise?: Promise<void>;
};

// 确保 chat_conversations 集合的索引已经创建
async function ensureChatConversationIndexes(
  collection: Collection<ChatConversationDocument>,
) {
  // 如果全局中还没有缓存过创建索引的 Promise
  // 说明这是第一次执行，需要真正去创建索引
  if (!globalForChatCollection.__chatConversationsIndexesPromise) {
    globalForChatCollection.__chatConversationsIndexesPromise = collection
      .createIndexes([
        {
          // 创建复合索引：
          // userId 正序 + updatedAt 倒序
          // 适合这种查询：
          // find({ userId }).sort({ updatedAt: -1 })
          key: { userId: 1, updatedAt: -1 },

          // 索引名称，方便后续查看和维护
          name: "user_updatedAt_desc",
        },
      ])
      .then(() => undefined); // createIndexes 返回结果不需要，转换成 Promise<void>
  }

  // 等待索引创建完成
  await globalForChatCollection.__chatConversationsIndexesPromise;
}

// 获取聊天会话集合
export async function getChatConversationsCollection(): Promise<
  Collection<ChatConversationDocument>
> {
  const db = await getMongoDb();

  const collectionName =
    process.env.MONGODB_COLLECTION_CHAT_CONVERSATIONS || "chat_conversations";

  if (!collectionName) {
    throw new Error("Missing chat conversations collection name");
  }

  const collection = db.collection<ChatConversationDocument>(collectionName);

  // 确保索引已存在
  // 这样每次拿到集合时，都能保证索引已准备好
  await ensureChatConversationIndexes(collection);

  // 返回集合
  return collection;
}
