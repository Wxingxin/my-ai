// lib/validateSession.js
import { getSession } from "@/lib/session";
import { ObjectId } from "mongodb";

type SessionData = {
  userId: string;
  username?: string;
  email?: string;
};

/**
 * 校验当前登录状态,在 API rotue中使用
 *
 * 通过返回对象的 ok 属性判断是否成功
 *
 * 用法：
 * 1. const result = await validateSession();
 *
 * 2. if (!result.ok) {
 *   return NextResponse.json(
 *     { ok: false, message: result.message },
 *     { status: result.status }
 *   );
 * }
 *
 * 3. const userId = result.userId;
 * 4. const session = result.session;
 */
export async function validateSession(): Promise<
  | { ok: true; userId: string; session: SessionData }
  | { ok: false; message: string; status: number }
> {
  const session = (await getSession()) as SessionData | null;

  // 1. 未登录
  if (!session?.userId) {
    return {
      ok: false,
      message: "未登录",
      status: 401,
    };
  }

  // 2. userId 格式错误
  if (!ObjectId.isValid(session.userId)) {
    return {
      ok: false,
      message: "用户 id 无效",
      status: 400,
    };
  }

  // 3. 成功
  return {
    ok: true,
    userId: session.userId,
    session,
  };
}
