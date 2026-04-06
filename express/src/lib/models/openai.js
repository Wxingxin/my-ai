const OpenAI = require("openai");

function getClient() {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

async function callOpenAI(messages, tools) {
  const response = await getClient().chat.completions.create({
    model: "gpt-4o",
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
  callOpenAI,
};
