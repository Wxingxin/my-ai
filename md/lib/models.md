这个文件是**多模型调用的统一入口层**，经典的策略模式（Strategy Pattern）实现，让上层业务代码完全不需要感知底层用的是哪个模型。

---

**整体定位**

```
业务代码（API Route / Service）
        ↓
  callModel() / streamModel()     ← 你现在看的这个文件
        ↓
callOpenAI / callClaude / callDeepSeek / streamOpenAI / streamDeepSeek
        ↓
   各厂商 API（OpenAI / Anthropic / DeepSeek）
```

上层只需要传 `messages` 和 `provider`，底层换模型完全透明。

---

**`callModel()` — 非流式统一入口**

接收统一格式的 `messages` 和可选的 `tools`，按 `provider` 分发到对应实现。返回类型是统一的 `ModelResponse`，意味着三个模型的返回格式都已在各自的实现里做了归一化处理，业务层拿到的数据结构始终一致。

`tools` 只在非流式接口里有，因为 Function Calling 需要等待完整响应来解析工具调用，流式场景处理起来更复杂，当前设计里直接在流式入口省略了这个参数。

---

**`streamModel()` — 流式统一入口**

返回 `AsyncGenerator<StreamDelta>`，调用方可以用 `for await` 逐块消费输出：

```typescript
const stream = await streamModel(messages, "openai");
for await (const delta of stream) {
  // 每次拿到一小段文字，实时推给前端
}
```

Claude 流式输出标注了"暂未接入"并抛错，而不是静默返回空，这样调用方能立刻发现问题，而不是困惑"为什么没有输出"。

---

**`default` 分支的 `never` 类型检查**

```typescript
const unsupportedProvider: never = provider;
```

这是 TypeScript 的**穷尽性检查**技巧。`never` 类型意味着"这里永远不应该被执行到"。实际效果是：如果将来 `ModelProvider` 新增了一个值（比如 `"gemini"`），但两个 `switch` 里忘记加对应的 `case`，TypeScript 编译时就会直接报错，而不是等到运行时才发现问题。这是多分支 switch 的最佳实践写法。

---

**设计价值总结**

| 关注点     | 做法                                 |
| ---------- | ------------------------------------ |
| 业务层解耦 | 上层只调 `callModel`，不感知具体模型 |
| 类型安全   | `never` 检查确保 provider 分支不遗漏 |
| 扩展性     | 新增模型只需加一个 `case` + 对应实现 |
| 错误可见   | 未实现功能抛错而非静默降级           |
