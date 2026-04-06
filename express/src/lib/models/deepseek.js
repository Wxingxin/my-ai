const OpenAI = require("openai");

function getClient() {
  return new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseURL: "https://api.deepseek.com/v1",
  });
}

async function callDeepSeek(messages, tools) {
  const response = await getClient().chat.completions.create({
    model: "deepseek-chat",
    messages,
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? "auto" : undefined,
  });

  const message = response.choices[0].message;
  const toolCalls =
    message.tool_calls
      ?.filter((toolCall) => toolCall.type === "function")
      .map((toolCall) => ({
        id: toolCall.id,
        type: "function",
        function: {
          name: toolCall.function.name,
          arguments: toolCall.function.arguments,
        },
      })) ?? [];

  return {
    content: message.content ?? "",
    tool_calls: toolCalls.length > 0 ? toolCalls : null,
  };
}

module.exports = {
  callDeepSeek,
};
