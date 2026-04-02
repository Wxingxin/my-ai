import { ObjectId } from "mongodb"; // 引入 ObjectId，用于校验和构造 MongoDB 查询条件

import { getChatConversationsCollection } from "@/lib/linkcollection"; // 获取聊天会话集合
import { validateSession } from "@/lib/vaildateSession"; // 校验用户登录状态

/**
 * TODO: 删除指定对话（根据 id）
 */
export async function DELETE(
  _request: Request, // 当前请求（这里未使用，用 _ 表示忽略）
  context: { params: Promise<{ id: string }> }, // Next.js App Router 的动态参数（Promise 形式）
) {
  // 1️⃣ 校验用户是否登录
  const sessionResult = await validateSession();

  if (!sessionResult.ok) {
    return Response.json(
      { ok: false, message: sessionResult.message }, // 返回未登录或会话失效信息
      { status: sessionResult.status },
    );
  }

  // 2️⃣ 获取路由参数 id（例如 /api/chat/[id]）
  const { id } = await context.params;

  // 3️⃣ 校验 id 是否是合法的 MongoDB ObjectId
  if (!ObjectId.isValid(id)) {
    return Response.json(
      { ok: false, message: "对话 id 无效" },
      { status: 400 },
    );
  }

  try {
    const collection = await getChatConversationsCollection(); // 获取集合

    // 4️⃣ 删除数据（必须同时匹配 id + userId，防止越权删除）
    const deleteResult = await collection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(sessionResult.userId), // 只允许删除自己的对话
    });

    // 5️⃣ 如果没有删除成功（说明不存在或不属于该用户）
    if (deleteResult.deletedCount === 0) {
      return Response.json(
        { ok: false, message: "对话不存在" },
        { status: 404 },
      );
    }

    // 6️⃣ 删除成功
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Delete conversation error:", error); // 打印错误日志

    return Response.json(
      { ok: false, message: "删除对话失败，请稍后再试" },
      { status: 500 },
    );
  }
}
