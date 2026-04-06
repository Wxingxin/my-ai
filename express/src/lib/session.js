const { createToken, verifyToken } = require("./auth");
const { parseCookies, serializeCookie } = require("../utils/http");

const SESSION_COOKIE = "token";

function cookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge,
  };
}

async function startSession(res, payload) {
  const token = await createToken(payload);

  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, token, cookieOptions(60 * 60 * 24 * 7)),
  );

  return token;
}

function endSession(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, "", cookieOptions(0)),
  );
}

async function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];

  if (!token) {
    return null;
  }

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

module.exports = {
  endSession,
  getSession,
  startSession,
};
