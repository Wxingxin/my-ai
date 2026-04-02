import OpenAI from "openai";
import {
  Message,
  ModelResponse,
  StreamDelta,
  ToolCall,
} from "@/lib/models/types/ai";

// 创建 OpenAI 客户端（这里其实是 DeepSeek 的兼容接口）
// 👉 DeepSeek 复用了 OpenAI SDK，只是换了 baseURL
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY, // DeepSeek API Key
  baseURL: "https://api.deepseek.com/v1", // 指向 DeepSeek 服务
});

/**
 * 👉 流式调用 DeepSeek
 *
 * 返回：
 * - AsyncGenerator（异步生成器）
 * - 每次 yield 一小段文本（delta）
 *
 * 👉 用于实现 ChatGPT 那种“打字效果”
 */
export async function streamDeepSeek(
  messages: Message[],
  tools?: any[],
): Promise<AsyncGenerator<StreamDelta>> {
  // 开启 stream 模式
  const stream = await client.chat.completions.create({
    model: "deepseek-chat",
    messages,
    stream: true, // 👉 关键：开启流式返回
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? "auto" : undefined,
  });

  /**
   * 👉 定义一个异步生成器
   *
   * for await...of 用来逐块读取流
   */
  async function* iterator() {
    for await (const chunk of stream) {
      // DeepSeek / OpenAI 流式返回结构：
      // chunk.choices[0].delta.content
      const delta = chunk.choices[0]?.delta?.content;

      // 如果这一块有内容，就返回给调用方
      if (delta) {
        yield { content: delta };
      }
    }
  }

  // 返回生成器（调用方可以 for await 逐步消费）
  return iterator();
}


/**
 * 👉 非流式调用 DeepSeek
 *
 * 输入：
 * - messages：完整对话上下文
 * - tools：可选工具定义（function calling）
 *
 * 输出：
 * - content：模型生成的文本
 * - tool_calls：模型请求调用的工具（如果有）
 */
export async function callDeepSeek(
  messages: Message[],
  tools?: any[],
): Promise<ModelResponse> {
  // 打印调试：工具数量
  // console.log("[callDeepSeek] tools count:", tools?.length ?? 0);

  // 打印调试：最后一条消息（通常是用户输入）
  // console.log("[callDeepSeek] last message:", JSON.stringify(messages.at(-1)));

  // 调用 DeepSeek（兼容 OpenAI Chat API）
  const response = await client.chat.completions.create({
    model: "deepseek-chat", // 使用 DeepSeek Chat 模型
    messages, // 对话上下文
    tools: tools?.length ? tools : undefined, // 如果有工具才传
    tool_choice: tools?.length ? "auto" : undefined,
    // 👉 auto 表示让模型自行决定是否调用工具
  });

  // 打印模型返回的 tool_calls（原始数据）
  // console.log(
  //   "[callDeepSeek] raw tool_calls:",
  //   JSON.stringify(response.choices[0].message.tool_calls),
  // );

  // 打印模型返回的文本内容（截取前 80 字符）
  // console.log(
  //   "[callDeepSeek] content:",
  //   response.choices[0].message.content?.slice(0, 80),
  // );

  // 取出模型返回的 message
  const message = response.choices[0].message;

  /**
   * 👉 标准化 tool_calls
   *
   * DeepSeek 返回的 tool_calls 格式需要转换成你项目统一的 ToolCall 结构
   */
  const toolCalls: ToolCall[] =
    message.tool_calls
      ?.filter((toolCall) => toolCall.type === "function") // 只保留 function 类型
      .map((toolCall) => ({
        id: toolCall.id, // 工具调用 ID（用于后续 tool 消息关联）
        type: "function",
        function: {
          name: toolCall.function.name, // 工具名（例如 get_weather）
          arguments: toolCall.function.arguments, // 参数（JSON 字符串）
        },
      })) ?? []; // 如果没有 tool_calls，返回空数组

  // 返回统一格式（给上层 executeChat 使用）
  return {
    content: message.content ?? "", // 模型生成的文本
    tool_calls: toolCalls.length > 0 ? toolCalls : null,
    // 如果没有工具调用，返回 null（方便上层判断）
  };
}
