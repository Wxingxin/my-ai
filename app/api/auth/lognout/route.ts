import { NextResponse, NextRequest } from "next/server";
import { endSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    await endSession();
    return NextResponse.json(
      { message: "登出成功", ok: true },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "登出失败", ok: false },
      { status: 500 },
    );
  }
}
