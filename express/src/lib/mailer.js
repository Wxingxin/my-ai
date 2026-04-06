const { createHash, randomInt } = require("node:crypto");
const nodemailer = require("nodemailer");

function hashDigitCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

function createDigitCode(number = 6) {
  return String(randomInt(0, 1_000_000)).padStart(number, "0");
}

function getMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number.parseInt(process.env.SMTP_PORT ?? "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP config is incomplete");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: { user, pass },
  });
}

async function sendResetPasswordCodeEmail(input) {
  const transporter = getMailer();
  const fromName = process.env.MAIL_FORM_NAME?.trim() || "Jose Pro";

  await transporter.sendMail({
    from: `"${fromName}" <${process.env.SMTP_USER}>`,
    to: input.email,
    subject: "重置密码验证码",
    text: `你好，${input.name}。\n\n你的验证码是：${input.code}\n验证码 60 秒内有效。\n如果不是你本人操作，请忽略这封邮件。`,
    html: `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>重置密码验证码</h2>
        <p>你好，${input.name}。</p>
        <p>你的验证码是：</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.3em;">
          ${input.code}
        </p>
        <p>验证码 60 秒内有效。</p>
        <p>如果不是你本人操作，请忽略这封邮件。</p>
      </div>
    `,
  });
}

module.exports = {
  createDigitCode,
  hashDigitCode,
  sendResetPasswordCodeEmail,
};
