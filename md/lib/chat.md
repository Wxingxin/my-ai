这个文件是一个**数据转换与工厂函数**的工具模块，主要负责在数据库层和前端层之间做数据处理。下面逐一介绍每个函数的作用：

---

**`trimTitle(value: string)`** — 私有辅助函数

对字符串做标准化处理后作为标题使用：去除首尾空格、压缩连续空格为单个空格，若结果为空则返回默认值 `"新的对话"`，最终截取前 18 个字符。这个函数没有 `export`，只在模块内部使用。

---

**`createConversationTitleFromMessage(content: string)`** — 标题生成器

接收用户发送的第一条消息内容，复用 `trimTitle` 生成对话的标题。通常用于新建会话时，自动从首条消息提取标题，而不需要用户手动命名。

---

**`toChatConversationDto(conversation: ChatConversationDocument)`** — 数据库文档 → 前端 DTO 转换器

这是文件里最核心的函数。它把从 MongoDB 查出来的原始文档转换成可以安全传给前端的纯对象（DTO，Data Transfer Object），主要做了三件事：

- `ObjectId` → `string`：MongoDB 的 `_id` 不能直接 JSON 序列化，必须调用 `.toString()`
- `Date` → ISO 字符串：`createdAt` / `updatedAt` 转为 `.toISOString()`，确保 JSON 传输格式统一
- 铺平 messages 数组：对每条消息做同样的 id 和时间格式转换

如果 `_id` 不存在会直接抛错，属于防御式编程，避免脏数据静默流入前端。

---

**`createChatMessage(role, content, createdAt?)`** — 消息工厂函数

创建一条符合 `ChatMessageDocument` 类型的消息对象，自动生成 `new ObjectId()` 作为唯一 `_id`，`createdAt` 默认取当前时间。使用时只需传入角色和内容即可，通常在用户发送消息或 AI 回复后调用，然后再写入数据库。

---

**整体定位小结：**

| 函数                                 | 职责层               |
| ------------------------------------ | -------------------- |
| `trimTitle`                          | 纯字符串处理         |
| `createConversationTitleFromMessage` | 业务逻辑（标题提取） |
| `toChatConversationDto`              | 数据层 → 传输层      |
| `createChatMessage`                  | 数据层（对象创建）   |

这种把"数据库格式"和"前端格式"严格分离的做法，是 Next.js 全栈项目的常见最佳实践，能有效避免 `ObjectId`、`Date` 等不可序列化对象直接泄露到客户端。
