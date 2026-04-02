"use client"; // 👉 客户端组件（有事件交互）

import { CheckCircle2, Circle, ListTodo, Plus, Trash2 } from "lucide-react"; // 👉 图标：完成/未完成/标题/新增/删除

import {
  CATEGORY_OPTIONS, // 👉 分类下拉数据
  FILTERS, // 👉 筛选按钮（全部/进行中/完成）
  PRIORITY_OPTIONS, // 👉 优先级下拉
  categoryLabel, // 👉 分类中文转换
  formatDateTime, // 👉 时间格式化
  priorityLabel, // 👉 优先级中文转换
} from "./constants";

import type { TodoCategory, TodoItem, TodoPriority } from "./types"; // 👉 类型

type TodoFilter = "all" | "pending" | "done";

type TodoListPanelProps = {
  todos: TodoItem[]; // 👉 全部 todos
  filteredTodos: TodoItem[]; // 👉 已过滤后的 todos
  filter: TodoFilter; // 👉 当前筛选状态
  newTitle: string; // 👉 输入框
  newPriority: TodoPriority; // 👉 新建优先级
  newCategory: TodoCategory; // 👉 新建分类
  isBooting: boolean; // 👉 初始化中
  isSubmitting: boolean; // 👉 请求中
  onChangeFilter: (value: TodoFilter) => void; // 👉 切换筛选
  onChangeTitle: (value: string) => void; // 👉 输入框变化
  onChangePriority: (value: TodoPriority) => void; // 👉 优先级变化
  onChangeCategory: (value: TodoCategory) => void; // 👉 分类变化
  onCreateTodo: () => void; // 👉 创建 todo
  onToggleTodo: (todo: TodoItem) => void; // 👉 切换状态
  onDeleteTodo: (todoId: string) => void; // 👉 删除
};

export function TodoListPanel({
  todos,
  filteredTodos,
  filter,
  newTitle,
  newPriority,
  newCategory,
  isBooting,
  isSubmitting,
  onChangeFilter,
  onChangeTitle,
  onChangePriority,
  onChangeCategory,
  onCreateTodo,
  onToggleTodo,
  onDeleteTodo,
}: TodoListPanelProps) {
  // 👉 统计：未完成数量
  const pendingCount = todos.filter((todo) => todo.status !== "done").length;

  // 👉 统计：已完成数量
  const completedCount = todos.filter((todo) => todo.status === "done").length;

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/10 p-5 text-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      {/* 👉 顶部区域 */}
      <header className="border-b border-white/10 pb-5">
        <div className="flex items-center gap-2 text-sm text-white/70">
          <ListTodo className="h-4 w-4" />
          Todo
        </div>

        <h1 className="mt-2 text-3xl font-semibold">任务清单</h1>

        {/* 👉 统计信息 */}
        <p className="mt-2 text-sm text-white/70">
          {pendingCount} 个待处理，{completedCount} 个已完成
        </p>

        {/* 👉 新建 Todo 表单 */}
        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
          {/* 👉 输入标题 */}
          <input
            value={newTitle}
            onChange={(event) => onChangeTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                // 👉 回车直接创建
                event.preventDefault();
                onCreateTodo();
              }
            }}
            placeholder="快速新增一个 Todo"
            className="rounded-2xl border border-white/15 bg-slate-950/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40"
          />

          {/* 👉 优先级选择 */}
          <select
            //当前选中的优先级由父组件控制。
            value={newPriority}
            // 当用户选择新的优先级时，把新值传回父组件。
            onChange={(event) =>
              onChangePriority(event.target.value as TodoPriority)
            }
            className="rounded-2xl border border-white/15 bg-slate-950/20 px-4 py-3 text-sm text-white outline-none"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-900"
              >
                优先级 {option.label}
              </option>
            ))}
          </select>

          {/* 👉 分类选择 */}
          <select
            value={newCategory}
            onChange={(event) =>
              onChangeCategory(event.target.value as TodoCategory)
            }
            className="rounded-2xl border border-white/15 bg-slate-950/20 px-4 py-3 text-sm text-white outline-none"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className="bg-slate-900"
              >
                分类 {option.label}
              </option>
            ))}
          </select>

          {/* 👉 添加按钮 */}
          <button
            type="button"
            onClick={onCreateTodo}
            disabled={!newTitle.trim() || isSubmitting} // 👉 禁用条件
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
      </header>

      {/* 👉 筛选按钮 */}
      <div className="mt-5 flex gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChangeFilter(item.key)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              filter === item.key
                ? "border-white/25 bg-white/18 text-white" // 👉 选中态
                : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]" // 👉 未选中态
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* 👉 Todo 列表 */}
      <div className="mt-5 flex-1 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-3">
          {filteredTodos.map((todo) => (
            <article
              key={todo.id}
              className="rounded-3xl border border-white/12 bg-slate-950/20 p-4"
            >
              <div className="flex items-start gap-3">
                {/* 👉 勾选按钮 */}
                <button
                  type="button"
                  onClick={() => onToggleTodo(todo)}
                  className="mt-1 text-white/80"
                >
                  {todo.status === "done" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" /> // 👉 已完成
                  ) : (
                    <Circle className="h-5 w-5" /> // 👉 未完成
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  {/* 👉 标题 + 删除 */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2
                        className={`text-base font-semibold ${
                          todo.status === "done"
                            ? "text-white/55 line-through" // 👉 已完成样式
                            : "text-white"
                        }`}
                      >
                        {todo.title}
                      </h2>

                      {/* 👉 描述 */}
                      {todo.description && (
                        <p className="mt-1 text-sm leading-6 text-white/65">
                          {todo.description}
                        </p>
                      )}
                    </div>

                    {/* 👉 删除按钮 */}
                    <button
                      type="button"
                      onClick={() => onDeleteTodo(todo.id)}
                      className="text-white/45 transition hover:text-rose-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* 👉 标签区域 */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/65">
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                      {categoryLabel(todo.category)} {/* 👉 分类 */}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                      优先级 {priorityLabel(todo.priority)} {/* 👉 优先级 */}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                      {todo.status === "done" ? "已完成" : "未完成"}{" "}
                      {/* 👉 状态 */}
                    </span>

                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1">
                      创建于 {formatDateTime(todo.createdAt)} {/* 👉 时间 */}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {/* 👉 空状态 */}
          {!isBooting && filteredTodos.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/[0.04] px-5 py-8 text-center text-sm text-white/60">
              当前筛选下还没有 Todo
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
