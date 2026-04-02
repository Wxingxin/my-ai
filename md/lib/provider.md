这个文件是**模型提供商的配置检测与解析模块**，解决"当前环境到底能用哪个模型"这个问题。

---

**`hasUsableKey(value)`** — 私有的 Key 有效性检测

不只是判断非空，还过滤了一批开发者复制模板时常见的占位符（`sk-xxx`、`your-api-key` 等）。用 `.toLowerCase()` 做忽略大小写比较，避免 `SK-XXX` 这种大写变体漏网。这个函数没有 `export`，只作为内部工具使用。

---

**`isProviderConfigured(provider)`** — 单个 Provider 可用性检查

从环境变量读取对应的 API Key，交给 `hasUsableKey` 判断。三个 provider 对应三个不同的环境变量名，这是实际部署时最常见的配置方式。

---

**`getDefaultProvider()`** — 自动选择默认 Provider

按 `openai → deepseek → claude` 的优先级，返回第一个配置了有效 Key 的 provider。全部未配置则返回 `null`。优先级设计反映了一种工程判断：OpenAI 兼容性最广、DeepSeek 性价比高，Claude 作为备选。

---

**`resolveProvider(provider?)`** — 对外的统一解析入口

处理两种情况：

```
用户传了 provider
  ├── Key 已配置 → 返回该 provider
  └── Key 未配置 → 返回 null（不能用没配置的模型）

用户没传 provider / 传了非法值
  └── 走 getDefaultProvider() 自动降级
```

返回 `null` 而不是抛错，让调用方自己决定如何处理"没有可用模型"的情况，职责边界更清晰。

---

**三个函数的协作关系：**

```
resolveProvider("openai")
    └── isProviderConfigured("openai")
            └── hasUsableKey(process.env.OPENAI_API_KEY)

resolveProvider(undefined)
    └── getDefaultProvider()
            └── isProviderConfigured("openai") → false
            └── isProviderConfigured("deepseek") → true ✓ 返回 "deepseek"
```

---

**整体价值**

这个模块让整个系统具备了**零配置降级能力**，部署时只需要设置好环境变量，代码会自动探测可用的模型，不需要在业务逻辑里写任何 `if (OPENAI_KEY) else if (DEEPSEEK_KEY)` 这类判断。
