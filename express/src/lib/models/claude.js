const Anthropic = require("@anthropic-ai/sdk");

function getClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function convertTools(tools) {
  return tools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    input_schema: tool.function.parameters,
  }));
}

async function callClaude(messages, tools) {
  const systemMessage = messages.find((message) => message.role === "system");
  const chatMessages = messages.filter((message) => message.role !== "system");

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system: systemMessage?.content,
    messages: chatMessages,
    tools: tools?.length ? convertTools(tools) : undefined,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  const toolBlock = response.content.find((block) => block.type === "tool_use");

  if (toolBlock?.type === "tool_use") {
    return {
      content: "",
      tool_calls: [
        {
          id: toolBlock.id,
          type: "function",
          function: {
            name: toolBlock.name,
            arguments: JSON.stringify(toolBlock.input),
          },
        },
      ],
    };
  }

  return {
    content: textBlock?.type === "text" ? textBlock.text : "",
    tool_calls: null,
  };
}

module.exports = {
  callClaude,
};
