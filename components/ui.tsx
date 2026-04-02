// components/ui.tsx
import Link from "next/link";
import {
  ListTodo,
  MessageSquareQuote,
  Newspaper,
  UserPen,
  Settings,
  LoaderPinwheel,
} from "lucide-react";

const TOP_NAV = [
  { name: "对话助手", icon: MessageSquareQuote, href: "/chat" },
  { name: "Todo", icon: ListTodo, href: "/todo" },
  { name: "新闻", icon: Newspaper, href: "/news" },
];

const BOTTOM_NAV = [
  { name: "Profile", icon: UserPen, href: "/profile" },
  { name: "Setting", icon: Settings, href: "/setting" },
];

export default function UI({ main }: { main: React.ReactNode }) {
  return (
    <div
      className="relative flex h-dvh w-full overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #667eea 0%, #764ba2 30%, #f093fb 60%, #4facfe 100%)",
      }}
    >
      {/* 背景光晕装饰球 */}
      <div
        className="absolute w-96 h-96 rounded-full top-[-80px] left-[-80px] blur-3xl opacity-60"
        style={{ background: "radial-gradient(circle, #a78bfa, transparent)" }}
      />
      <div
        className="absolute w-80 h-80 rounded-full bottom-[-60px] left-32 blur-3xl opacity-50"
        style={{ background: "radial-gradient(circle, #38bdf8, transparent)" }}
      />
      <div
        className="absolute w-64 h-64 rounded-full top-1/2 left-20 blur-2xl opacity-40"
        style={{ background: "radial-gradient(circle, #f472b6, transparent)" }}
      />

      {/* 侧边栏 */}
      <aside
        className="sticky top-0 z-10 flex h-full w-64 flex-shrink-0 flex-col justify-between p-4"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "4px 0 24px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <div>
          <div className="mb-8 flex justify-center items-center gap-2">
            <div
              className="p-2 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.2)",
                boxShadow:
                  "0 2px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)",
              }}
            >
              <LoaderPinwheel className="w-7 h-7 text-white" />
            </div>
            <span
              className="text-2xl font-bold text-white tracking-wide"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.15)" }}
            >
              Aria
            </span>
          </div>

          {/* 主导航 */}
          <nav className="flex flex-col gap-3">
            {TOP_NAV.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  boxShadow:
                    "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.3)",
                  backdropFilter: "blur(8px)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
              >
                <item.icon className="w-5 h-5 opacity-90" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* 底部导航 */}
        <div className="flex flex-col gap-3">
          <div
            className="h-px w-full mb-1"
            style={{ background: "rgba(255,255,255,0.2)" }}
          />
          {BOTTOM_NAV.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-white text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.25)",
                backdropFilter: "blur(8px)",
              }}
            >
              <item.icon className="w-5 h-5 opacity-80" />
              {item.name}
            </Link>
          ))}
        </div>
      </aside>

      {/* 主内容区 —— 加 h-full，让子组件能正确继承高度 */}
      <main className="z-10 flex h-full min-h-0 flex-1 overflow-hidden p-4 text-white">
        {main}
      </main>
    </div>
  );
}
