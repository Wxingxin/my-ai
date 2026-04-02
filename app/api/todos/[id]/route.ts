import { ObjectId } from "mongodb";

import { z } from "zod";

import { deleteTodo, listTodos, updateTodo } from "@/lib/tools/todos";
// 导入 Todo 相关工具函数
// updateTodo -> 更新某条 Todo
// deleteTodo -> 删除某条 Todo
// listTodos   -> 查询当前用户全部 Todo

import { validateSession } from "@/lib/vaildateSession";
// 导入 session 校验函数
// 用来判断当前请求用户是否已经登录

const updateTodoSchema = z.object({
  title: z.string().min(1).optional(),
  // title 可选
  // 如果传了，必须是字符串，且至少 1 个字符

  description: z.string().optional(),
  // description 可选
  // 如果传了，必须是字符串

  priority: z.enum(["low", "medium", "high"]).optional(),
  // priority 可选
  // 只能是 low / medium / high

  category: z
    .enum(["work", "study", "life", "health", "finance", "other"])
    .optional(),
  // category 可选
  // 只能是预设的分类之一

  status: z.enum(["todo", "in_progress", "done"]).optional(),
  // status 可选
  // 只能是 todo / in_progress / done 三种状态之一

  dueDate: z.string().nullable().optional(),
  // dueDate 可选
  // 可以不传、可以是 null、也可以是字符串
  // 一般这里存日期字符串
});

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  // PATCH 请求：更新某一条 Todo

  const sessionResult = await validateSession();
  // 先检查用户是否登录

  if (!sessionResult.ok) {
    // 如果用户未登录或登录失效，直接返回错误
    return Response.json(
      { ok: false, message: sessionResult.message },
      { status: sessionResult.status },
    );
  }

  const { id } = await context.params;
  // 从动态路由参数中取出 todo 的 id
  // 比如 /api/todos/123 里的 123

  if (!ObjectId.isValid(id)) {
    // 如果 id 不是合法的 MongoDB ObjectId，直接返回 400
    return Response.json(
      { ok: false, message: "Todo id 无效" },
      { status: 400 },
    );
  }

  try {
    const parsed = updateTodoSchema.safeParse(await req.json());
    // 读取请求体 JSON
    // 再用 zod 安全校验参数
    // safeParse 不会直接抛异常，而是返回 success: true / false

    if (!parsed.success) {
      // 参数校验失败时，返回第一条错误信息
      return Response.json(
        { ok: false, message: parsed.error.issues[0]?.message || "参数错误" },
        { status: 400 },
      );
    }

    const todo = await updateTodo(sessionResult.userId, id, parsed.data);
    // 调用更新工具函数
    // 传入：
    // 1. 当前登录用户的 userId
    // 2. 要更新的 todo id
    // 3. 通过校验后的更新数据 parsed.data
    //
    // 这里 userId 很关键：
    // 表示只能更新“当前用户自己的 Todo”

    const todos = await listTodos(sessionResult.userId);
    // 更新成功后，再重新查询当前用户全部 Todo
    // 这样前端就能拿到最新列表，方便直接刷新 UI

    return Response.json({ ok: true, todo, todos });
    // 返回：
    // ok: true   -> 操作成功
    // todo       -> 更新后的那条 Todo
    // todos      -> 当前用户最新完整 Todo 列表
  } catch (error) {
    console.error("Update todo error:", error);
    // 服务端打印错误日志，方便排查问题

    return Response.json(
      { ok: false, message: "更新 Todo 失败" },
      { status: 500 },
    );
    // 服务器内部错误，返回 500
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  // DELETE 请求：删除某一条 Todo
  // 注意这里 req 没有用到，所以写成 _req，表示“故意不使用”

  const sessionResult = await validateSession();
  // 先校验当前用户登录状态

  if (!sessionResult.ok) {
    // 未登录或登录失效，直接返回错误
    return Response.json(
      { ok: false, message: sessionResult.message },
      { status: sessionResult.status },
    );
  }

  const { id } = await context.params;
  // 从动态路由参数中获取要删除的 todo id

  if (!ObjectId.isValid(id)) {
    // 先校验 id 是否合法
    return Response.json(
      { ok: false, message: "Todo id 无效" },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteTodo(sessionResult.userId, id);
    // 调用删除工具函数
    // 只允许删除当前登录用户自己的 Todo
    //
    // deleted 通常表示删除是否成功
    // true  -> 删除到了
    // false -> 没找到对应 Todo

    if (!deleted) {
      // 如果没有删除到，说明这条 Todo 不存在
      // 或者不属于当前用户
      return Response.json(
        { ok: false, message: "Todo 不存在" },
        { status: 404 },
      );
    }

    const todos = await listTodos(sessionResult.userId);
    // 删除成功后，再查一次当前用户全部 Todo
    // 用于返回最新列表给前端

    return Response.json({ ok: true, todos });
    // 返回删除后的最新 Todo 列表
  } catch (error) {
    console.error("Delete todo error:", error);
    // 打印服务端错误日志

    return Response.json(
      { ok: false, message: "删除 Todo 失败" },
      { status: 500 },
    );
    // 服务器内部错误
  }
}
