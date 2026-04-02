// lib/models/openai.ts
import OpenAI from "openai"; // 引入 OpenAI 官方 SDK
import {
  Message,
  ModelResponse,
  StreamDelta,
  ToolCall,
} from "@/lib/models/types/ai"; // 引入项目中定义的消息、返回值、流式类型、工具调用类型

// 创建 OpenAI 客户端实例
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 从环境变量读取 OpenAI API Key
});

// 普通对话调用：一次性拿到完整结果
export async function callOpenAI(
  messages: Message[], // 传给模型的消息数组
  tools?: any[], // 可选的工具定义列表（function calling）
): Promise<ModelResponse> {
  const response = await client.chat.completions.create({
    model: "gpt-4o", // 使用的模型名称
    messages, // 对话上下文
    tools: tools?.length ? tools : undefined, // 如果有工具就传给模型，没有就不传
    tool_choice: tools?.length ? "auto" : undefined, // 有工具时让模型自动决定是否调用
  });

  const message = response.choices[0].message; // 取模型返回的第一条结果

  // 把 OpenAI 返回的 tool_calls 转成项目内部统一的 ToolCall 格式
  const toolCalls: ToolCall[] =
    message.tool_calls
      ?.filter((toolCall) => toolCall.type === "function") // 只保留 function 类型的工具调用
      .map((toolCall) => ({
        id: toolCall.id, // 工具调用 id
        type: "function", // 固定 function
        function: {
          name: toolCall.function.name, // 工具名
          arguments: toolCall.function.arguments, // 工具参数（JSON 字符串）
        },
      })) ?? []; // 如果没有 tool_calls，就返回空数组

  return {
    content: message.content ?? "", // 模型回复文本；如果为空就给空字符串
    tool_calls: toolCalls.length > 0 ? toolCalls : null, // 有工具调用就返回数组，否则返回 null
  };
}

// 流式对话调用：一边生成一边返回内容
export async function streamOpenAI(
  messages: Message[], // 对话上下文
  tools?: any[], // 可选的工具定义列表（function calling）
): Promise<AsyncGenerator<StreamDelta>> {
  const stream = await client.chat.completions.create({
    model: "gpt-4o", // 使用的模型名称
    messages, // 传入消息列表
    stream: true, // 开启流式输出
    tools: tools?.length ? tools : undefined, // ✅ 传入工具定义
    tool_choice: tools?.length ? "auto" : undefined, // ✅ 有工具时让模型自动决定是否调用
  });

  // 定义一个异步生成器，用于逐段返回模型生成的文本
  async function* iterator() {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content; // 取本次增量内容

      if (delta) {
        yield { content: delta }; // 每次产出一小段文本
      }
    }
  }

  return iterator(); // 返回异步生成器，调用方可以 for await ... of 消费
}
