这个文件是整个工具系统的**统一入口（聚合层）**，把所有分散的工具模块收拢到一个地方管理。

---

**`allTools`** — 工具声明聚合

把三个模块的工具定义合并成一个数组，统一传给大模型。调用侧只需要：

```typescript
await openai.chat.completions.create({
  tools: allTools, // 不需要关心有哪些工具，直接传这一个
  ...
})
```

`...todoToolDefinitions` 用展开运算符是因为 Todo 有多个工具（`get_todos` / `add_todo` / `complete_todo`），而天气和新闻各自只有一个。

---

**`executeTool(name, args)`** — 工具执行路由器

本质是一个**调度器**，根据模型返回的工具名称，把执行请求分发到对应的函数。典型的使用场景是：

```typescript
// 模型返回了 tool_use，你的代码处理它
const toolResult = await executeTool(
  toolCall.function.name, // 如 "get_weather"
  JSON.parse(toolCall.function.arguments), // 如 { city: "北京" }
);
```

Todo 工具没有逐个 `if` 判断，而是用 `includes` 数组检查后统一交给 `executeTodoTool` 内部再分发，因为 Todo 的多个工具共享同一套上下文（用户身份、数据库集合等），放在一起处理更合适。

末尾的 `throw new Error` 是防御机制，防止模型幻觉出一个不存在的工具名导致静默失败。

---

**整体架构位置：**

```
大模型
  ↓ 返回 tool_use（工具名 + 参数）
executeTool()          ← 你现在看的这个文件
  ├── getWeather()
  ├── getNews()
  └── executeTodoTool()
  ↓ 返回结果
大模型生成最终回复
```

这种聚合层的价值在于：新增工具时只需改这一个文件，调用侧的代码完全不用动。
