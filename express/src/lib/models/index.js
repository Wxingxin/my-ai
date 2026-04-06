const { callClaude } = require("./claude");
const { callDeepSeek } = require("./deepseek");
const { callOpenAI } = require("./openai");

async function callModel(messages, tools, provider = "openai") {
  switch (provider) {
    case "openai":
      return callOpenAI(messages, tools);
    case "deepseek":
      return callDeepSeek(messages, tools);
    case "claude":
      return callClaude(messages, tools);
    default:
      throw new Error(`Unsupported model provider: ${provider}`);
  }
}

module.exports = {
  callModel,
};
