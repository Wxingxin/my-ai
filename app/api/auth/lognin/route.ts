import { NextResponse, NextRequest } from "next/server";
import { getUsersCollection } from "@/lib/linkcollection";
import * as z from "zod";
import { verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(30),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validated = Schema.safeParse(body);
    if (validated.success === false) {
      return NextResponse.json({
        message: "数据不准确",
        ok: false,
      });
    }

    const userscol = await getUsersCollection();

    const emailResult = await userscol.findOne({
      email: validated.data.email,
    });
    if (emailResult === null) {
      return NextResponse.json({
        message: "找不到email",
        ok: false,
      });
    }

    const passwordResult = await verifyPassword(
      validated.data.password,
      emailResult.hashpassword,
    );
    if (passwordResult === false) {
      return NextResponse.json({
        message: "密码错误",
        ok: false,
      });
    }

    const session = await startSession({
      userId: emailResult._id.toString(),
      email: emailResult.email,
      username: emailResult.username,
    });

    return NextResponse.json({
      message: "登录成功",
      ok: true,
      session,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "登录失败", ok: false },
      { status: 500 },
    );
  }
}
