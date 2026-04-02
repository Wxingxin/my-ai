export type TodoStatus = "todo" | "in_progress" | "done";
export type TodoPriority = "low" | "medium" | "high";

// | 值       | 含义 |
// | ------- | -- |
// | work    | 工作 |
// | study   | 学习 |
// | life    | 生活 |
// | health  | 健康 |
// | finance | 财务 |
// | other   | 其他 |
export type TodoCategory =
  | "work"
  | "study"
  | "life"
  | "health"
  | "finance"
  | "other";

export type TodoItem = {
  id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: TodoPriority;
  category: TodoCategory;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
