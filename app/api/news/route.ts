// app/api/news/route.ts

import { callModel } from "@/lib/models";
// 👉 调用大模型的统一方法（封装了 OpenAI / DeepSeek / Claude 等）

import { resolveProvider } from "@/lib/models/provider";
// 👉 根据传入的 provider 字符串，解析出具体使用哪个 AI 提供商

import { Message } from "@/lib/models/types/ai";
// 👉 聊天消息类型定义（role + content）

import { getNews } from "@/lib/tools/news";
// 👉 获取新闻数据的工具函数（内部可能调用 NewsAPI）

import { validateSession } from "@/lib/vaildateSession";
// 👉 校验用户是否登录（session）

const NEWS_SYSTEM_PROMPT = `
// 👉 给 AI 的系统提示词（控制 AI 行为）
你是 Aria 的新闻助手。
回答要求：
- 只使用中文回答。
- 用户问新闻、热点、资讯、某个主题的近期动态时，优先调用 get_news。
- 拿到新闻结果后，用自然语言总结重点，不要输出原始 JSON。
- 回复给普通用户看，不要使用 Markdown 标题、代码块、复杂结构。
- 可以按“发生了什么、为什么值得关注、你可以重点看什么”来组织。
- 如果新闻结果为空，要明确告诉用户暂时没有查到相关新闻。
`;

/**
 *👉 从用户输入中提取“新闻关键词”
 * 例如：
 * - 输入：帮我看看最近的AI新闻 → 输出：AI
 * - 输入：有什么热点吗？ → 输出：""（空字符串，表示查通用新闻）
 * - 输入：总结一下 → 输出：""（空字符串，表示查通用新闻）
 * - 输入：帮我查一下关于“气候变化”的新闻 → 输出：气候变化
 *
 * 这个函数通过一系列正则表达式去掉口语化词汇、时间词和“新闻”类词，最终提取出干净的关键词供 getNews 使用。
 */
function extractKeyword(input: string) {
  const text = input.trim();
  // 去掉前后空格

  if (!text) {
    return ""; // 空输入直接返回空关键词
  }

  const genericPatterns = [
    /今天有什么新闻/u,
    /最近有什么新闻/u,
    /新闻/u,
    /热点/u,
    /资讯/u,
    /头条/u,
  ];
  // 👉 一些“泛化提问”（没有具体主题）

  if (
    genericPatterns.some((pattern) => pattern.test(text)) &&
    text.length <= 12
  ) {
    return "";
    // 👉 如果是“泛问题”（如：最近新闻）→ 返回空关键词（查通用新闻）
  }

  return text
    .replace(/帮我(看看|总结|查一下)?/gu, "") // 去掉口语词
    .replace(/(今天|最近|近期|最新)的?/gu, "") // 去掉时间词
    .replace(/(新闻|资讯|热点|头条|动态)/gu, "") // 去掉“新闻”类词
    .replace(/是?什么/gu, "") // 去掉疑问句尾
    .trim();
  // 👉 最终得到干净关键词（比如：AI发展）
}

export async function POST(req: Request) {
  // 👉 Next.js API Route（POST 请求）

  const sessionResult = await validateSession();
  // 👉 校验用户是否登录

  if (!sessionResult.ok) {
    return Response.json(
      { ok: false, message: sessionResult.message },
      { status: sessionResult.status },
    );
    // 👉 未登录直接返回错误
  }

  try {
    const {
      messages,
      provider,
    }: {
      messages: Message[];
      provider?: string;
    } = await req.json();
    // 👉 前端传入：聊天消息 + 可选 provider

    const resolvedProvider = resolveProvider(provider);
    // 👉 解析 AI provider（比如 openai / deepseek）

    if (!resolvedProvider) {
      return Response.json(
        {
          ok: false,
          message:
            "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
        },
        { status: 500 },
      );
      // 👉 provider 不存在（环境变量没配置）
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");
    // 👉 获取“最后一条用户消息”（用于提取关键词）

    const keyword = extractKeyword(latestUserMessage?.content ?? "");
    // 👉 提取关键词（可能为空）

    const newsItems = await getNews(keyword);
    // 👉 调用新闻 API 获取数据

    const fullMessages: Message[] = [
      {
        role: "system",
        content:
          NEWS_SYSTEM_PROMPT +
          `\n你已经通过 get_news 工具拿到了新闻结果，请基于结果回答，不要再次要求用户提供关键词。`,
        // 👉 强化提示：告诉 AI 已经拿到新闻，不要再问
      },
      ...messages,
      {
        role: "system",
        content: `以下是通过 NewsAPI.org 获取到的新闻数据：${JSON.stringify(
          newsItems,
        )}`,
        // 👉 把新闻数据“注入给 AI”
        // ⚠️ 这是关键：让 AI 基于真实数据总结
      },
    ];

    const response = await callModel(fullMessages, undefined, resolvedProvider);
    // 👉 调用大模型生成总结

    return Response.json({
      ok: true,
      role: "assistant",
      content:
        response.content ||
        (newsItems.length > 0
          ? "我已经查到相关新闻，但这次总结没有生成成功。你可以再问一次，我会重新整理。"
          : "暂时没有查到相关新闻。"),
      // 👉 fallback：
      // - 有新闻但 AI 没生成 → 提示重试
      // - 没新闻 → 提示没有数据
    });
  } catch (error) {
    console.error("News chat API error:", error);
    // 👉 打印错误日志（服务端）

    return Response.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? `新闻助手暂时不可用：${error.message}`
            : "新闻助手暂时不可用，请稍后再试",
      },
      { status: 500 },
    );
    // 👉 统一异常返回
  }
}
