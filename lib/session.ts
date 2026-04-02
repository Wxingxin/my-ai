// lib/session.ts
import { cookies } from "next/headers";

import { createToken, verifyToken } from "@/lib/auth";

/**
 * 当前项目统一使用这个 cookie 名作为登录态存储键。
 *
 * 也就是说：
 * 登录成功后，服务器会把 JWT 放到名为 "token" 的 cookie 中。
 * 之后每次请求，服务器都可以从这个 cookie 里取出 token，
 * 用来判断当前用户是否已经登录。
 */
const SESSION_COOKIE = "token";

/**
 * 生成 cookie 配置项
 *
 * @param maxAge cookie 的存活时间（单位：秒）
 * @returns cookie 的配置对象
 *
 * 为什么单独抽成函数？
 * 1. 避免 startSession 和 endSession 重复写同样的配置
 * 2. 保证设置 cookie 和删除 cookie 时，关键配置保持一致
 * 3. 后面如果要统一修改 cookie 策略，只改这一个地方就行
 */
function cookieOptions(maxAge?: number) {
  return {
    /**
     * httpOnly: true
     *
     * 表示这个 cookie 只能被服务器读取，
     * 浏览器前端的 JavaScript 代码无法通过 document.cookie 直接拿到它。
     *
     * 作用：
     * - 降低 XSS 攻击时 token 被前端脚本直接偷走的风险
     *
     * 举例：
     * 开启后，前端代码无法这样读取：
     * document.cookie
     */
    httpOnly: true,

    /**
     * secure
     *
     * 表示只有在 HTTPS 环境下才会发送这个 cookie。
     *
     * 这里的逻辑是：
     * - 开发环境（development）一般用 http，本地调试方便，所以不强制开启
     * - 生产环境（production）通常走 https，所以自动开启
     *
     * 作用：
     * - 避免 cookie 在明文 HTTP 中传输，被中间人窃取
     */
    secure: process.env.NODE_ENV === "production",

    /**
     * sameSite: "lax"
     *
     * 控制跨站请求时 cookie 是否自动携带。
     *
     * "lax" 的特点：
     * - 普通站内导航、地址栏访问，cookie 可以带上
     * - 某些跨站场景下不会自动带上 cookie
     *
     * 作用：
     * - 在不影响大部分正常使用的情况下，减少 CSRF（跨站请求伪造）风险
     *
     * as const 的作用：
     * - 告诉 TypeScript 这里就是字面量 "lax"
     * - 而不是一个普通 string
     * - 这样类型会更精确
     */
    sameSite: "lax" as const,

    /**
     * path: "/"
     *
     * 表示这个 cookie 对整个网站根路径都有效。
     *
     * 也就是：
     * - / 可用
     * - /login 可用
     * - /admin 可用
     * - /api/user 可用
     *
     * 如果 path 设得太小，某些页面或接口可能拿不到 cookie。
     */
    path: "/",

    /**
     * maxAge
     *
     * cookie 最大存活时间，单位是秒。
     *
     * 例如：
     * 60 * 60 * 24 * 7
     * = 7 天
     *
     * 如果传 0，通常表示立刻让 cookie 失效。
     */
    maxAge,
  };
}

/**
 * 开启会话（登录成功 / 注册成功后调用）
 *
 * @param payload 写入 JWT 的用户会话信息
 *
 * 这个函数做了两件事：
 * 1. 根据用户信息创建 JWT token
 * 2. 把 token 写入浏览器 cookie，作为登录态保存
 *
 * 整体流程：
 * 用户登录成功
 *   -> createToken(payload) 生成 JWT
 *   -> cookies().set(...) 写入 cookie
 *   -> 浏览器后续请求自动携带该 cookie
 */
export async function startSession(payload: Parameters<typeof createToken>[0]) {
  /**
   * 根据用户信息生成 token
   *
   * payload 的类型没有手写，而是通过：
   * Parameters<typeof createToken>[0]
   * 自动推导出 createToken 第一个参数的类型。
   *
   * 好处：
   * - 不用重复写类型
   * - 如果 createToken 的参数类型以后变了，这里会自动同步
   */
  const token = await createToken(payload);

  /**
   * 获取 Next.js 提供的 cookie 操作对象
   *
   * 在服务端环境中，可以通过它读取 and 设置 cookie。
   */
  const cookieStore = await cookies();

  /**
   * 把 token 写入 cookie
   *
   * 第一个参数：cookie 名字
   * 第二个参数：cookie 值
   * 第三个参数：cookie 配置
   *
   * 60 * 60 * 24 * 7 = 7 天
   *
   * 也就是说：
   * 用户登录后，这个登录态默认保留 7 天
   */
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(60 * 60 * 24 * 7));
}

/**
 * 结束会话（退出登录时调用）
 *
 * 实现思路：
 * - 把同名 cookie 的值改成空字符串
 * - 并设置 maxAge = 0
 *
 * 这样浏览器就会立即删除这个 cookie，
 * 用户后续请求也就不会再带上登录态。
 */
export async function endSession() {
  /**
   * 获取 cookie 操作对象
   */
  const cookieStore = await cookies();

  /**
   * 删除 cookie 的常见做法：
   * - 设置相同的 cookie 名
   * - 值设为空
   * - maxAge 设为 0
   *
   * 注意：
   * 删除 cookie 时，path、sameSite 等关键配置最好与设置时保持一致，
   * 否则有时可能删不掉原来的 cookie。
   */
  cookieStore.set(SESSION_COOKIE, "", cookieOptions(0));
}

/**
 * 获取当前会话信息
 *
 * @returns
 * - 如果用户已登录且 token 合法，返回解析后的会话数据
 * - 如果未登录 / token 不存在 / token 已过期 / token 被篡改，返回 null
 *
 * 这个函数的作用是：
 * 从 cookie 中恢复当前用户登录态。
 *
 * 常见使用场景：
 * - 服务端页面判断是否登录
 * - 接口中获取当前用户信息
 * - 中间件做路由保护
 */
export async function getSession() {
  /**
   * 获取 cookie 操作对象
   */
  const cookieStore = await cookies();

  /**
   * 从 cookie 中取出名为 "token" 的值
   *
   * cookieStore.get(SESSION_COOKIE) 可能返回 undefined，
   * 所以后面用了可选链 ?.value
   *
   * 如果没取到，token 就是 undefined
   */
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  /**
   * 如果 cookie 里根本没有 token，
   * 说明当前用户还没有登录，直接返回 null
   */
  if (!token) {
    return null;
  }

  try {
    /**
     * 验证 token 是否合法
     *
     * verifyToken 内部一般会做这些事：
     * 1. 检查 token 签名是否正确
     * 2. 检查 token 是否过期
     * 3. 解析出 payload（如 userId、email、name）
     *
     * 验证成功：
     * - 返回用户会话信息
     */
    return await verifyToken(token);
  } catch {
    /**
     * 如果进入 catch，通常说明：
     * - token 被篡改
     * - token 已过期
     * - token 格式错误
     * - 密钥不匹配
     *
     * 这里统一返回 null，
     * 让上层逻辑按“未登录”处理即可。
     *
     * 这种写法的好处是：
     * 上层不用关心 token 为什么失效，
     * 只需要判断有没有登录。
     */
    return null;
  }
}
