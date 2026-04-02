import { NextResponse, NextRequest } from "next/server";
import { getUsersCollection } from "@/lib/linkcollection";
import {
  hashDigitCode,
  createDigitCode,
  sendResetPasswordCodeEmail,
} from "@/lib/mailer";
import * as z from "zod";
const schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = schema.safeParse(body);
    if (validated.success === false) {
      return NextResponse.json({
        message: "data is not right",
        ok: false,
      });
    }

    const userscol = await getUsersCollection();

    const emailResult = await userscol.findOne({
      email: validated.data.email,
    });
    if (emailResult === null) {
      return NextResponse.json({
        message: "如果email存在已经发送",
        ok: true,
      });
    }

    const code = createDigitCode();
    const hashcode = hashDigitCode(code);
    const date = new Date();
    const expireAt = new Date(date.getTime() + 1 * 60 * 1000);

    //1. 存入数据
    const result = await userscol.updateOne(
      { email: validated.data.email },
      {
        $set: {
          resetPasswordCodeHash: hashcode,
          resetPasswordCodeExpireAt: expireAt,
          resetPasswordCode: null,
        },
      },
    );

    //2. 发送邮件
    await sendResetPasswordCodeEmail({
      email: validated.data.email,
      name: emailResult.username,
      code: code,
    });
    return NextResponse.json({ message: "success", ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "error", ok: false }, { status: 500 });
  }
}
