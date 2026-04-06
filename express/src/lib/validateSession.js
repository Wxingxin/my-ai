const { ObjectId } = require("mongodb");

const { getSession } = require("./session");

async function validateSession(req) {
  const session = await getSession(req);

  if (!session?.userId) {
    return {
      ok: false,
      message: "未登录",
      status: 401,
    };
  }

  if (!ObjectId.isValid(session.userId)) {
    return {
      ok: false,
      message: "用户 id 无效",
      status: 400,
    };
  }

  return {
    ok: true,
    userId: session.userId,
    session,
  };
}

module.exports = {
  validateSession,
};
