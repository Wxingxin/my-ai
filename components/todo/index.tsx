"use client"; // 👉 客户端组件（用了 hooks + 事件）

import { useEffect, useMemo, useState } from "react"; // 👉 React hooks

/**
 * 这是一个工具函数，用来快速生成聊天消息对象。这样你就不用每次手动拼消息对象了。
 * 1. 比如你调用：
 *   createChatMessage("user", "帮我新增一个任务")
 * 2. 它可能会返回：
 *   { id: "xxx", role: "user", content: "帮我新增一个任务" }
 *
 */
import { createChatMessage } from "./constants"; // 👉 创建聊天消息工具函数
import { TodoAiPanel } from "./todo-ai-panel"; // 👉 AI 面板（右侧）
import { TodoListPanel } from "./todo-list-panel"; // 👉 Todo 列表（左侧）
import type {
  ChatMessage,
  TodoCategory,
  TodoItem,
  TodoPriority,
} from "./types"; // 👉 类型

type TodoFilter = "all" | "pending" | "done";

export default function Todo() {
  // 👉 所有 todo 数据
  const [todos, setTodos] = useState<TodoItem[]>([]);

  // 👉 当前筛选条件
  const [filter, setFilter] = useState<TodoFilter>("all");

  // 👉 新建 todo 输入
  const [newTitle, setNewTitle] = useState(""); //输入的任务标题
  const [newPriority, setNewPriority] = useState<TodoPriority>("medium"); //优先级
  const [newCategory, setNewCategory] = useState<TodoCategory>("other"); //分类

  // 👉 AI 输入框
  const [draft, setDraft] = useState("");

  // 👉 聊天记录（AI + 用户）
  const [messages, setMessages] = useState<ChatMessage[]>([
    createChatMessage(
      "assistant",
      "你可以直接让我帮你新增、完成、删除或整理 Todo，例如：帮我新增一个工作任务“整理周报”。",
    ),
  ]);

  const [isBooting, setIsBooting] = useState(true); // 👉 初始化中
  const [isSubmitting, setIsSubmitting] = useState(false); // 👉 请求中（防重复）
  const [error, setError] = useState(""); // 👉 错误信息

  // 👉 初始化加载 todos
  useEffect(() => {
    let cancelled = false; // 👉 防止组件卸载后 setState

    async function loadTodos() {
      setIsBooting(true);
      setError("");

      try {
        const response = await fetch("/api/todos", { cache: "no-store" }); // 👉 请求 todos
        const data = (await response.json()) as {
          ok?: boolean;
          todos?: TodoItem[];
          message?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.message || "读取 Todo 失败");
        }

        if (!cancelled) {
          setTodos(data.todos ?? []); // 👉 更新数据
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "读取 Todo 失败",
          );
        }
      } finally {
        if (!cancelled) {
          setIsBooting(false);
        }
      }
    }

    void loadTodos();

    return () => {
      cancelled = true; // 👉 清理
    };
  }, []);

  // 👉 根据 filter 过滤 todo（性能优化）
  const filteredTodos = useMemo(() => {
    if (filter === "all") {
      return todos;
    }

    if (filter === "pending") {
      return todos.filter((todo) => todo.status !== "done");
    }

    return todos.filter((todo) => todo.status === "done"); // 👉 只返回符合状态的
  }, [filter, todos]);

  /**
   * 这个函数是一个 通用响应处理器
   * 👉 通用刷新函数（所有 API 调用后复用）
   *
   * 1. 创建 Todo 2. 切换 Todo 状态 3.删除 Todo
   * 这三种请求成功后，都需要做同样的事：
   * 1. response.json()2.  判断成功失败 3. 更新 todos
   * 为了避免重复写三遍，就抽成了一个函数。
   */
  async function refreshFromResponse(response: Response) {
    const data = (await response.json()) as {
      ok?: boolean;
      todos?: TodoItem[];
      message?: string;
    };

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "请求失败");
    }

    setTodos(data.todos ?? []); // 👉 更新 todo 列表
  }

  // 👉 创建 todo
  async function handleCreateTodo() {
    const title = newTitle.trim();

    if (!title || isSubmitting) return; // 👉 防空 + 防重复

    //按钮可以变 disabled
    setIsSubmitting(true);
    //清空旧错误
    setError("");

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          priority: newPriority,
          category: newCategory,
        }),
      });

      //也就是读取后端返回的最新 todo 列表，然后 setTodos(...)。
      await refreshFromResponse(response); // 👉 刷新数据
      setNewTitle(""); // 👉 重置输入
      setNewPriority("medium");
      setNewCategory("other");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "创建 Todo 失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // 👉 切换完成状态
  async function handleToggleTodo(todo: TodoItem) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: todo.status === "done" ? "todo" : "done", // 👉 切换状态
        }),
      });

      await refreshFromResponse(response);
    } catch (toggleError) {
      setError(
        toggleError instanceof Error ? toggleError.message : "更新 Todo 失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // 👉 删除 todo
  async function handleDeleteTodo(todoId: string) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE",
      });

      await refreshFromResponse(response);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除 Todo 失败",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * 👉 AI 操作 todo（核心🔥）
   * 用户输入自然语言
   * handleAskAi()
   * 先把用户消息插入 messages
   * fetch("/api/todos/ai", POST, 携带完整上下文)
   * 后端理解意图并操作 todos
   * 返回 content + todos
   * setTodos(最新todos)
   * setMessages(追加 assistant 回复)
   * 左右两个面板同时重新渲染
   */
  async function handleAskAi() {
    const value = draft.trim();

    if (!value || isSubmitting) return;

    // 👉先创建用户消息对象
    //     比如用户输入：
    // 删除最旧的一条 Todo
    // 那这一步会生成一条用户消息对象。
    const userMessage = createChatMessage("user", value);

    //先把用户消息显示到界面上
    setMessages((current) => [...current, userMessage]);

    //清空输入框 + 进入提交态.用户发送后，输入框立即清空，进入“正在请求 AI”的状态
    setDraft("");
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/todos/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        /**
         * 为什么发的是整个 messages，不是只发当前一句？
         * 因为大语言模型需要上下文。
         *
         * 1. 用户：帮我新增一个工作任务“整理周报”
         * 2. AI：已添加
         * 3. 用户：把它标记成完成
         */
        body: JSON.stringify({
          //为什么这里写成 [...messages, userMessage]
          //所以为了确保发给后端的数据里一定包含刚刚那条用户消息，这里手动再拼一次：
          messages: [...messages, userMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        content?: string;
        todos?: TodoItem[];
        message?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.message || "Todo AI 请求失败");
      }

      setTodos(data.todos ?? []); // 👉 AI 返回新 todo 状态
      setMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          data.content || "操作已经完成，但这次没有生成说明。",
        ),
      ]); // 👉 插入 AI 回复
    } catch (aiError) {
      setError(aiError instanceof Error ? aiError.message : "Todo AI 请求失败");
      setMessages((current) => [
        ...current,
        createChatMessage(
          "assistant",
          "我暂时没能完成这次 Todo 操作，请稍后重试。",
        ),
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 w-full gap-4">
      {" "}
      {/* 👉 左右布局 */}
      <TodoListPanel
        todos={todos}
        filteredTodos={filteredTodos}
        filter={filter}
        newTitle={newTitle}
        newPriority={newPriority}
        newCategory={newCategory}
        isBooting={isBooting}
        isSubmitting={isSubmitting}
        onChangeFilter={setFilter}
        onChangeTitle={setNewTitle}
        onChangePriority={setNewPriority}
        onChangeCategory={setNewCategory}
        onCreateTodo={() => void handleCreateTodo()}
        onToggleTodo={(todo) => void handleToggleTodo(todo)}
        onDeleteTodo={(todoId) => void handleDeleteTodo(todoId)}
      />
      <TodoAiPanel
        messages={messages}
        draft={draft}
        error={error}
        isSubmitting={isSubmitting}
        onChangeDraft={setDraft}
        onUsePrompt={setDraft}
        onAskAi={() => void handleAskAi()}
      />
    </div>
  );
}
