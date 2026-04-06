const express = require("express");
const { ObjectId } = require("mongodb");

const { createChatMessage, toChatConversationDto } = require("../lib/chat");
const { getChatConversationsCollection } = require("../lib/linkcollection");
const { resolveProvider } = require("../lib/models/provider");
const { SYSTEM_PROMPT } = require("../lib/prompts/system");
const { validateSession } = require("../lib/validateSession");
const { executeChat } = require("./chat-service");

const chatRouter = express.Router();

chatRouter.get("/conversations", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const collection = await getChatConversationsCollection();
    const conversations = await collection
      .find({ userId: new ObjectId(sessionResult.userId) })
      .sort({ updatedAt: -1 })
      .toArray();

    return res.json({
      ok: true,
      conversations: conversations.map(toChatConversationDto),
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/conversations", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const collection = await getChatConversationsCollection();
    const now = new Date();
    const conversation = {
      userId: new ObjectId(sessionResult.userId),
      title: "新的对话",
      createdAt: now,
      updatedAt: now,
      messages: [
        createChatMessage(
          "assistant",
          "我是 Aria。你可以直接提问，我可以帮你整理思路、生成内容、拆解任务和润色文本。",
          now,
        ),
      ],
    };

    const insertResult = await collection.insertOne(conversation);

    return res.json({
      ok: true,
      conversation: toChatConversationDto({
        _id: insertResult.insertedId,
        ...conversation,
      }),
    });
  } catch (error) {
    next(error);
  }
});

chatRouter.delete("/conversations/:id", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: "对话 id 无效" });
    }

    const collection = await getChatConversationsCollection();
    const deleteResult = await collection.deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(sessionResult.userId),
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ ok: false, message: "对话不存在" });
    }

    return res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

chatRouter.post("/", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const { conversationId, content, provider } = req.body;
    const resolvedProvider = resolveProvider(provider);

    if (!resolvedProvider) {
      return res.status(500).json({
        ok: false,
        message: "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
      });
    }

    if (!ObjectId.isValid(conversationId)) {
      return res.status(400).json({ ok: false, message: "对话 id 无效" });
    }

    const trimmedContent = String(content ?? "").trim();

    if (!trimmedContent) {
      return res.status(400).json({ ok: false, message: "消息内容不能为空" });
    }

    const collection = await getChatConversationsCollection();
    const conversation = await collection.findOne({
      _id: new ObjectId(conversationId),
      userId: new ObjectId(sessionResult.userId),
    });

    if (!conversation) {
      return res.status(404).json({ ok: false, message: "对话不存在" });
    }

    const userMessage = createChatMessage("user", trimmedContent, new Date());
    const fullMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversation.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      { role: "user", content: trimmedContent },
    ];

    const result = await executeChat({
      collection,
      conversation,
      fullMessages,
      resolvedProvider,
      trimmedContent,
      userMessage,
      userId: sessionResult.userId,
    });

    if (!result.ok) {
      return res.status(500).json(result);
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = {
  chatRouter,
};
