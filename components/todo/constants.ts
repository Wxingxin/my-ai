import type { TodoCategory, TodoPriority } from "./types"; // 👉 导入类型：分类 / 优先级（仅类型，不参与运行）

// 👉 状态筛选（用于 UI 过滤 todo）
export const FILTERS: Array<{
  key: "all" | "pending" | "done";
  label: string;
}> = [
  { key: "all", label: "全部" }, // 👉 显示全部
  { key: "pending", label: "未完成" }, // 👉 未完成
  { key: "done", label: "已完成" }, // 👉 已完成
];

// 👉 AI 快捷提示词（用户点击后直接生成请求）
export const QUICK_PROMPTS = [
  "帮我列出当前所有待办", // 👉 查询所有 todo
  "新增一个工作 todo：整理周报，优先级高", // 👉 创建 todo
  "把已完成的任务告诉我", // 👉 查询已完成
  "帮我删除最旧的一条 todo", // 👉 删除 todo
];

// 👉 优先级选项（用于表单 / 展示）
export const PRIORITY_OPTIONS: Array<{ value: TodoPriority; label: string }> = [
  { value: "high", label: "高" }, // 👉 高优先级
  { value: "medium", label: "中" }, // 👉 中优先级
  { value: "low", label: "低" }, // 👉 低优先级
];

// 👉 分类选项（用于表单 / 标签展示）
export const CATEGORY_OPTIONS: Array<{ value: TodoCategory; label: string }> = [
  { value: "work", label: "工作" }, // 👉 工作类
  { value: "study", label: "学习" }, // 👉 学习类
  { value: "life", label: "生活" }, // 👉 生活类
  { value: "health", label: "健康" }, // 👉 健康类
  { value: "finance", label: "财务" }, // 👉 财务类
  { value: "other", label: "其他" }, // 👉 其他
];

// 👉 创建一条聊天消息（用于 chat 系统）
export function createChatMessage(role: "user" | "assistant", content: string) {
  return {
    id: crypto.randomUUID(), // 👉 生成唯一 id（浏览器原生 API）
    role, // 👉 消息角色（用户 or AI）
    content, // 👉 消息内容
  } as const; // 👉 固定类型（readonly，防止被修改）
}

// 👉 格式化时间（用于 todo / chat 展示）
export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", // 👉 月
    day: "numeric", // 👉 日
    hour: "2-digit", // 👉 时
    minute: "2-digit", // 👉 分
  }).format(new Date(value)); // 👉 转换时间字符串
}

// 👉 根据 priority 值获取中文 label
export function priorityLabel(priority: TodoPriority) {
  return (
    PRIORITY_OPTIONS.find((item) => item.value === priority)?.label ?? "中"
  );
  // 👉 找到对应 label，如果找不到默认返回“中”
}

// 👉 根据 category 值获取中文 label
export function categoryLabel(category: TodoCategory) {
  return (
    CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? "其他"
  );
  // 👉 找不到就返回“其他”
}
