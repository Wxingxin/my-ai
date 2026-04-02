这个文件是一个**天气工具模块**，专门为 AI Function Calling 设计，包含两个紧密配合的导出。

---

**`weatherToolDefinition`** — AI 工具声明对象

这是告诉 AI 模型"你有一个可以调用的工具"的描述对象，格式遵循 OpenAI / 兼容接口的 Function Calling 规范。它本身不执行任何逻辑，只是一份**元数据**，传给大模型后，模型会根据对话内容自行决定是否调用、以及传入什么参数。

调用链路大致如下：

```
用户说"北京今天天气怎么样"
    → 模型读取 weatherToolDefinition
    → 决定调用 get_weather，参数 { city: "北京" }
    → 你的代码捕获这个调用，执行 getWeather("北京")
    → 把结果返回给模型
    → 模型生成最终回复
```

---

**`getWeather(city: string)`** — 实际天气请求函数

真正去调 OpenWeatherMap API 拿数据的函数，当模型触发 tool call 后由你的后端代码手动执行。几个参数值得注意：

- `units=metric`：不加这个参数默认返回开尔文（约 300K），加上后才是摄氏度
- `lang=zh_cn`：让 `description` 字段直接返回中文，省去翻译
- `process.env.WEATHER_API_KEY`：API Key 从环境变量读取，避免硬编码泄露到代码仓库

返回值只提取了 4 个字段，把原始 API 响应中大量无关字段（风速、气压、坐标等）过滤掉，让传回给模型的 tool result 保持精简。

---

**两者的协作关系：**

| 对象 | 使用方 | 时机 |
|---|---|---|
| `weatherToolDefinition` | 传给大模型（放在 `tools` 参数里）| 发起对话请求时 |
| `getWeather` | 你的后端代码调用 | 模型返回 `tool_use` 响应时 |

一个负责"声明能力"，一个负责"执行能力"，这是 Function Calling 架构的标准分工。