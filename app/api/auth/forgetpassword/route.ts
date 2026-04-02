import { NextResponse, NextRequest } from "next/server";
import * as z from "zod";
import { getUsersCollection } from "@/lib/linkcollection";
import { hashDigitCode } from "@/lib/mailer";
import { hashPassword } from "@/lib/password";

const Schema = z
  .object({
    email: z.string().trim().email("邮箱格式不正确").max(50, "邮箱太长了"),
    digitCode: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "验证码必须是 6 位数字"),
    password: z
      .string()
      .trim()
      .min(6, "密码至少 6 位")
      .max(20, "密码最多 20 位"),
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

export async function PATCH(request: NextRequest) {
  try {
    const result = await request.json();
    const validated = Schema.safeParse(result);
    if (validated.success === false) {
      return NextResponse.json({
        message: "更新密码失败",
        ok: false,
      });
    }

    const userscol = await getUsersCollection();

    const emailResult = await userscol.findOne({
      email: validated.data.email,
    });
    if (emailResult === null) {
      return NextResponse.json({
        message: "更新密码失败",
        ok: false,
      });
    }

    // ✅ 第一处：验证码验证之前，先检查是否被锁定
    if (
      emailResult.resetPasswordLockedAt &&
      emailResult.resetPasswordLockedAt > new Date()
    ) {
      return NextResponse.json({
        message: "尝试次数过多，请15分钟后再试",
        ok: false,
      });
    }

    const hashcode = hashDigitCode(validated.data.digitCode);
    const hashpassword = await hashPassword(validated.data.password);
    const date = new Date();

    const result2 = await userscol.updateOne(
      {
        email: validated.data.email,
        resetPasswordCodeHash: hashcode,
        resetPasswordCodeExpireAt: {
          $gt: date,
        },
      },
      {
        $set: {
          hashpassword,
          resetPasswordCodeHash: null,
          resetPasswordCodeExpireAt: null,
          resetPasswordCode: null,
          // ✅ 验证成功，清空锁定记录
          resetPasswordAttempts: 0,
          resetPasswordLockedAt: null,
        },
      },
    );

    // ✅ 第二处：验证码错误时，累加失败次数，达到5次锁定
    if (result2.matchedCount === 0) {
      const attempts = (emailResult.resetPasswordAttempts ?? 0) + 1;

      await userscol.updateOne(
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

      return NextResponse.json({
        message:
          attempts >= 5 ? "尝试次数过多，请15分钟后再试" : "验证码错误或已过期",
        ok: false,
      });
    }

    return NextResponse.json({ message: "更新密码成功", ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "error", ok: false }, { status: 500 });
  }
}
