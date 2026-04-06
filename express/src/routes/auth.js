const express = require("express");
const { z } = require("zod");

const { getUsersCollection } = require("../lib/linkcollection");
const {
  hashDigitCode,
  createDigitCode,
  sendResetPasswordCodeEmail,
} = require("../lib/mailer");
const { hashPassword, verifyPassword } = require("../lib/password");
const { startSession, endSession } = require("../lib/session");

const authRouter = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(30),
});

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(20),
  password: z.string().min(6).max(30),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("邮箱格式不正确").max(50, "邮箱太长了"),
    digitCode: z.string().trim().regex(/^\d{6}$/, "验证码必须是 6 位数字"),
    password: z.string().trim().min(6, "密码至少 6 位").max(20, "密码最多 20 位"),
    confirmpassword: z
      .string()
      .trim()
      .min(6, "确认密码至少 6 位")
      .max(20, "确认密码最多 20 位"),
  })
  .refine((data) => data.password === data.confirmpassword, {
    message: "两次密码输入不一致",
    path: ["confirmpassword"],
  });

authRouter.post("/lognin", async (req, res, next) => {
  try {
    const validated = loginSchema.safeParse(req.body);

    if (!validated.success) {
      return res.json({ message: "数据不准确", ok: false });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: validated.data.email });

    if (!user) {
      return res.json({ message: "找不到email", ok: false });
    }

    const isValid = await verifyPassword(validated.data.password, user.hashpassword);

    if (!isValid) {
      return res.json({ message: "密码错误", ok: false });
    }

    const token = await startSession(res, {
      userId: user._id.toString(),
      email: user.email,
      username: user.username,
    });

    return res.json({
      message: "登录成功",
      ok: true,
      session: token,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/lognup", async (req, res, next) => {
  try {
    const validated = signupSchema.safeParse(req.body);

    if (!validated.success) {
      return res.status(400).json({ message: "create account is false", ok: false });
    }

    const users = await getUsersCollection();

    if (await users.findOne({ email: validated.data.email })) {
      return res.json({ message: "meail 存在", ok: false });
    }

    if (await users.findOne({ username: validated.data.username })) {
      return res.json({ message: "用户存在", ok: false });
    }

    const hashpassword = await hashPassword(validated.data.password);
    const insertData = {
      email: validated.data.email,
      username: validated.data.username,
      hashpassword,
      avatar: null,
      bio: "",
      createdAt: new Date(),
      updatedAt: new Date(),
      resetPasswordCodeHash: null,
      resetPasswordCodeExpireAt: null,
      resetPasswordCode: null,
    };

    const result = await users.insertOne(insertData);

    return res.json({
      success: "成功注册",
      ok: true,
      data: {
        _id: result.insertedId,
        ...insertData,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/lognout", async (_req, res, next) => {
  try {
    endSession(res);
    res.status(200).json({ message: "登出成功", ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/forgetpassword/sendmail", async (req, res, next) => {
  try {
    const validated = forgotPasswordSchema.safeParse(req.body);

    if (!validated.success) {
      return res.json({ message: "data is not right", ok: false });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: validated.data.email });

    if (!user) {
      return res.json({ message: "如果email存在已经发送", ok: true });
    }

    const code = createDigitCode();
    const hashcode = hashDigitCode(code);
    const expireAt = new Date(Date.now() + 60 * 1000);

    await users.updateOne(
      { email: validated.data.email },
      {
        $set: {
          resetPasswordCodeHash: hashcode,
          resetPasswordCodeExpireAt: expireAt,
          resetPasswordCode: null,
        },
      },
    );

    await sendResetPasswordCodeEmail({
      email: validated.data.email,
      name: user.username,
      code,
    });

    return res.json({ message: "success", ok: true });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/forgetpassword", async (req, res, next) => {
  try {
    const validated = resetPasswordSchema.safeParse(req.body);

    if (!validated.success) {
      return res.json({ message: "更新密码失败", ok: false });
    }

    const users = await getUsersCollection();
    const user = await users.findOne({ email: validated.data.email });

    if (!user) {
      return res.json({ message: "更新密码失败", ok: false });
    }

    if (user.resetPasswordLockedAt && user.resetPasswordLockedAt > new Date()) {
      return res.json({ message: "尝试次数过多，请15分钟后再试", ok: false });
    }

    const hashcode = hashDigitCode(validated.data.digitCode);
    const hashpassword = await hashPassword(validated.data.password);

    const result = await users.updateOne(
      {
        email: validated.data.email,
        resetPasswordCodeHash: hashcode,
        resetPasswordCodeExpireAt: { $gt: new Date() },
      },
      {
        $set: {
          hashpassword,
          resetPasswordCodeHash: null,
          resetPasswordCodeExpireAt: null,
          resetPasswordCode: null,
          resetPasswordAttempts: 0,
          resetPasswordLockedAt: null,
        },
      },
    );

    if (result.matchedCount === 0) {
      const attempts = (user.resetPasswordAttempts ?? 0) + 1;

      await users.updateOne(
        { email: validated.data.email },
        {
          $set: {
            resetPasswordAttempts: attempts,
            ...(attempts >= 5 && {
              resetPasswordLockedAt: new Date(Date.now() + 15 * 60 * 1000),
            }),
          },
        },
      );

      return res.json({
        message: attempts >= 5 ? "尝试次数过多，请15分钟后再试" : "验证码错误或已过期",
        ok: false,
      });
    }

    return res.json({ message: "更新密码成功", ok: true });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  authRouter,
};
