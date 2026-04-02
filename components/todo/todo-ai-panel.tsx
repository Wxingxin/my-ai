"use client"; // 👉 客户端组件（涉及交互 + DOM）

import { ArrowUp, Bot, UserRound } from "lucide-react"; // 👉 图标：发送、AI、用户
import { useEffect, useRef } from "react"; // 👉 hooks

import { QUICK_PROMPTS } from "./constants"; // 👉 快捷提示词
import type { ChatMessage } from "./types"; // 👉 类型

type TodoAiPanelProps = {
  messages: ChatMessage[]; // 👉 聊天记录
  draft: string; // 👉 输入框内容
  error: string; // 👉 错误信息
  isSubmitting: boolean; // 👉 是否请求中
  onChangeDraft: (value: string) => void; // 👉 输入变化
  onUsePrompt: (value: string) => void; // 👉 点击快捷提示
  onAskAi: () => void; // 👉 发送请求
};

export function TodoAiPanel({
  messages,
  draft,
  error,
  isSubmitting,
  onChangeDraft,
  onUsePrompt,
  onAskAi,
}: TodoAiPanelProps) {
  // 👉 用于自动滚动到底部
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    // 👉 每次 messages 或 isSubmitting 变化 → 滚动到底部
  }, [messages, isSubmitting]);

  return (
    <aside className="flex min-h-0 w-[360px] flex-shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/10 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      {/* 👉 头部 */}
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Bot className="h-4 w-4" />
          Todo AI
        </div>

        <h2 className="mt-2 text-2xl font-semibold">侧边助手</h2>

        <p className="mt-2 text-sm leading-6 text-white/70">
          直接和 AI 说你的任务安排，它会帮你操作 Todo。
        </p>
      </div>

      {/* 👉 聊天区 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-4">
          {messages.map((message) => {
            const isUser = message.role === "user"; // 👉 判断角色

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`} // 👉 用户右，AI左
              >
                {!isUser && ( // 👉 AI头像
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 ${
                    isUser
                      ? "bg-white text-slate-900" // 👉 用户消息
                      : "border border-white/12 bg-slate-950/25 text-white" // 👉 AI消息
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                    {isUser ? (
                      <>
                        <UserRound className="h-3.5 w-3.5" />你
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        Todo AI
                      </>
                    )}
                  </div>

                  <div className="whitespace-pre-wrap">
                    {message.content} {/* 👉 内容 */}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 👉 AI处理中提示 */}
          {isSubmitting && (
            <div className="flex gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-3xl border border-white/12 bg-slate-950/25 px-4 py-3 text-sm text-white">
                正在处理你的 Todo 请求...
              </div>
            </div>
          )}

          {/* 👉 滚动锚点 */}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* 👉 输入区 */}
      <div className="border-t border-white/10 px-5 py-4">
        {/* 👉 快捷提示 */}
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onUsePrompt(prompt)} // 👉 点击填入输入框
              className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.16]"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* 👉 输入框 */}
        <div className="rounded-[24px] border border-white/15 bg-slate-950/25 p-3">
          <textarea
            value={draft}
            onChange={(event) => onChangeDraft(event.target.value)} // 👉 输入变化
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onAskAi(); // 👉 Enter发送
              }
            }}
            placeholder="例如：新增一个学习任务，标题是复习 React，优先级高"
            className="min-h-24 w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/40"
            disabled={isSubmitting} // 👉 请求中禁用
          />

          <div className="mt-3 flex items-center justify-between">
            <div
              className={`text-xs ${error ? "text-rose-200" : "text-white/45"}`}
            >
              {error || "AI 会直接操作数据库中的 Todo"} {/* 👉 错误 or 提示 */}
            </div>

            {/* 👉 发送按钮 */}
            <button
              type="button"
              onClick={onAskAi}
              disabled={!draft.trim() || isSubmitting}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
