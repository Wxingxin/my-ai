// 工具调用的数据结构（对应 LLM function calling）
export type ToolCall = {
  id: string; // 本次工具调用的唯一标识（用于后续 tool 响应关联）
  type: "function"; // 固定为 function，表示这是函数调用类型
  function: {
    name: string; // 要调用的函数名（例如：get_weather）
    arguments: string; // 函数参数（JSON 字符串格式，需要 JSON.parse 才能用）
  };
};

// 聊天消息类型（统一描述 user / assistant / tool 三种角色）
export type Message =
  | {
      role: "user" | "assistant" | "system"; // 普通消息角色
      content: string; // 消息内容（自然语言文本）
      tool_calls?: ToolCall[]; // assistant 可返回工具调用（可选）
    }
  | {
      role: "tool"; // 工具返回的消息
      content: string; // 工具执行结果（通常是 JSON 字符串）
      tool_call_id: string; // 对应哪一个 tool_call（用于链路闭环）
    };

// 模型返回的结构（统一封装 OpenAI / Claude / DeepSeek）
export type ModelResponse = {
  content: string; // 模型回复的文本内容（如果有工具调用，可能为空或部分内容）
  tool_calls: ToolCall[] | null; // 模型是否触发工具调用（没有则为 null）
};

// 模型提供商枚举（用于切换不同 LLM）
export type ModelProvider = "openai" | "claude" | "deepseek";
// openai → GPT 系列
// claude → Anthropic Claude
// deepseek → DeepSeek 模型

// 流式输出的增量数据（streaming 场景用）
export type StreamDelta = {
  content: string; // 每次流式返回的一小段文本（拼接后得到完整回复）
};
