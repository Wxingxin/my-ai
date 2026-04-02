// lib/models/index.ts
import { callClaude } from "./claude"; // Claude（Anthropic）模型调用函数
import { callDeepSeek, streamDeepSeek } from "./deepseek"; // DeepSeek 的普通调用 & 流式调用
import { callOpenAI, streamOpenAI } from "./openai"; // OpenAI 的普通调用 & 流式调用
import {
  Message,
  ModelProvider,
  ModelResponse,
  StreamDelta,
} from "@/lib/models/types/ai"; // 引入统一的类型定义

// ─────────────────────────────────────────────────────────────
// 非流式统一入口（Strategy 分发层）
// ─────────────────────────────────────────────────────────────
export async function callModel(
  messages: Message[], // 对话消息
  tools?: any[], // 可选工具定义（function calling）
  provider: ModelProvider = "openai", // 默认使用 openai
): Promise<ModelResponse> {
  switch (provider) {
    case "openai":
      return callOpenAI(messages, tools); // 调用 OpenAI 实现

    case "claude":
      return callClaude(messages, tools); // 调用 Claude 实现（内部已做格式适配）

    case "deepseek":
      return callDeepSeek(messages, tools); // 调用 DeepSeek（OpenAI-compatible）

    default: {
      // TypeScript 穷尽检查（确保 provider 类型完整覆盖）
      const unsupportedProvider: never = provider;
      throw new Error(`Unsupported model provider: ${unsupportedProvider}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 流式统一入口（Streaming 分发层）
// ─────────────────────────────────────────────────────────────
export async function streamModel(
  messages: Message[],
  provider: ModelProvider,
  tools?: any[], // ✅ 新增
): Promise<AsyncGenerator<StreamDelta>> {
  switch (provider) {
    case "openai":
      return streamOpenAI(messages, tools); // ✅ 传入

    case "deepseek":
      return streamDeepSeek(messages, tools); // ✅ 传入

    case "claude":
      throw new Error("Claude 流式输出暂未接入");

    default: {
      const unsupportedProvider: never = provider;
      throw new Error(`Unsupported model provider: ${unsupportedProvider}`);
    }
  }
}
