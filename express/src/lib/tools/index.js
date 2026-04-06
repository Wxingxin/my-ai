const { getNews, newsToolDefinition } = require("./news");
const { executeTodoTool, todoToolDefinitions } = require("./todos");
const { getWeather, weatherToolDefinition } = require("./weather");

const allTools = [
  weatherToolDefinition,
  ...todoToolDefinitions,
  newsToolDefinition,
];

async function executeTool(name, args, context = {}) {
  if (name === "get_weather") {
    return getWeather(args.city);
  }

  if (name === "get_news") {
    return getNews(args?.keyword);
  }

  if (["get_todos", "add_todo", "complete_todo"].includes(name)) {
    return executeTodoTool(name, { ...args, userId: context.userId });
  }

  throw new Error(`未知工具: ${name}`);
}

module.exports = {
  allTools,
  executeTool,
};
