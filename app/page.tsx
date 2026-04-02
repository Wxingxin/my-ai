"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MessageSquareQuote,
  ListTodo,
  Newspaper,
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  LoaderPinwheel,
  ChevronDown,
} from "lucide-react";

const FEATURES = [
  {
    icon: MessageSquareQuote,
    title: "智能对话",
    desc: "与 Aria 自然交流，理解上下文、整理思路、生成内容，像和真人协作一样顺畅。",
    color: "from-violet-500/20 to-purple-600/10",
    border: "border-violet-500/30",
    iconColor: "text-violet-400",
  },
  {
    icon: ListTodo,
    title: "任务管理",
    desc: "将对话中的想法直接转化为待办清单，优先级排序、截止提醒，让执行零摩擦。",
    color: "from-sky-500/20 to-cyan-600/10",
    border: "border-sky-500/30",
    iconColor: "text-sky-400",
  },
  {
    icon: Newspaper,
    title: "资讯聚合",
    desc: "Aria 持续追踪你关心的领域，每日精选摘要，让你在信息洪流中保持专注。",
    color: "from-emerald-500/20 to-teal-600/10",
    border: "border-emerald-500/30",
    iconColor: "text-emerald-400",
  },
  {
    icon: Zap,
    title: "极速响应",
    desc: "毫秒级延迟，流式输出，不打断你的思维节奏，工作流随时随地无缝运转。",
    color: "from-amber-500/20 to-yellow-600/10",
    border: "border-amber-500/30",
    iconColor: "text-amber-400",
  },
  {
    icon: ShieldCheck,
    title: "隐私安全",
    desc: "对话数据本地优先存储，端到端加密传输，你的数据只属于你自己。",
    color: "from-rose-500/20 to-pink-600/10",
    border: "border-rose-500/30",
    iconColor: "text-rose-400",
  },
  {
    icon: Sparkles,
    title: "持续进化",
    desc: "Aria 随使用深入而变得更懂你，个性化建议越来越精准，越用越顺手。",
    color: "from-fuchsia-500/20 to-violet-600/10",
    border: "border-fuchsia-500/30",
    iconColor: "text-fuchsia-400",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

export default function HomePage() {
  const featuresSection = useInView();
  const ctaSection = useInView();

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#050810] text-white">
      {/* ── 背景层 ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* 网格线 */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* 光晕 */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute top-[30%] left-[-100px] w-[400px] h-[400px] rounded-full bg-sky-500/10 blur-[100px] animate-pulse" />
        <div className="absolute top-[60%] right-[-80px] w-[350px] h-[350px] rounded-full bg-fuchsia-500/10 blur-[100px] animate-pulse [animation-delay:2s]" />
        {/* 扫描线 */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)",
          }}
        />
      </div>

      {/* ── 导航 ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-white/10 border border-white/15">
            <LoaderPinwheel className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-lg font-semibold tracking-wide text-white/90">
            Aria
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/55">
          <a href="#features" className="hover:text-white transition-colors">
            功能
          </a>
          <a href="#cta" className="hover:text-white transition-colors">
            开始使用
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/lognin"
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2"
          >
            登录
          </Link>
          <Link
            href="/lognup"
            className="text-sm bg-white text-black font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
          >
            免费注册
          </Link>
          <Link
            href="/chat"
            className="text-sm bg-white text-black font-medium px-4 py-2 rounded-lg hover:bg-white/90 transition-colors"
          >
            进入聊天
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-28 pb-24">
        {/* 标签 */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-xs text-violet-300 animate-fade-in">
          <Sparkles className="w-3 h-3" />
          下一代 AI 工作助手，现已上线
        </div>

        {/* 主标题 */}
        <h1
          className="max-w-4xl text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight animate-fade-in [animation-delay:0.1s]"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <span className="text-white">与 </span>
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #a78bfa, #38bdf8, #f472b6)",
            }}
          >
            Aria
          </span>
          <span className="text-white"> 一起</span>
          <br />
          <span className="text-white/80">思考、执行、创造</span>
        </h1>

        {/* 副标题 */}
        <p
          className="mt-7 max-w-xl text-base md:text-lg text-white/45 leading-relaxed animate-fade-in [animation-delay:0.2s]"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          Aria 是你的 AI 工作伙伴，集智能对话、任务管理与资讯聚合于一体。
          帮你整理思路、拆解任务、过滤信息噪音，让深度工作真正发生。
        </p>

        {/* CTA 按钮 */}
        <div
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-fade-in [animation-delay:0.3s]"
          style={{ opacity: 0, animationFillMode: "forwards" }}
        >
          <Link
            href="/lognup"
            className="group flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            免费开始使用
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="/lognin"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:border-white/25 transition-all"
          >
            已有账号，去登录
          </Link>
        </div>

        {/* 向下滚动提示 */}
        <a
          href="#features"
          className="mt-20 flex flex-col items-center gap-1 text-white/25 hover:text-white/50 transition-colors animate-bounce"
        >
          <span className="text-xs tracking-widest">SCROLL</span>
          <ChevronDown className="w-4 h-4" />
        </a>
      </section>

      {/* ── 功能特性 ── */}
      <section id="features" className="relative z-10 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          {/* 标题 */}
          <div
            ref={featuresSection.ref}
            className={`text-center mb-16 transition-all duration-700 ${featuresSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
          >
            <p className="text-xs tracking-[0.3em] text-violet-400/80 uppercase mb-3">
              核心能力
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-white/90">
              为深度工作而生
            </h2>
            <p className="mt-4 text-white/40 max-w-md mx-auto text-sm leading-relaxed">
              六大核心模块，覆盖你一天中最重要的工作场景
            </p>
          </div>

          {/* 卡片网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group relative rounded-2xl border p-6 bg-gradient-to-br ${f.color} ${f.border} backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:border-opacity-60
                  ${featuresSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
                style={{
                  transitionDelay: featuresSection.visible
                    ? `${i * 80}ms`
                    : "0ms",
                }}
              >
                {/* 光晕角 */}
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-30 transition-opacity bg-white" />

                <div
                  className={`mb-4 inline-flex p-2.5 rounded-xl bg-black/30 border border-white/10 ${f.iconColor}`}
                >
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white/90 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="cta" className="relative z-10 px-6 py-28">
        <div
          ref={ctaSection.ref}
          className={`mx-auto max-w-2xl text-center transition-all duration-700 ${ctaSection.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          {/* 发光边框卡片 */}
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-12 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-transparent to-sky-600/10 pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />

            <div className="relative z-10">
              <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/15">
                <LoaderPinwheel className="w-7 h-7 text-violet-400" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white/90 mb-4">
                立即开启你的
                <br />
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(90deg, #a78bfa, #38bdf8)",
                  }}
                >
                  AI 工作新方式
                </span>
              </h2>
              <p className="text-white/40 text-sm mb-8 leading-relaxed">
                注册即可免费体验全部功能，无需信用卡，30 秒完成注册。
              </p>
              <Link
                href="/lognup"
                className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-semibold text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                免费注册 Aria
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <p className="mt-4 text-xs text-white/25">
                已有超过 10,000 名用户正在使用
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/5 px-8 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-white/10 border border-white/15">
              <LoaderPinwheel className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-white/70">Aria AI</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <a href="#" className="hover:text-white/60 transition-colors">
              隐私政策
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              服务条款
            </a>
            <a href="#" className="hover:text-white/60 transition-colors">
              联系我们
            </a>
          </div>
          <p className="text-xs text-white/20">
            © 2026 Aria AI. All rights reserved.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.7s ease both;
        }
      `}</style>
    </div>
  );
}
