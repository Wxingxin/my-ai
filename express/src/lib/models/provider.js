function hasUsableKey(value) {
  if (!value) {
    return false;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return !["sk-xxx", "sk-ant-xxx", "your-api-key", "test", "placeholder"].includes(
    trimmed.toLowerCase(),
  );
}

function isProviderConfigured(provider) {
  switch (provider) {
    case "openai":
      return hasUsableKey(process.env.OPENAI_API_KEY);
    case "claude":
      return hasUsableKey(process.env.ANTHROPIC_API_KEY);
    case "deepseek":
      return hasUsableKey(process.env.DEEPSEEK_API_KEY);
    default:
      return false;
  }
}

function getDefaultProvider() {
  const candidates = ["openai", "deepseek", "claude"];

  for (const provider of candidates) {
    if (isProviderConfigured(provider)) {
      return provider;
    }
  }

  return null;
}

function resolveProvider(provider) {
  if (provider === "openai" || provider === "claude" || provider === "deepseek") {
    return isProviderConfigured(provider) ? provider : null;
  }

  return getDefaultProvider();
}

module.exports = {
  resolveProvider,
};
