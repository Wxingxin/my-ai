import { NextResponse, NextRequest } from "next/server";
import * as z from "zod";
import { getUsersCollection } from "@/lib/linkcollection";
import type { UsersCollectionType } from "@/lib/linkcollection";
import { hashPassword } from "@/lib/password";

const Schema = z.object({
  email: z.string().email(),
  username: z.string().min(1).max(20),
  password: z.string().min(6).max(30),
});

export type returnType = {
  message: string;
  ok: boolean;
  data: UsersCollectionType;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = Schema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { message: "create account is false", ok: false },
        { status: 400 },
      );
    }

    const userscol = await getUsersCollection();

    const emailResult = await userscol.findOne({
      email: validated.data.email,
    });
    if (emailResult !== null) {
      return NextResponse.json({
        message: "meail 存在",
        ok: false,
      });
    }

    const usernameResult = await userscol.findOne({
      username: validated.data.username,
    });
    if (usernameResult !== null) {
      return NextResponse.json({
        message: "用户存在",
        ok: false,
      });
    }

    const hashpassword = await hashPassword(validated.data.password);

    const insertDate = {
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

    const result = await userscol.insertOne(insertDate);

    return NextResponse.json({
      success: "成功注册",
      ok: true,
      data: {
        _id: result.insertedId,
        ...insertDate,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "create account is false", ok: false },
      { status: 500 },
    );
  }
}
