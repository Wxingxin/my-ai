// app/api/chat/route.ts

import { ObjectId } from "mongodb"; // 从 mongodb 包中导入 ObjectId，用来校验字符串 id 是否合法，并在查询 MongoDB 时把字符串转成 ObjectId 类型

import { createChatMessage } from "@/lib/chat"; // 创建一条标准聊天消息的方法，通常会补齐 role、content、createdAt 等字段
import { getChatConversationsCollection } from "@/lib/linkcollection"; // 获取“聊天会话”这张集合（collection）
import { resolveProvider } from "@/lib/models/provider"; // 根据前端传入 provider，解析出真正可用的 AI 服务提供商
import { SYSTEM_PROMPT } from "@/lib/prompts/system"; // 系统提示词，告诉 AI 你是谁、该怎么回答、可以用哪些工具
import { Message } from "@/lib/models/types/ai"; // AI 对话消息的 TS 类型
import { validateSession } from "@/lib/vaildateSession"; // 校验当前用户是否已登录，并返回用户身份信息
import { executeNonStreamingChat, executeStreamingChat } from "./chat-service"; // 分别处理“非流式聊天”和“流式聊天”的核心逻辑

// 用户发消息
//    ↓
// 构建 fullMessages
//    ↓
// callModel（AI）
//    ↓
// AI决定：
//    ├── 直接回答（结束）
//    └── 调用工具（进入循环）
//             ↓
//         executeTool
//             ↓
//         把结果再喂给 AI
//             ↓
//         再次 callModel
//             ↓
//         直到 AI 不再调用工具
//    ↓
// 返回最终结果（流式 or 非流式）
//    ↓
// 写入数据库

export async function POST(req: Request) {
  // 定义 POST 接口：当前这个 /api/chat 路由只处理 POST 请求
  // req 是浏览器 / 前端发过来的原始请求对象

  // 1️⃣ 校验用户登录态
  const sessionResult = await validateSession();
  // 调用 validateSession 检查当前请求对应的用户是否登录
  // 一般会从 cookie / token 中读取会话信息
  // 返回结果通常像：
  // { ok: true, userId: "xxx" }
  // 或
  // { ok: false, message: "未登录", status: 401 }

  if (!sessionResult.ok) {
    // 如果没有登录，或者会话失效，就直接返回错误，不再继续执行后面的 AI 聊天逻辑
    return Response.json(
      { ok: false, message: sessionResult.message }, // 返回统一错误结构
      { status: sessionResult.status }, // 返回对应的 HTTP 状态码，例如 401 / 403
    );
  }

  try {
    // try 块里放“正常业务逻辑”
    // 如果中途抛出异常，就会进入 catch

    // 2️⃣ 解析请求体
    const {
      conversationId,
      content,
      provider,
    }: {
      conversationId: string; // 当前聊天会话 id
      content: string; // 用户当前发送的消息内容
      provider?: string; // 可选，前端指定想用哪个 AI 服务，比如 openai / deepseek / claude
    } = await req.json();
    // req.json() 用来读取前端 POST 传来的 JSON 数据
    // 例如前端可能传：
    // {
    //   conversationId: "67f....",
    //   content: "北京今天天气怎么样",
    //   provider: "openai"
    // }

    // 3️⃣ 解析最终使用的模型 provider
    const resolvedProvider = resolveProvider(provider);
    // 根据前端传入的 provider，再结合你服务器上实际配置了哪些 API Key，
    // 解析出一个“最终真正可用”的 provider
    // 比如：
    // - 前端传 openai，且 OPENAI_API_KEY 存在 → 返回 openai
    // - 前端没传，默认选第一个可用 provider
    // - 都不可用 → 返回 null / undefined

    if (!resolvedProvider) {
      // 如果没有可用的 provider，说明你的后端没有配置任何 AI 服务密钥
      return Response.json(
        {
          ok: false,
          message:
            "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
          // 给前端一个明确报错，提示你去检查环境变量
        },
        { status: 500 }, // 服务端配置问题，所以这里返回 500
      );
    }

    // 4️⃣ 校验 conversationId 合法性
    if (!ObjectId.isValid(conversationId)) {
      // MongoDB 的 _id 通常是 ObjectId 类型
      // 如果前端传来的 conversationId 根本不是一个合法 ObjectId 字符串，
      // 那么后面 new ObjectId(conversationId) 可能报错，或者查询没有意义
      return Response.json(
        { ok: false, message: "对话 id 无效" },
        { status: 400 }, // 参数错误，所以返回 400
      );
    }

    const trimmedContent = content.trim();
    // 去掉消息前后空格
    // 比如用户输入 "   你好   "，最后变成 "你好"
    // 这样可以防止只输入空格也被当成合法消息

    // 5️⃣ 校验消息不能为空
    if (!trimmedContent) {
      // trim 后如果是空字符串，说明用户没有真正输入内容
      return Response.json(
        { ok: false, message: "消息内容不能为空" },
        { status: 400 },
      );
    }

    // 6️⃣ 查询当前对话（必须属于当前用户）
    const collection = await getChatConversationsCollection();
    // 获取聊天会话集合，比如 chat_conversations

    const conversation = await collection.findOne({
      _id: new ObjectId(conversationId), // 查询指定的会话 id
      userId: new ObjectId(sessionResult.userId), // 同时要求这个会话必须属于当前登录用户
    });
    // 这里非常重要：
    // 不只是查 _id，还要查 userId
    // 这样可以防止用户拿别人的 conversationId 来访问别人的聊天记录

    if (!conversation) {
      // 如果没找到，可能有两种情况：
      // 1. 这个 conversationId 不存在
      // 2. 这个会话存在，但不属于当前用户
      return Response.json(
        { ok: false, message: "对话不存在" },
        { status: 404 },
      );
    }

    const now = new Date();
    // 记录当前时间
    // 后面创建用户消息、保存数据库时会用到

    // 7️⃣ 构造用户消息
    const userMessage = createChatMessage("user", trimmedContent, now);
    // 把用户刚发来的内容封装成一条标准消息对象
    // 例如可能变成：
    // {
    //   role: "user",
    //   content: "你好",
    //   createdAt: now
    // }

    // 8️⃣ 拼接完整 messages（system + 历史 + 当前输入）
    const fullMessages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT }, // 第 1 条一定是 system，用来给 AI 注入身份、规则、工具使用说明
      ...conversation.messages.map((message) => ({
        role: message.role, // 把数据库中历史消息的角色取出来，例如 user / assistant / tool
        content: message.content, // 把历史消息内容取出来
      })), // 历史消息，作为上下文发给 AI，让 AI 知道前面聊过什么
      {
        role: "user",
        content: trimmedContent,
      }, // 最后一条是当前用户刚输入的新消息
    ];
    // fullMessages 就是“这一次真正发给模型的完整上下文”
    // 模型会根据：
    // 1. system 提示词
    // 2. 历史聊天记录
    // 3. 当前用户输入
    // 来生成回复

    // 9️⃣ 判断是否支持流式（Claude 暂不支持）
    const supportsStreaming =
      resolvedProvider === "openai" || resolvedProvider === "deepseek";
    // 判断当前 provider 是否支持流式输出
    // 流式输出的意思是：模型生成一点就返回一点，用户能看到“打字机效果”
    // 这里你的逻辑是：
    // - openai：支持
    // - deepseek：支持
    // - anthropic / claude：当前这套实现里暂不支持

    // ─────────────────────────────────────────────
    // 🚀 流式模式（Streaming）
    // ─────────────────────────────────────────────
    if (supportsStreaming) {
      // 如果当前 provider 支持流式，就走流式处理逻辑
      return executeStreamingChat({
        collection, // 聊天会话集合，后面可能要更新数据库
        conversation, // 当前会话文档，里面有历史消息等信息
        fullMessages, // 完整消息上下文，发给模型
        resolvedProvider, // 最终确定的 provider，例如 openai
        trimmedContent, // 当前用户输入的纯净文本
        userMessage, // 已经封装好的用户消息对象
        userId: sessionResult.userId, // 当前用户 id，后续保存数据库可能要用
      });
      // executeStreamingChat 内部大概率会：
      // 1. 调用流式模型接口
      // 2. 一边接收模型增量输出，一边返回给前端
      // 3. 最后把完整回答写入数据库
    }

    return executeNonStreamingChat({
      // 如果不支持流式，就走普通非流式逻辑
      collection, // 集合
      conversation, // 当前会话
      fullMessages, // 完整上下文
      resolvedProvider, // provider
      trimmedContent, // 当前输入
      userMessage, // 用户消息对象
      userId: sessionResult.userId, // 当前用户 id
    });
    // executeNonStreamingChat 内部大概率会：
    // 1. 一次性调用模型
    // 2. 等模型完整返回
    // 3. 把结果返回给前端
    // 4. 把用户消息和 AI 回复写进数据库
  } catch (error) {
    // 只要 try 里面有任何一步报错，都会进入这里
    // 例如：
    // - req.json() 解析失败
    // - 数据库连接错误
    // - AI 接口报错
    // - 代码里 new ObjectId() 出现异常
    console.error("Chat API Error:", error);
    // 在服务器控制台打印详细错误，方便开发时排查

    return Response.json(
      { ok: false, message: "服务异常，请稍后再试" },
      { status: 500 },
    );
    // 返回给前端一个通用 500 错误
    // 注意：这里不要把真正的 error 直接暴露给前端，避免泄漏服务端内部信息
  }
}
