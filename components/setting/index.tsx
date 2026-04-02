"use client";

import Link from "next/link";

export default function Setting() {
  const handleEnd = async function () {
    const result = await fetch("/api/auth/logout", {
      method: "POST",
    });
  };

  return (
    <div className="flex w-full items-center justify-center px-6 py-10">
      <section className="w-full max-w-3xl rounded-[32px] border border-white/20 bg-white/10 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">
            Settings
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Change Your Setting</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
            管理你的语言、主题、模式和语音相关偏好。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
            <div className="text-sm font-medium">你的语言</div>
            <div className="mt-1 text-sm text-white/65">简体中文</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
            <div className="text-sm font-medium">你的主题</div>
            <div className="mt-1 text-sm text-white/65">Glass UI</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
            <div className="text-sm font-medium">你的模式</div>
            <div className="mt-1 text-sm text-white/65">标准模式</div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 backdrop-blur-md">
            <div className="text-sm font-medium">语音设置</div>
            <div className="mt-1 text-sm text-white/65">暂未开启</div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <div>
            <Link
              href="/lognin"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[0.14] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white/[0.2]"
            >
              登录
            </Link>
          </div>
          <div>
            <Link
              href="/lognup"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[0.14] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white/[0.2]"
            >
              注册
            </Link>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[0.14] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white/[0.2]"
            >
              主页面
            </Link>
          </div>
          <button
            onClick={handleEnd}
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/[0.14] px-5 py-3 text-sm font-medium text-white shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-md transition hover:bg-white/[0.2]"
          >
            退出
          </button>
        </div>
      </section>
    </div>
  );
}
