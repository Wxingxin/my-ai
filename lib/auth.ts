// lib/auth.ts
import { jwtVerify, SignJWT } from "jose";

/**
 * JWT 中保存的最小会话信息
 *
 * 这里只存放：
 * - 页面鉴权需要的数据
 * - 当前用户展示需要的数据
 *
 * 不要把敏感信息（例如密码、权限策略等）放进 token，
 * 因为 JWT 的 payload 是可以被客户端解码看到的。
 */
export type SessionPayload = {
  userId: string; // 用户ID（数据库中的唯一标识）
  email: string; // 用户邮箱
  username: string; // 用户昵称
};

/**
 * 获取 JWT 使用的密钥
 *
 * 优先读取当前项目使用的环境变量：
 *   SECRET_KEY
 *
 * 同时兼容旧项目的变量：
 *   JWT_SECRET
 *
 * 如果两个变量都不存在，则直接抛出错误。
 */
function getJwtSecret() {
  // 从环境变量读取密钥
  const secret = process.env.SECRET_KEY ?? process.env.JWT_SECRET;

  // 如果没有配置密钥，说明项目配置错误
  if (!secret) {
    throw new Error("Missing SECRET_KEY");
  }

  /**
   * jose 库要求：
   * HMAC 加密算法的密钥必须是 Uint8Array 类型
   *
   * TextEncoder 可以把字符串转换成 Uint8Array
   */
  return new TextEncoder().encode(secret);
}

/**
 * 创建 JWT Token
 *
 * @param payload 要写入 token 的用户信息
 * @returns Promise<string> 生成的 JWT 字符串
 *
 * Token 特点：
 * - 使用 HS256 算法签名
 * - 包含创建时间
 * - 7 天过期
 * - subject 设置为 userId（方便做用户追踪）
 */
export async function createToken(payload: SessionPayload) {
  return new SignJWT(payload) // 将用户信息写入 JWT payload
    .setProtectedHeader({ alg: "HS256" }) // 设置签名算法
    .setIssuedAt() // 设置 token 生成时间 (iat)
    .setExpirationTime("7d") // 设置过期时间（7天）
    .setSubject(payload.userId) // 设置 subject（通常表示用户ID）
    .sign(getJwtSecret()); // 使用密钥进行签名
}

/**
 * 验证 JWT Token
 *
 * 功能：
 * 1. 验证 token 是否被篡改
 * 2. 验证 token 是否过期
 *
 * @param token 客户端传来的 JWT
 * @returns 解析后的 payload
 */
export async function verifyToken(token: string) {
  // jwtVerify 会：
  // - 校验签名
  // - 校验过期时间
  // - 校验算法
  const { payload } = await jwtVerify(token, getJwtSecret());

  /**
   * jose 返回的 payload 包含标准 JWT 字段：
   *
   * exp  token 过期时间
   * iat  token 签发时间
   * sub  token 主题（这里是 userId）
   *
   * 这里通过 TypeScript 类型断言补充这些字段类型。
   */
  return payload as SessionPayload & {
    exp?: number; // 过期时间 (expiration time)
    iat?: number; // 签发时间 (issued at)
    sub?: string; // 主题 (subject)
  };
}
