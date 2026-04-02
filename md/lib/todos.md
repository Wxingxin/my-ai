这个文件是 **Todo 功能的数据访问层（DAL）**，负责所有与数据库交互的 CRUD 操作，同时定义了数据传输的类型契约。

---

**类型定义**

三个类型各司其职：

- `TodoDto` — 给前端用的数据格式，所有 `ObjectId` 和 `Date` 都已转为 string
- `CreateTodoInput` — 创建时的入参，只需传必要字段，其余有默认值
- `UpdateTodoInput` — 更新时的入参，所有字段都是可选的，只更新传入的部分

---

**`toTodoDto(todo)`** — 数据库文档 → 前端 DTO

和上次聊到的 `toChatConversationDto` 是同一种模式，核心工作是类型安全地序列化：`ObjectId → string`、`Date → ISO string`、`undefined → null 或空字符串`。

---

**`listTodos(userId)`** — 查询列表

按 `userId` 过滤，确保用户只能看到自己的数据，并以 `createdAt` 倒序排列（最新的在前）。

---

**`createTodo(input)`** — 创建

几个细节值得注意：

- `status` 固定初始化为 `"todo"`，不允许创建时直接设为完成
- `priority` 和 `category` 有默认值兜底，前端不传也能正常写入
- 插入后把数据库返回的 `insertedId` 合并回 document 再转 DTO，避免多一次 `findOne` 查询

---

**`updateTodo(userId, todoId, input)`** — 更新

有两个安全设计：

1. `updateOne` 的 filter 同时带 `_id` 和 `userId`，防止 A 用户篡改 B 用户的数据（**越权防护**）
2. `status` 变为 `"done"` 时自动写入 `completedAt`，反之清空，状态与时间保持一致

更新完成后再执行一次 `findOne` 返回最新数据，保证前端拿到的是真实入库的结果。

---

**`deleteTodo(userId, todoId)`** — 删除

同样在 filter 里带 `userId`，和 `updateTodo` 一样做了越权防护。返回 `deletedCount > 0` 的布尔值，让调用方可以区分"删除成功"和"记录不存在"两种情况。

---

**整体结构总结：**

| 函数         | 操作   | 安全措施                 |
| ------------ | ------ | ------------------------ |
| `listTodos`  | Read   | userId 过滤              |
| `createTodo` | Create | 默认值兜底               |
| `updateTodo` | Update | userId + todoId 双重校验 |
| `deleteTodo` | Delete | userId + todoId 双重校验 |

所有写操作都把 `userId` 作为查询条件之一，这是多用户系统中数据隔离的标准做法。
