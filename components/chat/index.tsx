// components/chat/index.tsx
"use client"; // 👉 声明这是一个客户端组件（Next.js App Router 必须）

import { useEffect, useMemo, useState } from "react"; // 👉 React hooks
import ChatCenter from "./center"; // 👉 左侧/中间对话列表组件
import ChatRight from "./right"; // 👉 右侧聊天窗口组件
import type { ChatConversation, ChatMessage } from "./types"; // 👉 类型定义

// 👉 快捷提示词（类似 ChatGPT 推荐问题）
const QUICK_PROMPTS = [
  "帮我整理今天的工作计划",
  "总结一下这个项目的开发思路",
  "给我一个学习 React 的七天计划",
  "写一段礼貌的中文邮件回复",
];

// 👉 获取所有对话接口返回类型
type ConversationsResponse = {
  ok: boolean;
  message?: string;
  conversations?: ChatConversation[];
};

// 👉 获取单个对话接口返回类型
type ConversationResponse = {
  ok: boolean;
  message?: string;
  conversation?: ChatConversation;
};

// 👉 流式返回事件（AI streaming）它定义了 后端流式返回的数据格式。
type StreamEvent =
  | { type: "chunk"; content: string } // 👉 一段内容（逐字返回）
  | { type: "done"; conversation: ChatConversation } // 👉 表示“整个回复结束了，并且后端把最终完整的 conversation 发回来了”
  | { type: "error"; message: string }; // 👉 表示流式过程出错：

// 👉 统一读取 JSON
async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

/**
 * 👉 按更新时间排序（最新在前）
 * [...conversations] 是先拷贝一份数组，再排序。因为 sort() 会修改原数组，
 */
function sortConversations(conversations: ChatConversation[]) {
  return [...conversations].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

/**
 * 👉 插入或更新对话（类似 upsert）:如果存在就更新，不存在就插入
 * 1. 先把数组里和 nextConversation.id 一样的旧会话删掉
 * 2. 再把新的 nextConversation 插到前面
 * 3. 最后重新排序
 */
function upsertConversation(
  conversations: ChatConversation[],
  nextConversation: ChatConversation,
) {
  const filtered = conversations.filter(
    (conversation) => conversation.id !== nextConversation.id, // 👉 去掉旧的
  );

  return sortConversations([nextConversation, ...filtered]); // 👉 插入新数据并排序
}

/**
 * 👉 用于创建一条 本地临时消息
 *
 * 用途
 * 1. 用户刚点发送时，先本地插入一条 user 消息
 * 2. 同时先插入一条空的 assistant 消息，后面流式拼接内容
 *
 * 为什么要本地生成？因为这样页面会立刻看到变化，不用等后端返回。
 */
function createLocalMessage(
  role: ChatMessage["role"],
  content: string,
): ChatMessage {
  return {
    id: `local-${crypto.randomUUID()}`, // 👉 本地生成 id
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 它是流式拼接的核心辅助函数 只更新某个会话里的某一条消息
 *
 *
 */
function updateConversationMessage(
  conversation: ChatConversation,
  messageId: string,
  updater: (message: ChatMessage) => ChatMessage,
) {
  return {
    ...conversation,
    messages: conversation.messages.map(
      (message) => (message.id === messageId ? updater(message) : message), // 👉 只更新目标 message
    ),
  };
}

export default function Chat() {
  // 👉 保存 所有会话列表。
  const [conversations, setConversations] = useState<ChatConversation[]>([]);

  // 👉 当前选中的会话 id。
  const [activeId, setActiveId] = useState<string>("");

  // 👉 输入框草稿内容。用户在右侧输入框里打字时，内容就存在这里。
  const [draft, setDraft] = useState("");

  // 👉 表示页面是否还在 初始化加载。
  // 初始进入页面时：
  // 要先读历史会话
  // 如果没有会话，还要自动创建一个
  // 这个过程还没结束前，可以认为页面在 booting
  const [isBooting, setIsBooting] = useState(true);

  // 👉 是否正在回复（防止重复发送）
  const [isReplying, setIsReplying] = useState(false);

  // 👉 初始化失败，创建会话失败，删除失败，发送失败
  const [error, setError] = useState("");

  // 👉 初始化加载对话
  useEffect(() => {
    let cancelled = false; // 👉 防止组件卸载后 setState

    async function loadConversations() {
      setIsBooting(true); //页面进入加载状态
      setError(""); // 清空旧错误

      try {
        // 👉 获取所有对话
        const response = await fetch("/api/chat/conversations", {
          cache: "no-store", // 👉 不缓存
        });
        const data = await readJson<ConversationsResponse>(response);

        //这里判断了两层：response.ok：HTTP 层是否成功  data.ok：业务层是否成功
        if (!response.ok || !data.ok) {
          throw new Error(data.message || "读取对话失败");
        }

        //如果后端没返回 conversations，就用空数组。
        const loaded = sortConversations(data.conversations ?? []);

        if (cancelled) return;

        // 👉 有数据
        if (loaded.length > 0) {
          setConversations(loaded);

          // 👉 设置当前 activeId（如果不存在就选第一个）
          setActiveId((current) =>
            loaded.some((conversation) => conversation.id === current)
              ? current
              : loaded[0].id,
          );
          return;
        }

        // 👉 没有对话 → 创建一个
        const createdConversation = await createConversationRequest();

        if (cancelled) return;

        setConversations([createdConversation]);
        setActiveId(createdConversation.id);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "初始化对话失败",
          );
        }
      } finally {
        // 无论成功失败，都要结束初始化状态。
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void loadConversations();

    return () => {
      cancelled = true; // 👉 组件卸载标记
    };
  }, []);

  // 👉 当前选中的对话对象
  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeId) ?? null,
    [activeId, conversations],
  );

  // 👉 创建对话请求
  async function createConversationRequest() {
    const response = await fetch("/api/chat/conversations", {
      method: "POST",
    });
    const data = await readJson<ConversationResponse>(response);

    if (!response.ok || !data.ok || !data.conversation) {
      throw new Error(data.message || "创建对话失败");
    }

    return data.conversation;
  }

  /**
   * 👉 点击“新建对话”
   * 1. 清空错误
   * 2. 调后端创建一个新会话
   * 3. 插入到本地会话列表
   * 4. 切换到这个新会话
   * 5. 清空输入框
   * */
  async function handleCreateConversation() {
    setError("");

    try {
      const nextConversation = await createConversationRequest();
      setConversations((current) =>
        upsertConversation(current, nextConversation),
      );
      setActiveId(nextConversation.id);
      setDraft(""); // 👉 清空输入框
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "创建对话失败",
      );
    }
  }

  /**
   * 👉 选择对话
   * 左边点击某个会话时，把它的 id 设成当前选中 id。
   * 然后右边会根据 activeConversation 自动切换显示内容。
   */
  function handleSelectConversation(id: string) {
    setActiveId(id);
  }

  // 👉 删除对话
  async function handleDeleteConversation(id: string) {
    setError("");

    try {
      const response = await fetch(`/api/chat/conversations/${id}`, {
        method: "DELETE",
      });
      const data = await readJson<{ ok: boolean; message?: string }>(response);

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "删除对话失败");
      }

      // 👉 删除本地数据
      const filtered = conversations.filter(
        (conversation) => conversation.id !== id,
      );

      //如果剩下还有其他会话：1. 更新会话列表 2. 如果删掉的是当前选中的那个 3.  就切到第一个会话
      if (filtered.length > 0) {
        setConversations(filtered);

        // 👉 如果删除的是当前对话 → 切换
        if (id === activeId) {
          setActiveId(filtered[0].id);
        }

        return;
      }

      // 👉 如果删光了 → 新建一个
      const fallbackConversation = await createConversationRequest();
      setConversations([fallbackConversation]);
      setActiveId(fallbackConversation.id);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除对话失败",
      );
    }
  }

  /**
   * 作用很简单：
   * 1.用户点某个快捷问题
   * 2.直接把这个文本填进输入框
   */
  function handleUsePrompt(prompt: string) {
    setDraft(prompt);
  }

  /**
   * 👉 发送消息
   * 输入校验
   * optimistic UI
   * 请求后端
   * 读取流式返回
   * 拼接 AI 回复
   * done 时落库后的最终同步
   * 失败回滚
   */
  async function handleSendMessage(content?: string) {
    //直接传入 content  没传就用输入框里的 draft
    const value = (content ?? draft).trim();

    // 👉 防御：1. 没内容 2. 当前没选中会话 3. AI 正在回复中 4. 页面还在初始化中
    if (!value || !activeConversation || isReplying || isBooting) {
      return;
    }

    //清掉旧错误 标记当前正在回复 清空输入框
    setError("");
    setIsReplying(true);
    setDraft("");

    // 👉创建两条本地临时消息
    const optimisticMessage = createLocalMessage("user", value);
    const streamingAssistantMessage = createLocalMessage("assistant", "");

    //这里相当于“先假装这次发送已经成功了”。
    const optimisticConversation: ChatConversation = {
      //a. 继承原会话
      ...activeConversation,
      //b. 可能更新标题
      title:
        activeConversation.messages.length <= 1
          ? value.slice(0, 18) || "新的对话" // 👉 第一条消息作为标题
          : activeConversation.title,
      //c. 更新时间改成当前
      updatedAt: streamingAssistantMessage.createdAt,
      //d. 把两条临时消息追加进去
      messages: [
        ...activeConversation.messages,
        optimisticMessage,
        streamingAssistantMessage,
      ],
    };

    /**
     * 先把 optimistic UI 渲染出来 这就是聊天应用“秒响应体验”的关键。
     *
     * 这一步一执行，页面立刻就会看到：
     * 1. 用户消息已经出现
     * 2. AI 已经有一条空白回复位
     */
    setConversations((current) =>
      upsertConversation(current, optimisticConversation),
    );

    try {
      // 👉 请求 AI
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          //conversationId：当前在哪个会话里聊天.也就是说后端会知道“这条消息属于哪个会话”。
          conversationId: activeConversation.id,
          //content：用户发的内容
          content: value,
        }),
      });

      //检查响应是否可流式读取
      if (!response.ok || !response.body) {
        const data = await readJson<{ ok?: boolean; message?: string }>(
          response,
        );
        throw new Error(data.message || "发送消息失败");
      }

      //用来一段一段读取后端流数据。
      const reader = response.body.getReader(); // 👉 读取流
      //把二进制 chunk 解码成字符串。
      const decoder = new TextDecoder();
      //用于处理“半截 JSON 行”的问题。
      let buffer = "";
      //用于保存最终 done 事件带回来的完整 conversation。
      let finalConversation: ChatConversation | null = null;

      /**
       * 这就是标准流式读取模式：
       * 1. 每次读一小块
       * 2. 直到 done === true
       */
      while (true) {
        const { done, value: chunkValue } = await reader.read();

        if (done) break;

        //因为一次读到的可能不是一整行完整 JSON。所以不能直接 JSON.parse，而是先累计到 buffer 里。
        buffer += decoder.decode(chunkValue, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        //遍历每一行事件
        for (const line of lines) {
          if (!line.trim()) continue;

          //跳过空行，然后把每一行 JSON 转成 StreamEvent。
          const event = JSON.parse(line) as StreamEvent;

          //收到 chunk 时做什么  👉 拼接 AI 内容 流式拼接 AI 回复 的核心
          if (event.type === "chunk") {
            setConversations((current) =>
              current.map((conversation) =>
                conversation.id === activeConversation.id
                  ? updateConversationMessage(
                      conversation,
                      streamingAssistantMessage.id,
                      (message) => ({
                        ...message,
                        content: message.content + event.content, // 👉 拼接
                      }),
                    )
                  : conversation,
              ),
            );
            continue;
          }

          // 收到 done 时做什么 👉 完整返回
          if (event.type === "done") {
            finalConversation = event.conversation;
            setConversations((current) =>
              upsertConversation(current, event.conversation),
            );
            setActiveId(event.conversation.id);
            continue;
          }

          //收到 error 时做什么
          if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (!finalConversation) {
        throw new Error("回复已中断，请重试");
      }
    } catch (sendError) {
      // 👉 回滚
      setDraft(value);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeConversation.id
            ? activeConversation
            : conversation,
        ),
      );
      setError(sendError instanceof Error ? sendError.message : "发送消息失败");
    } finally {
      setIsReplying(false);
    }
  }

  // 👉 UI 渲染
  return (
    <div className="flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-md">
      <ChatCenter
        activeId={activeId}
        conversations={conversations}
        onCreateConversation={handleCreateConversation}
        onDeleteConversation={handleDeleteConversation}
        onSelectConversation={handleSelectConversation}
      />
      <ChatRight
        activeConversation={activeConversation}
        draft={draft}
        error={error}
        isBooting={isBooting}
        isReplying={isReplying}
        quickPrompts={QUICK_PROMPTS}
        onChangeDraft={setDraft}
        onSendMessage={handleSendMessage}
        onUsePrompt={handleUsePrompt}
      />
    </div>
  );
}
