// lib/tools/todos.ts
import { ObjectId } from "mongodb"; // 引入 MongoDB 的 ObjectId，用于处理文档 id 和 userId

import {
  getTodosCollection, // 获取 todos 集合的方法
  type TodoCategory, // todo 分类类型
  type TodoPriority, // todo 优先级类型
  type TodoStatus, // todo 状态类型
  type TodosCollectionType, // todos 集合中单条文档的类型
} from "@/lib/linkcollection";

export const todoToolDefinitions = [
  // 提供给 AI 的 todo 工具定义数组
  {
    type: "function", // 表示这是一个函数工具
    function: {
      name: "get_todos", // 工具名：获取当前用户的 todos
      description: "获取当前用户的 todo 列表", // 工具说明
      parameters: {
        type: "object", // 参数是对象
        properties: {}, // 这个工具不需要额外参数
      },
    },
  },
  {
    type: "function", // 表示这是一个函数工具
    function: {
      name: "add_todo", // 工具名：新增 todo
      description: "创建一条 todo", // 工具说明
      parameters: {
        type: "object", // 参数是对象
        properties: {
          title: { type: "string", description: "todo 标题" }, // 标题，字符串
          description: { type: "string", description: "todo 描述" }, // 描述，字符串
          priority: {
            type: "string", // 优先级是字符串
            enum: ["low", "medium", "high"], // 只能是 low / medium / high
            description: "优先级", // 参数说明
          },
          category: {
            type: "string", // 分类是字符串
            enum: ["work", "study", "life", "health", "finance", "other"], // 分类可选值
            description: "分类", // 参数说明
          },
          dueDate: {
            type: "string", // 截止时间用字符串传递
            description: "截止时间 ISO 字符串，可选", // 参数说明
          },
        },
        required: ["title"], // 创建 todo 时 title 是必填的
      },
    },
  },
  {
    type: "function", // 表示这是一个函数工具
    function: {
      name: "complete_todo", // 工具名：完成指定 todo
      description: "将指定 todo 标记为完成", // 工具说明
      parameters: {
        type: "object", // 参数是对象
        properties: {
          id: { type: "string", description: "todo 的 id" }, // 要完成的 todo 的 id
        },
        required: ["id"], // id 必填
      },
    },
  },
] as const; // as const 让 TS 把内容尽量收窄成字面量类型

export type TodoDto = {
  id: string; // 给前端使用的 id，数据库里的 ObjectId 会被转成 string
  title: string; // todo 标题
  description: string; // todo 描述
  status: TodoStatus; // todo 状态
  priority: TodoPriority; // todo 优先级
  category: TodoCategory; // todo 分类
  dueDate: string | null; // 截止时间，返回 ISO 字符串或 null
  completedAt: string | null; // 完成时间，返回 ISO 字符串或 null
  createdAt: string; // 创建时间，ISO 字符串
  updatedAt: string; // 更新时间，ISO 字符串
};

export type CreateTodoInput = {
  userId: string; // 当前用户 id，传入时是字符串
  title: string; // 标题，必填
  description?: string; // 描述，可选
  priority?: TodoPriority; // 优先级，可选
  category?: TodoCategory; // 分类，可选
  dueDate?: string | null; // 截止时间，可选
};

export type UpdateTodoInput = {
  title?: string; // 更新标题，可选
  description?: string; // 更新描述，可选
  priority?: TodoPriority; // 更新优先级，可选
  category?: TodoCategory; // 更新分类，可选
  status?: TodoStatus; // 更新状态，可选
  dueDate?: string | null; // 更新截止时间，可选
};

export function toTodoDto(todo: TodosCollectionType): TodoDto {
  // 把数据库中的 todo 文档转换成前端可直接使用的 DTO
  if (!todo._id) {
    // 防御性校验，确保 _id 存在
    throw new Error("Todo _id is missing"); // 如果没有 _id，直接抛错
  }

  return {
    id: todo._id.toString(), // ObjectId 转成字符串
    title: todo.title, // 原样返回标题
    description: todo.description ?? "", // 如果 description 不存在，返回空字符串
    status: todo.status, // 原样返回状态
    priority: todo.priority, // 原样返回优先级
    category: todo.category, // 原样返回分类
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null, // 如果有截止时间，Date 转 ISO 字符串，否则返回 null
    completedAt: todo.completedAt ? todo.completedAt.toISOString() : null, // 如果有完成时间，Date 转 ISO 字符串，否则返回 null
    createdAt: todo.createdAt.toISOString(), // 创建时间转 ISO 字符串
    updatedAt: todo.updatedAt.toISOString(), // 更新时间转 ISO 字符串
  };
}

export async function listTodos(userId: string) {
  // 获取某个用户的 todo 列表
  const collection = await getTodosCollection(); // 拿到 todos 集合
  const todos = await collection
    .find({ userId: new ObjectId(userId) }) // 查询当前用户的所有 todo
    .sort({ createdAt: -1 }) // 按创建时间倒序排列，最新的排前面
    .toArray(); // 转成数组

  return todos.map(toTodoDto); // 把数据库文档数组转换成 DTO 数组返回
}

export async function createTodo(input: CreateTodoInput) {
  // 创建一条新的 todo
  const collection = await getTodosCollection(); // 拿到 todos 集合
  const now = new Date(); // 当前时间，后面创建时间和更新时间都用它

  const document: TodosCollectionType = {
    userId: new ObjectId(input.userId), // 把传入的 userId 字符串转成 ObjectId
    title: input.title.trim(), // 标题去掉首尾空格
    description: input.description?.trim() || "", // 描述可选，有值就 trim，没有就给空字符串
    status: "todo", // 新建默认状态是 todo
    priority: input.priority ?? "medium", // 默认优先级是 medium
    category: input.category ?? "other", // 默认分类是 other
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined, // 如果传了截止时间，转成 Date
    createdAt: now, // 创建时间
    updatedAt: now, // 更新时间
  };

  const result = await collection.insertOne(document); // 把文档插入数据库

  return toTodoDto({
    ...document, // 展开原始文档
    _id: result.insertedId, // 补上数据库生成的 _id
  }); // 转成 DTO 返回
}

export async function updateTodo(
  userId: string, // 当前用户 id
  todoId: string, // 要更新的 todo id
  input: UpdateTodoInput, // 更新内容
) {
  const collection = await getTodosCollection(); // 拿到 todos 集合
  const now = new Date(); // 当前时间

  const updatePayload: Partial<TodosCollectionType> = {
    updatedAt: now, // 不管更新什么，每次都要刷新 updatedAt
  };

  if (input.title !== undefined) {
    // 如果传了 title
    updatePayload.title = input.title.trim(); // 更新标题，并去除首尾空格
  }

  if (input.description !== undefined) {
    // 如果传了 description
    updatePayload.description = input.description.trim(); // 更新描述，并去除首尾空格
  }

  if (input.priority !== undefined) {
    // 如果传了 priority
    updatePayload.priority = input.priority; // 更新优先级
  }

  if (input.category !== undefined) {
    // 如果传了 category
    updatePayload.category = input.category; // 更新分类
  }

  if (input.dueDate !== undefined) {
    // 如果传了 dueDate，即使是 null 也表示要处理
    updatePayload.dueDate = input.dueDate ? new Date(input.dueDate) : undefined; // 有值就转 Date，没有值就设为 undefined
  }

  if (input.status !== undefined) {
    // 如果传了 status
    updatePayload.status = input.status; // 更新状态
    updatePayload.completedAt = input.status === "done" ? now : undefined; // 如果状态改为 done，则写入完成时间，否则清空完成时间
  }

  await collection.updateOne(
    {
      _id: new ObjectId(todoId), // 匹配要更新的 todo
      userId: new ObjectId(userId), // 同时限制必须属于当前用户，防止越权
    },
    {
      $set: updatePayload, // 使用 $set 更新字段
    },
  );

  const updated = await collection.findOne({
    _id: new ObjectId(todoId), // 再查一次更新后的 todo
    userId: new ObjectId(userId), // 同样限制必须属于当前用户
  });

  if (!updated) {
    // 如果没查到
    throw new Error("Todo not found"); // 抛出错误
  }

  return toTodoDto(updated); // 返回更新后的 DTO
}

export async function deleteTodo(userId: string, todoId: string) {
  // 删除指定用户的某条 todo
  const collection = await getTodosCollection(); // 拿到 todos 集合

  const result = await collection.deleteOne({
    _id: new ObjectId(todoId), // 删除指定 todo id
    userId: new ObjectId(userId), // 并且必须属于当前用户
  });

  return result.deletedCount > 0; // 如果删除数量大于 0，说明删除成功，返回 true，否则 false
}

export async function executeTodoTool(
  name: string, // AI 想调用的工具名
  args: {
    userId?: string; // 当前用户 id
    title?: string; // 新建 todo 的标题
    description?: string; // 新建 todo 的描述
    priority?: TodoPriority; // 新建 todo 的优先级
    category?: TodoCategory; // 新建 todo 的分类
    dueDate?: string | null; // 新建 todo 的截止时间
    id?: string; // complete_todo 需要的 todo id
  },
) {
  const userId = args.userId?.trim(); // 先取出 userId，并去掉首尾空格

  if (!userId) {
    // 如果没有 userId
    throw new Error("缺少当前用户信息，无法执行 todo 工具"); // 直接抛错，因为 todo 必须知道是谁的
  }

  if (name === "get_todos") {
    // 如果调用的是获取 todos
    return listTodos(userId); // 返回当前用户的 todo 列表
  }

  if (name === "add_todo") {
    // 如果调用的是新增 todo
    if (!args.title?.trim()) {
      // 标题为空或全是空格
      throw new Error("Todo 标题不能为空"); // 抛错
    }

    return createTodo({
      userId, // 当前用户 id
      title: args.title, // 标题
      description: args.description, // 描述
      priority: args.priority, // 优先级
      category: args.category, // 分类
      dueDate: args.dueDate, // 截止时间
    });
  }

  if (name === "complete_todo") {
    // 如果调用的是完成 todo
    if (!args.id || !ObjectId.isValid(args.id)) {
      // 如果没有 id 或 id 不是合法 ObjectId
      throw new Error("Todo id 无效"); // 抛错
    }

    return updateTodo(userId, args.id, { status: "done" }); // 直接把状态改成 done
  }

  throw new Error(`未知 todo 工具: ${name}`); // 如果传入了未支持的工具名，抛出错误
}
