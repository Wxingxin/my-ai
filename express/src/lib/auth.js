const { jwtVerify, SignJWT } = require("jose");

function getJwtSecret() {
  const secret = process.env.SECRET_KEY ?? process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing SECRET_KEY");
  }

  return new TextEncoder().encode(secret);
}

async function createToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setSubject(payload.userId)
    .sign(getJwtSecret());
}

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, getJwtSecret());
  return payload;
}

module.exports = {
  createToken,
  verifyToken,
};
