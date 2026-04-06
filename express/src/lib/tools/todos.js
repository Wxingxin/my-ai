const { ObjectId } = require("mongodb");

const { getTodosCollection } = require("../linkcollection");

const todoToolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_todos",
      description: "获取当前用户的 todo 列表",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      description: "创建一条 todo",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "todo 标题" },
          description: { type: "string", description: "todo 描述" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "优先级",
          },
          category: {
            type: "string",
            enum: ["work", "study", "life", "health", "finance", "other"],
            description: "分类",
          },
          dueDate: {
            type: "string",
            description: "截止时间 ISO 字符串，可选",
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      description: "将指定 todo 标记为完成",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string", description: "todo 的 id" },
        },
        required: ["id"],
      },
    },
  },
];

function toTodoDto(todo) {
  if (!todo?._id) {
    throw new Error("Todo _id is missing");
  }

  return {
    id: todo._id.toString(),
    title: todo.title,
    description: todo.description ?? "",
    status: todo.status,
    priority: todo.priority,
    category: todo.category,
    dueDate: todo.dueDate ? todo.dueDate.toISOString() : null,
    completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}

async function listTodos(userId) {
  const collection = await getTodosCollection();
  const todos = await collection
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return todos.map(toTodoDto);
}

async function createTodo(input) {
  const collection = await getTodosCollection();
  const now = new Date();

  const document = {
    userId: new ObjectId(input.userId),
    title: input.title.trim(),
    description: input.description?.trim() || "",
    status: "todo",
    priority: input.priority ?? "medium",
    category: input.category ?? "other",
    dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(document);

  return toTodoDto({
    ...document,
    _id: result.insertedId,
  });
}

async function updateTodo(userId, todoId, input) {
  const collection = await getTodosCollection();
  const now = new Date();
  const updatePayload = {
    updatedAt: now,
  };

  if (input.title !== undefined) {
    updatePayload.title = input.title.trim();
  }

  if (input.description !== undefined) {
    updatePayload.description = input.description.trim();
  }

  if (input.priority !== undefined) {
    updatePayload.priority = input.priority;
  }

  if (input.category !== undefined) {
    updatePayload.category = input.category;
  }

  if (input.dueDate !== undefined) {
    updatePayload.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
  }

  if (input.status !== undefined) {
    updatePayload.status = input.status;
    updatePayload.completedAt = input.status === "done" ? now : undefined;
  }

  await collection.updateOne(
    {
      _id: new ObjectId(todoId),
      userId: new ObjectId(userId),
    },
    {
      $set: updatePayload,
    },
  );

  const updated = await collection.findOne({
    _id: new ObjectId(todoId),
    userId: new ObjectId(userId),
  });

  if (!updated) {
    throw new Error("Todo not found");
  }

  return toTodoDto(updated);
}

async function deleteTodo(userId, todoId) {
  const collection = await getTodosCollection();
  const result = await collection.deleteOne({
    _id: new ObjectId(todoId),
    userId: new ObjectId(userId),
  });

  return result.deletedCount > 0;
}

async function executeTodoTool(name, args) {
  const userId = args.userId?.trim();

  if (!userId) {
    throw new Error("缺少当前用户信息，无法执行 todo 工具");
  }

  if (name === "get_todos") {
    return listTodos(userId);
  }

  if (name === "add_todo") {
    if (!args.title?.trim()) {
      throw new Error("Todo 标题不能为空");
    }

    return createTodo({
      userId,
      title: args.title,
      description: args.description,
      priority: args.priority,
      category: args.category,
      dueDate: args.dueDate,
    });
  }

  if (name === "complete_todo") {
    if (!args.id || !ObjectId.isValid(args.id)) {
      throw new Error("Todo id 无效");
    }

    return updateTodo(userId, args.id, { status: "done" });
  }

  throw new Error(`未知 todo 工具: ${name}`);
}

module.exports = {
  createTodo,
  deleteTodo,
  executeTodoTool,
  listTodos,
  todoToolDefinitions,
  updateTodo,
};
