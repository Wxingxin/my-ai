const { ObjectId } = require("mongodb");

function trimTitle(value) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return "新的对话";
  }

  return normalized.slice(0, 18);
}

function createConversationTitleFromMessage(content) {
  return trimTitle(content);
}

function toChatConversationDto(conversation) {
  if (!conversation?._id) {
    throw new Error("Conversation _id is missing");
  }

  return {
    id: conversation._id.toString(),
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messages: conversation.messages.map((message) => ({
      id: message._id?.toString() ?? "",
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
  };
}

function createChatMessage(role, content, createdAt = new Date()) {
  return {
    _id: new ObjectId(),
    role,
    content,
    createdAt,
  };
}

module.exports = {
  createChatMessage,
  createConversationTitleFromMessage,
  toChatConversationDto,
};
