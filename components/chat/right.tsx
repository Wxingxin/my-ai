"use client"; // 👉 客户端组件（用到了事件 + DOM 操作）
import { ArrowUp, Bot, Sparkles, UserRound } from "lucide-react"; // 👉 图标：发送按钮、AI、用户等
import { useEffect, useRef } from "react"; // 👉 hooks：副作用 + DOM 引用
import type { ChatConversation } from "./types"; // 👉 类型

function formatMessageTime(value: string) {
  // 👉 格式化消息时间（只显示时分）
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value)); // 👉 转成 Date 再格式化
}

function formatAssistantContent(content: string) {
  // 👉 清洗 AI 返回内容（去 markdown）
  return content
    .replace(
      /```[\s\S]*?```/g,
      (
        block, // 👉 去掉代码块 ``` ```
      ) =>
        block
          .replace(/^```[a-zA-Z0-9_-]*\n?/, "") // 👉 去掉 ```ts / ```js 等
          .replace(/```$/, "")
          .trim(),
    )
    .replace(/^#{1,6}\s*/gm, "") // 👉 去掉标题 # ##
    .replace(/\*\*(.*?)\*\*/g, "$1") // 👉 去掉加粗 **
    .replace(/\*(.*?)\*/g, "$1") // 👉 去掉斜体 *
    .replace(/`([^`]+)`/g, "$1") // 👉 去掉行内代码 `
    .replace(/^\s*[-*+]\s+/gm, "• ") // 👉 列表符号统一成 •
    .replace(/^\s*\d+\.\s+/gm, "• ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1") // 👉 去掉 markdown 链接
    .replace(/\n{3,}/g, "\n\n") // 👉 多余换行压缩
    .trim();
}

type ChatRightProps = {
  activeConversation: ChatConversation | null; // 👉 当前对话
  draft: string; // 👉 输入框内容
  error: string; // 👉 错误信息
  isBooting: boolean; // 👉 初始化中
  isReplying: boolean; // 👉 AI 回复中
  quickPrompts: string[]; // 👉 快捷提示词
  onChangeDraft: (value: string) => void; // 👉 输入改变
  onSendMessage: (content?: string) => void; // 👉 发送消息
  onUsePrompt: (prompt: string) => void; // 👉 使用快捷提示
};

export default function ChatRight({
  activeConversation,
  draft,
  error,
  isBooting,
  isReplying,
  quickPrompts,
  onChangeDraft,
  onSendMessage,
  onUsePrompt,
}: ChatRightProps) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null); // 👉 消息容器 DOM 引用（用于自动滚动）

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight, // 👉 滚动到底部
      behavior: "smooth", // 👉 平滑滚动
    });
  }, [activeConversation?.messages, isReplying]); // 👉 每次消息变化 or AI 回复时触发

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {" "}
      {/* 👉 右侧整体容器 */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        {" "}
        {/* 👉 顶部栏 */}
        <div>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Sparkles className="h-4 w-4" />
            Aria Chat {/* 👉 应用名 */}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {activeConversation?.title ?? "新的对话"} {/* 👉 当前对话标题 */}
          </h1>
        </div>
        <div className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
          {isBooting ? "正在同步" : isReplying ? "正在整理回复" : "在线"}{" "}
          {/* 👉 状态显示 */}
        </div>
      </header>
      {/* 消息列表 */}
      <div
        ref={messagesContainerRef} // 👉 绑定 ref
        className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {(activeConversation?.messages ?? []).map((message) => {
            // 👉 遍历消息
            const isUser = message.role === "user"; // 👉 是否用户消息
            const displayContent = isUser
              ? message.content
              : formatAssistantContent(message.content); // 👉 AI 内容清洗

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`} // 👉 用户靠右，AI靠左
              >
                {!isUser && ( // 👉 AI头像
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-3xl px-4 py-3 shadow-sm ${
                    isUser
                      ? "bg-white text-slate-900" // 👉 用户消息样式
                      : "border border-white/12 bg-slate-950/25 text-white" // 👉 AI消息样式
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-xs opacity-70">
                    {isUser ? (
                      <>
                        <UserRound className="h-3.5 w-3.5" />你{" "}
                        {/* 👉 用户标识 */}
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        Aria {/* 👉 AI标识 */}
                      </>
                    )}
                  </div>

                  <div className="whitespace-pre-wrap text-sm leading-6">
                    {displayContent} {/* 👉 内容 */}
                  </div>

                  <div className="mt-2 text-[11px] opacity-55">
                    {formatMessageTime(message.createdAt)} {/* 👉 时间 */}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 👉 AI思考中提示 */}
          {isReplying &&
            !(activeConversation?.messages.at(-1)?.role === "assistant") && (
              <div className="flex gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="rounded-3xl border border-white/12 bg-slate-950/25 px-4 py-3 text-sm text-white">
                  Aria 正在思考...
                </div>
              </div>
            )}
        </div>
      </div>
      {/* 👉 输入区域 */}
      <div className="border-t border-white/10 px-6 py-4">
        <div className="mx-auto max-w-4xl">
          {/* 👉 快捷提示 */}
          <div className="mb-3 flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
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
          <div className="rounded-[28px] border border-white/15 bg-slate-950/25 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
            <textarea
              value={draft} // 👉 输入内容
              onChange={(event) => onChangeDraft(event.target.value)} // 👉 更新输入
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  // 👉 Enter发送
                  event.preventDefault();
                  onSendMessage();
                }
              }}
              placeholder="输入你的问题，Enter 发送，Shift + Enter 换行"
              className="min-h-14 w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isBooting || isReplying || !activeConversation} // 👉 禁用条件
            />

            <div className="mt-2 flex items-center justify-between">
              <div
                className={`text-xs ${error ? "text-rose-200" : "text-white/45"}`}
              >
                {error || "对话已存入数据库，刷新后仍会保留"}{" "}
                {/* 👉 错误 or 提示 */}
              </div>

              <button
                type="button"
                onClick={() => onSendMessage()} // 👉 点击发送
                disabled={
                  !draft.trim() ||
                  isReplying ||
                  isBooting ||
                  !activeConversation
                }
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" /> {/* 👉 发送图标 */}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
