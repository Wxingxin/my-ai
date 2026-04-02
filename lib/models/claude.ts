import Anthropic from "@anthropic-ai/sdk"; // 引入 Anthropic 官方 SDK（用于调用 Claude）
import { Message, ModelResponse, ToolCall } from "@/lib/models/types/ai"; // 引入项目里统一定义的消息、模型返回值、工具调用类型

// 创建 Claude 客户端实例
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // 从环境变量中读取 Claude 的 API Key
});

// Claude 的工具格式和 OpenAI 不一样，所以这里做一次转换
function convertTools(tools: any[]) {
  return tools.map((t) => ({
    name: t.function.name, // 工具名
    description: t.function.description, // 工具描述
    input_schema: t.function.parameters, // 工具参数 schema（Claude 用 input_schema）
  }));
}

// 调用 Claude 模型
export async function callClaude(
  messages: Message[], // 统一格式的消息数组
  tools?: any[], // 可选：工具列表
): Promise<ModelResponse> {
  // Claude 的 system 消息不能混在 messages 里，要单独传
  const systemMsg = messages.find((m) => m.role === "system"); // 找到 system 消息
  const chatMessages = messages.filter((m) => m.role !== "system"); // 过滤掉 system，只保留正常对话消息

  const response = await client.messages.create({
    model: "claude-sonnet-4-5", // 使用的 Claude 模型
    max_tokens: 4096, // 最大输出 token 数
    system: systemMsg?.content, // 单独传 system prompt
    messages: chatMessages as any, // 这里直接断言 any，因为 Claude 的消息格式与项目 Message 类型不完全一致
    tools: tools?.length ? convertTools(tools) : undefined, // 如果有工具，先转换成 Claude 需要的格式
  });

  // Claude 返回的 content 是一个数组，里面可能有 text，也可能有 tool_use
  const textBlock = response.content.find((b) => b.type === "text"); // 找文本块
  const toolBlock = response.content.find((b) => b.type === "tool_use"); // 找工具调用块

  // 如果模型决定调用工具
  if (toolBlock && toolBlock.type === "tool_use") {
    const toolCalls: ToolCall[] = [
      {
        id: toolBlock.id, // 工具调用 id
        type: "function", // 统一成 function 类型
        function: {
          name: toolBlock.name, // 工具名
          arguments: JSON.stringify(toolBlock.input), // Claude 返回的是对象，这里转成 JSON 字符串，和 OpenAI 保持一致
        },
      },
    ];

    return {
      content: "", // 调用工具时通常不返回最终文本内容
      tool_calls: toolCalls, // 返回统一格式的工具调用数组
    };
  }

  // 如果没有调用工具，就返回文本内容
  return {
    content: textBlock?.type === "text" ? textBlock.text : "", // 如果找到文本块就返回文本，否则返回空字符串
    tool_calls: null, // 没有工具调用
  };
}
