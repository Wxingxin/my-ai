const {
  createChatMessage,
  createConversationTitleFromMessage,
  toChatConversationDto,
} = require("../lib/chat");
const { callModel } = require("../lib/models");
const { allTools, executeTool } = require("../lib/tools");

const MAX_TOOL_ROUNDS = 6;

async function persistAssistantReply({
  collection,
  conversation,
  userMessage,
  assistantContent,
  trimmedContent,
}) {
  const assistantMessage = createChatMessage("assistant", assistantContent, new Date());
  const nextTitle =
    conversation.messages.length <= 1
      ? createConversationTitleFromMessage(trimmedContent)
      : conversation.title;

  const updatedConversation = {
    ...conversation,
    title: nextTitle,
    updatedAt: assistantMessage.createdAt,
    messages: [...conversation.messages, userMessage, assistantMessage],
  };

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

  return updatedConversation;
}

async function executeChat({
  collection,
  conversation,
  fullMessages,
  resolvedProvider,
  trimmedContent,
  userMessage,
  userId,
}) {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await callModel(fullMessages, allTools, resolvedProvider);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      const updatedConversation = await persistAssistantReply({
        collection,
        conversation,
        userMessage,
        assistantContent: response.content ?? "",
        trimmedContent,
      });

      return {
        ok: true,
        conversation: toChatConversationDto(updatedConversation),
      };
    }

    fullMessages.push({
      role: "assistant",
      content: response.content ?? "",
      tool_calls: response.tool_calls,
    });

    for (const toolCall of response.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await executeTool(toolCall.function.name, args, { userId });

      fullMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  return {
    ok: false,
    message: "工具调用次数过多，请稍后重试",
  };
}

module.exports = {
  executeChat,
};
