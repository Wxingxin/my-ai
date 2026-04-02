// lib/mailer.ts
import nodemailer from "nodemailer"; // 引入 nodemailer，用于通过 SMTP 发送邮件
import { createHash, randomInt } from "node:crypto"; // Node.js 内置加密模块，用于生成哈希和随机数

/////////////////////////// 验证码 ///////////////////////////
/////////////////////////// 验证码 ///////////////////////////
/////////////////////////// 验证码 ///////////////////////////

/**
 * 对验证码进行 SHA256 哈希
 *
 * input: 需要生成的验证码(string)， return hash后的验证码(string)
 *
 * 1. 将验证码hash
 * 2. 将hash后的验证码存入数据库
 *
 */
export function hashDigitCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

//
/**
 * 生成一个 6 位数字验证码, 默认是 6 位，也可以自定义（传递参数）
 *
 * input: 需要生成的验证码几位数， return 验证码(string)
 *
 * 1. 发送给邮件
 * 2. 不能进将明文验证码存入数据库
 * 2. 将hash后的验证码 存入数据库
 */
export function createDigitCode(number = 6) {
  // randomInt 生成 0~999999
  // padStart 确保始终是 6 位（例如 000123）
  return String(randomInt(0, 1_000_000)).padStart(number, "0");
}

/////////////////////////// email send ///////////////////////////
/////////////////////////// email send ///////////////////////////
/////////////////////////// email send ///////////////////////////

// 专门用于 “忘记密码” 流程的邮件发送函数

// 创建并返回一个 SMTP 邮件发送器（transporter）
// 所有邮件发送统一使用这一份配置，避免不同模块重复创建 transport
function getMailer() {
  const host = process.env.SMTP_HOST; // SMTP 服务器地址，例如：smtp.qq.com
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10); // SMTP 端口，默认 465（SSL）
  const user = process.env.SMTP_USER; // SMTP 登录用户名（通常是邮箱）
  const pass = process.env.SMTP_PASS; // SMTP 授权码 / 密码

  // 如果关键配置缺失，直接抛出异常，防止程序继续运行
  if (!host || !user || !pass) {
    throw new Error("SMTP config is incomplete");
  }

  // 创建 nodemailer transport（邮件发送客户端）
  return nodemailer.createTransport({
    host, // SMTP 主机
    port, // SMTP 端口
    // secure 表示是否使用 SSL
    // QQ邮箱常见：465 + secure=true
    // 也允许通过环境变量覆盖
    secure: (process.env.SMTP_SECURE ?? "true") === "true",

    auth: {
      user, // SMTP 登录用户名
      pass, // SMTP 登录密码 / 授权码
    },
  });
}

/**
 * 发送重置密码验证码邮件
 *
 * 专门用于 “忘记密码” 流程
 * 输入参数：
 * - email: 收件人邮箱
 * - name: 用户名
 * - code: 验证码
 *
 * 返回值：
 * - 无
 */
export async function sendResetPasswordCodeEmail(input: {
  email: string; // 收件人邮箱
  name: string; // 用户名
  code: string; // 验证码
}) {
  // 专门用于 “忘记密码” 流程的邮件发送函数

  // 忘记密码流程只发送：
  // ✔ 6 位验证码
  // ❌ 不发送重置链接

  // 验证码有效期与接口逻辑保持一致（例如 60 秒）

  const transporter = getMailer(); // 获取邮件发送器

  // 发件人名称
  // 如果环境变量未配置，则默认使用 "Jose Pro"
  const fromName = process.env.MAIL_FORM_NAME?.trim() || "Jose Pro";

  // 发送邮件
  await transporter.sendMail({
    // 发件人
    from: `"${fromName}" <${process.env.SMTP_USER}>`,

    // 收件人
    to: input.email,

    // 邮件标题
    subject: "重置密码验证码",

    // 纯文本邮件内容（部分客户端只支持 text）
    text: `你好，${input.name}。\n\n你的验证码是：${input.code}\n验证码 60 秒内有效。\n如果不是你本人操作，请忽略这封邮件。`,

    // HTML 格式邮件（大部分邮箱客户端支持）
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>重置密码验证码</h2>
        <p>你好，${input.name}。</p>
        <p>你的验证码是：</p>

        <!-- 验证码大号字体显示 -->
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em;">
          ${input.code}
        </p>

        <p>验证码 60 秒内有效。</p>
        <p>如果不是你本人操作，请忽略这封邮件。</p>
      </div>
    `,
  });
}

// 通用邮件发送函数
// 后续可以用于：
// - 欢迎邮件
// - 通知邮件
// - 系统提醒
// - 注册成功邮件
export async function sendMail(input: {
  to: string; // 收件人邮箱
  subject: string; // 邮件标题
  html: string; // HTML 邮件正文
  text?: string; // 可选的纯文本版本
}) {
  const transporter = getMailer(); // 获取 SMTP 发送器

  // 发件人名称
  const fromName = process.env.MAIL_FORM_NAME?.trim() || "Jose Pro";

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`, // 发件人
    to: input.to, // 收件人
    subject: input.subject, // 邮件标题
    html: input.html, // HTML 内容
    text: input.text, // 纯文本内容（可选）
  });
}
