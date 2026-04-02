// components/news/index.tsx
"use client";

import { ArrowUp, Bot, Newspaper, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NewsMessage = {
  id: string;
  role: "user" | "assistant"; //"user"：用户  "assistant"：AI 助手
  content: string; //用户消息："最近 AI 行业有什么热点" 助手消息："最近 AI 领域主要有以下几件大事..."
};

//快捷提示词
const QUICK_PROMPTS = [
  "总结今天的科技新闻",
  "最近 AI 行业有什么热点",
  "帮我看看今天的财经新闻",
  "最近有哪些国际大事值得关注",
];

/**
 * 这是一个消息工厂函数，专门用来创建聊天消息对象
 * 因为每次创建消息都需要：
 *一个唯一 id
 *一个 role
 *一个 content
 *如果不封装，每次都要重复写
 */

function createMessage(
  role: NewsMessage["role"],
  content: string,
): NewsMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
  };
}

export default function News() {
  const [messages, setMessages] = useState<NewsMessage[]>([
    createMessage(
      "assistant",
      "告诉我你想了解哪一类新闻，我会先查相关新闻，再帮你整理成简洁易懂的总结。",
    ),
  ]);
  //表示输入框当前内容。
  const [draft, setDraft] = useState("");

  //表示当前是否正在请求 AI 新闻结果。
  // true：正在请求，禁用输入和按钮，并显示“正在检索新闻并整理总结...”
  // false：请求结束，可以继续输入
  const [isLoading, setIsLoading] = useState(false);

  //比如接口请求失败时，页面底部会显示：
  const [error, setError] = useState("");

  //用于自动滚动到底部。 它会绑定到消息列表最末尾的一个空 div：
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  //只要 messages 或 isLoading 变化，就自动把底部元素滚动到可见区域。
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isLoading]);

  async function handleSendMessage(content?: string) {
    const value = (content ?? draft).trim();

    if (!value || isLoading) {
      return;
    }

    setError("");
    setDraft("");

    /**
     * 先把用户消息插入聊天列表
     *
     * 这里很关键。先创建一条用户消息，然后立刻显示到页面上，再开始请求后端。
     * 因为聊天 UI 要有“即时反馈”。如果用户发了消息，要立刻在界面看到自己的话，而不是等后端返回后再显示。
     */
    const userMessage = createMessage("user", value);
    setMessages((current) => [...current, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/news", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        content?: string;
        message?: string;
      };

      if (!response.ok || !data.ok || !data.content) {
        throw new Error(data.message || "新闻回答失败");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.content ?? ""),
      ]);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "新闻回答失败");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center p-2">
      <section className="flex h-full min-h-0 w-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white/10 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
        <header className="border-b border-white/10 px-6 py-5">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <Newspaper className="h-4 w-4" />
            News AI
          </div>
          <h1 className="mt-2 text-3xl font-semibold">新闻助手</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">
            输入一个主题或直接问“今天有什么热点”，我会先检索新闻，再帮你总结重点。
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                      <Bot className="h-5 w-5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-3xl px-4 py-3 shadow-sm ${
                      isUser
                        ? "bg-white text-slate-900"
                        : "border border-white/12 bg-slate-950/25 text-white"
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
                          新闻助手
                        </>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-300/15 text-cyan-50">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="rounded-3xl border border-white/12 bg-slate-950/25 px-4 py-3 text-sm text-white">
                  正在检索新闻并整理总结...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-white/10 px-6 py-5">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setDraft(prompt)}
                  className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2 text-xs text-white/80 transition hover:bg-white/[0.16]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="rounded-[28px] border border-white/15 bg-slate-950/25 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)]">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
                placeholder="例如：帮我总结今天的科技新闻"
                className="min-h-24 w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/40"
                disabled={isLoading}
              />

              <div className="mt-3 flex items-center justify-between">
                <div
                  className={`text-xs ${error ? "text-rose-200" : "text-white/45"}`}
                >
                  {error || "AI 会先检索新闻，再用自然语言为你总结"}
                </div>

                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!draft.trim() || isLoading}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowUp className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
