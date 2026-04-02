// lib/tools/index.ts
import { weatherToolDefinition, getWeather } from "./weather"; // 天气工具：定义 + 执行函数
import { todoToolDefinitions, executeTodoTool } from "./todos"; // Todo 工具：多个定义 + 执行函数
import { newsToolDefinition, getNews } from "./news"; // 新闻工具：定义 + 执行函数

type ToolContext = {
  userId?: string;
};

// 所有工具定义，传给大模型
export const allTools = [
  weatherToolDefinition, // 天气工具（AI 可调用）
  ...todoToolDefinitions, // 展开多个 todo 工具（如 add / list / complete）
  newsToolDefinition, // 新闻工具
];

// 执行工具调用
export async function executeTool(name: string, args: any, context?: ToolContext) {
  if (name === "get_weather") return getWeather(args.city);
  // 如果是天气工具 → 调用 getWeather，传入城市

  if (name === "get_news") return getNews(args?.keyword);
  // 如果是新闻工具 → 调用 getNews，关键词可选（用 ?. 防止 undefined 报错）

  if (["get_todos", "add_todo", "complete_todo"].includes(name))
    return executeTodoTool(name, { ...args, userId: context?.userId });
  // 如果是 todo 工具 → 统一交给 executeTodoTool 处理（内部再分发）

  throw new Error(`未知工具: ${name}`);
  // 如果工具不存在 → 抛错（防御机制）
}
