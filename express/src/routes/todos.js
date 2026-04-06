const express = require("express");
const { ObjectId } = require("mongodb");
const { z } = require("zod");

const { callModel } = require("../lib/models");
const { resolveProvider } = require("../lib/models/provider");
const {
  createTodo,
  deleteTodo,
  listTodos,
  updateTodo,
} = require("../lib/tools/todos");
const { validateSession } = require("../lib/validateSession");

const todosRouter = express.Router();

const createTodoSchema = z.object({
  title: z.string().min(1, "标题不能为空"),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.enum(["work", "study", "life", "health", "finance", "other"]).optional(),
  dueDate: z.string().nullable().optional(),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.enum(["work", "study", "life", "health", "finance", "other"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
});

const TODO_AI_PROMPT = `
你是 Todo 助手。
- 用中文回答。
- 当用户要求查看、创建、完成、删除 Todo 时，优先调用工具。
- 工具执行完成后，用自然语言告诉用户你做了什么，并顺手总结当前 Todo 状态。
- 不要输出原始 JSON。
- 不要使用复杂 Markdown。
`;

const todoTools = [
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
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          category: {
            type: "string",
            enum: ["work", "study", "life", "health", "finance", "other"],
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
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_todo",
      description: "删除指定 todo",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      },
    },
  },
];

const MAX_TOOL_ROUNDS = 6;

todosRouter.get("/", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const todos = await listTodos(sessionResult.userId);
    return res.json({ ok: true, todos });
  } catch (error) {
    next(error);
  }
});

todosRouter.post("/", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const parsed = createTodoSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message || "参数错误",
      });
    }

    const todo = await createTodo({
      userId: sessionResult.userId,
      ...parsed.data,
    });
    const todos = await listTodos(sessionResult.userId);

    return res.json({ ok: true, todo, todos });
  } catch (error) {
    next(error);
  }
});

todosRouter.patch("/:id", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: "Todo id 无效" });
    }

    const parsed = updateTodoSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: parsed.error.issues[0]?.message || "参数错误",
      });
    }

    const todo = await updateTodo(sessionResult.userId, req.params.id, parsed.data);
    const todos = await listTodos(sessionResult.userId);

    return res.json({ ok: true, todo, todos });
  } catch (error) {
    next(error);
  }
});

todosRouter.delete("/:id", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: "Todo id 无效" });
    }

    const deleted = await deleteTodo(sessionResult.userId, req.params.id);

    if (!deleted) {
      return res.status(404).json({ ok: false, message: "Todo 不存在" });
    }

    const todos = await listTodos(sessionResult.userId);
    return res.json({ ok: true, todos });
  } catch (error) {
    next(error);
  }
});

todosRouter.post("/ai", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const { messages, provider } = req.body;
    const resolvedProvider = resolveProvider(provider);

    if (!resolvedProvider) {
      return res.status(500).json({
        ok: false,
        message: "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
      });
    }

    const fullMessages = [{ role: "system", content: TODO_AI_PROMPT }, ...messages];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await callModel(fullMessages, todoTools, resolvedProvider);

      if (!response.tool_calls || response.tool_calls.length === 0) {
        const todos = await listTodos(sessionResult.userId);
        return res.json({
          ok: true,
          role: "assistant",
          content: response.content,
          todos,
        });
      }

      fullMessages.push({
        role: "assistant",
        content: response.content ?? "",
        tool_calls: response.tool_calls,
      });

      for (const toolCall of response.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        let result;

        if (toolCall.function.name === "get_todos") {
          result = await listTodos(sessionResult.userId);
        } else if (toolCall.function.name === "add_todo") {
          result = await createTodo({
            userId: sessionResult.userId,
            title: args.title,
            description: args.description,
            priority: args.priority,
            category: args.category,
          });
        } else if (toolCall.function.name === "complete_todo") {
          if (!ObjectId.isValid(args.id)) {
            throw new Error("Todo id 无效");
          }

          result = await updateTodo(sessionResult.userId, args.id, {
            status: "done",
          });
        } else if (toolCall.function.name === "delete_todo") {
          if (!ObjectId.isValid(args.id)) {
            throw new Error("Todo id 无效");
          }

          result = await deleteTodo(sessionResult.userId, args.id);
        } else {
          throw new Error(`未知工具: ${toolCall.function.name}`);
        }

        fullMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    }

    return res.status(500).json({
      ok: false,
      message: "Todo AI 工具调用次数过多，请稍后重试",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  todosRouter,
};
