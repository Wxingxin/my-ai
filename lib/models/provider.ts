import type { ModelProvider } from "@/lib/models/types/ai"; // 引入模型提供商类型（openai / claude / deepseek）

// 判断 API Key 是否“可用”（不是空值、占位符等）
function hasUsableKey(value: string | undefined) {
  if (!value) {
    return false; // 没传值（undefined / null / 空字符串）直接不可用
  }

  const trimmed = value.trim(); // 去掉前后空格

  if (!trimmed) {
    return false; // 全是空格也算不可用
  }

  // 过滤掉常见的“假 key / 占位 key”
  return ![
    "sk-xxx",
    "sk-ant-xxx",
    "your-api-key",
    "test",
    "placeholder",
  ].includes(trimmed.toLowerCase()); // 忽略大小写比较
}

// 判断某个 provider 是否已经正确配置（即存在有效 API Key）
export function isProviderConfigured(provider: ModelProvider) {
  switch (provider) {
    case "openai":
      return hasUsableKey(process.env.OPENAI_API_KEY); // 检查 OpenAI 的 key
    case "claude":
      return hasUsableKey(process.env.ANTHROPIC_API_KEY); // 检查 Claude 的 key
    case "deepseek":
      return hasUsableKey(process.env.DEEPSEEK_API_KEY); // 检查 DeepSeek 的 key
    default:
      return false; // 理论不会走到这里（类型已限制）
  }
}

// 获取“默认可用”的 provider（按优先级选择）
export function getDefaultProvider(): ModelProvider | null {
  const candidates: ModelProvider[] = ["openai", "deepseek", "claude"];
  // 优先级：OpenAI > DeepSeek > Claude

  for (const provider of candidates) {
    if (isProviderConfigured(provider)) {
      return provider; // 找到第一个可用的就返回
    }
  }

  return null; // 都没有配置
}

// 根据用户传入的 provider 字符串，解析出最终使用的 provider
export function resolveProvider(provider?: string): ModelProvider | null {
  // 如果用户明确指定了 provider（且在合法范围内）
  if (
    provider === "openai" ||
    provider === "claude" ||
    provider === "deepseek"
  ) {
    return isProviderConfigured(provider) ? provider : null;
    // 如果配置了 key → 返回该 provider
    // 如果没配置 → 返回 null（表示不可用）
  }

  // 如果没传 provider 或非法值 → 使用默认策略
  return getDefaultProvider();
}
