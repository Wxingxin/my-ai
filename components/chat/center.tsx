"use client"; // 声明这是一个客户端组件，因为下面用到了事件处理等客户端能力

import { MessageSquarePlus, Trash2 } from "lucide-react"; // 导入图标：新建对话、删除
import type { ChatConversation } from "./types"; // 导入对话类型定义，仅用于 TS 类型检查

function formatTime(value: string) {
  // 格式化时间字符串，用于显示会话更新时间
  return new Intl.DateTimeFormat("zh-CN", {
    // 使用中文地区格式化时间
    month: "numeric", // 月：数字形式
    day: "numeric", // 日：数字形式
    hour: "2-digit", // 小时：两位数
    minute: "2-digit", // 分钟：两位数
  }).format(new Date(value)); // 把传入的时间字符串转成 Date 再格式化
}

type ChatCenterProps = {
  // ChatCenter 组件接收的 props 类型
  activeId: string; // 当前选中的会话 id
  conversations: ChatConversation[]; // 所有会话列表
  onCreateConversation: () => void; // 点击“新建对话”时触发的方法
  onDeleteConversation: (id: string) => void; // 删除指定会话的方法
  onSelectConversation: (id: string) => void; // 选中某个会话的方法
};

export default function ChatCenter({
  // 默认导出左侧会话栏组件
  activeId, // 当前选中会话 id
  conversations, // 会话数组
  onCreateConversation, // 新建会话函数
  onDeleteConversation, // 删除会话函数
  onSelectConversation, // 选择会话函数
}: ChatCenterProps) {
  return (
    <aside className="flex h-full w-72 flex-shrink-0 flex-col border-r border-white/15 bg-slate-950/20">
      {" "}
      {/* 左侧边栏容器，固定宽度 72，纵向布局 */}
      <div className="border-b border-white/10 p-4">
        {" "}
        {/* 顶部区域，放“新建对话”按钮 */}
        <button
          type="button" // 明确按钮类型，防止在 form 中默认提交
          onClick={onCreateConversation} // 点击时调用父组件传入的新建对话方法
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/14 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/20"
        >
          <MessageSquarePlus className="h-4 w-4" /> {/* 新建对话图标 */}
          新建对话
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {" "}
        {/* 会话列表区域，占满剩余空间，可纵向滚动，并隐藏滚动条 */}
        <div className="mb-3 px-2 text-xs font-medium uppercase tracking-[0.24em] text-white/55">
          {" "}
          {/* 小标题 */}
          最近会话
        </div>
        <div className="space-y-2">
          {" "}
          {/* 每个会话卡片之间垂直间距 2 */}
          {conversations.map((conversation) => {
            // 遍历所有会话，渲染每一项
            const lastMessage =
              conversation.messages[conversation.messages.length - 1]; // 取当前会话的最后一条消息
            const isActive = conversation.id === activeId; // 判断当前会话是否为选中状态

            return (
              <div
                key={conversation.id} // React 列表渲染必须提供唯一 key
                className={`group rounded-2xl border transition ${
                  isActive // 如果当前项被选中
                    ? "border-white/25 bg-white/18" // 选中态样式：更明显的边框和背景
                    : "border-white/8 bg-white/[0.06] hover:bg-white/[0.11]" // 未选中态样式：默认淡色，hover 时变亮
                }`}
              >
                <button
                  type="button" // 按钮类型
                  onClick={() => onSelectConversation(conversation.id)} // 点击整个会话区域时，切换当前会话
                  className="block w-full px-4 py-3 text-left text-white"
                >
                  <div className="truncate text-sm font-semibold">
                    {conversation.title} {/* 显示会话标题，超出省略 */}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/65">
                    {lastMessage?.content ?? "开始一个新的话题"}{" "}
                    {/* 显示最后一条消息内容，如果没有消息就显示默认提示 */}
                  </div>
                  <div className="mt-2 text-[11px] text-white/45">
                    {formatTime(conversation.updatedAt)}{" "}
                    {/* 显示该会话更新时间 */}
                  </div>
                </button>

                <div className="px-4 pb-3">
                  {" "}
                  {/* 删除按钮区域 */}
                  <button
                    type="button" // 按钮类型
                    onClick={() => onDeleteConversation(conversation.id)} // 点击删除当前会话
                    className="flex items-center gap-1 text-xs text-white/45 transition hover:text-white/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {/* 删除图标 */}
                    删除
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
