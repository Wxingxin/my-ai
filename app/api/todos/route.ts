import { z } from "zod";
// 引入 zod，用来做请求参数校验

import { createTodo, listTodos } from "@/lib/tools/todos";
// 引入 Todo 相关工具函数：
// createTodo -> 创建一条 Todo
// listTodos -> 获取当前用户的 Todo 列表

import { validateSession } from "@/lib/vaildateSession";
// 引入登录校验函数，用来判断当前请求用户是否已经登录

const createTodoSchema = z.object({
  // 定义“创建 Todo”时请求体的校验规则

  title: z.string().min(1, "标题不能为空"),

  description: z.string().optional(),

  priority: z.enum(["low", "medium", "high"]).optional(),

  category: z
    .enum(["work", "study", "life", "health", "finance", "other"])
    .optional(),

  dueDate: z.string().nullable().optional(),
});

export async function GET() {
  // 处理 GET 请求
  // 作用：获取当前登录用户的 Todo 列表

  const sessionResult = await validateSession();
  // 校验当前用户登录状态

  if (!sessionResult.ok) {
    // 如果没有通过登录校验，直接返回错误响应
    return Response.json(
      { ok: false, message: sessionResult.message },
      // ok: false 表示请求失败
      // message 返回具体失败原因，比如“未登录”
      { status: sessionResult.status },
      // HTTP 状态码也使用 validateSession 返回的状态码
    );
  }

  try {
    const todos = await listTodos(sessionResult.userId);
    // 根据当前登录用户的 userId，查询属于这个用户的 Todo 列表

    return Response.json({ ok: true, todos });
    // 返回成功响应
    // ok: true 表示成功
    // todos 是查到的 Todo 数据
  } catch (error) {
    console.error("List todos error:", error);
    // 服务端打印错误日志，方便调试

    return Response.json(
      { ok: false, message: "读取 Todo 失败" },
      // 返回统一的失败信息给前端
      { status: 500 },
      // 500 表示服务器内部错误
    );
  }
}

export async function POST(req: Request) {
  // 处理 POST 请求
  // 作用：创建一条新的 Todo

  const sessionResult = await validateSession();
  // 先校验当前用户是否登录

  if (!sessionResult.ok) {
    // 如果未登录或登录失效，直接返回错误
    return Response.json(
      { ok: false, message: sessionResult.message },
      { status: sessionResult.status },
    );
  }

  try {
    const parsed = createTodoSchema.safeParse(await req.json());
    // 读取请求体 JSON
    // 再使用 zod 的 safeParse 做安全校验
    // safeParse 不会直接抛异常，而是返回 success: true / false

    if (!parsed.success) {
      // 如果参数校验失败
      return Response.json(
        { ok: false, message: parsed.error.issues[0]?.message || "参数错误" },
        // 优先返回 zod 校验出来的第一条错误信息
        // 如果没有，就返回默认“参数错误”
        { status: 400 },
        // 400 表示客户端请求参数有问题
      );
    }

    const todo = await createTodo({
      userId: sessionResult.userId,
      // 把当前登录用户的 userId 一起传进去
      // 这样创建出来的 Todo 就会绑定到这个用户

      ...parsed.data,
      // 展开经过校验后的合法数据
      // 包括 title / description / priority / category / dueDate
    });

    const todos = await listTodos(sessionResult.userId);
    // 创建成功后，再重新查询一次当前用户的 Todo 列表
    // 这样前端就能拿到最新完整列表

    return Response.json({ ok: true, todo, todos });
    // 返回成功响应
    // todo  是刚刚创建成功的那条 Todo
    // todos 是最新的 Todo 列表
  } catch (error) {
    console.error("Create todo error:", error);
    // 服务端打印错误日志，方便排查问题

    return Response.json(
      { ok: false, message: "创建 Todo 失败" },
      // 返回统一错误信息
      { status: 500 },
      // 500 表示服务器内部错误
    );
  }
}
