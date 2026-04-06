const express = require("express");

const { callModel } = require("../lib/models");
const { resolveProvider } = require("../lib/models/provider");
const { getNews } = require("../lib/tools/news");
const { validateSession } = require("../lib/validateSession");

const newsRouter = express.Router();

const NEWS_SYSTEM_PROMPT = `
你是 Aria 的新闻助手。
回答要求：
- 只使用中文回答。
- 用户问新闻、热点、资讯、某个主题的近期动态时，优先调用 get_news。
- 拿到新闻结果后，用自然语言总结重点，不要输出原始 JSON。
- 回复给普通用户看，不要使用 Markdown 标题、代码块、复杂结构。
- 可以按“发生了什么、为什么值得关注、你可以重点看什么”来组织。
- 如果新闻结果为空，要明确告诉用户暂时没有查到相关新闻。
`;

function extractKeyword(input) {
  const text = input.trim();

  if (!text) {
    return "";
  }

  const genericPatterns = [/今天有什么新闻/u, /最近有什么新闻/u, /新闻/u, /热点/u, /资讯/u, /头条/u];

  if (genericPatterns.some((pattern) => pattern.test(text)) && text.length <= 12) {
    return "";
  }

  return text
    .replace(/帮我(看看|总结|查一下)?/gu, "")
    .replace(/(今天|最近|近期|最新)的?/gu, "")
    .replace(/(新闻|资讯|热点|头条|动态)/gu, "")
    .replace(/是?什么/gu, "")
    .trim();
}

newsRouter.post("/", async (req, res, next) => {
  try {
    const sessionResult = await validateSession(req);

    if (!sessionResult.ok) {
      return res.status(sessionResult.status).json({
        ok: false,
        message: sessionResult.message,
      });
    }

    const { messages, provider } = req.body;
    const resolvedProvider = resolveProvider(provider);

    if (!resolvedProvider) {
      return res.status(500).json({
        ok: false,
        message: "未找到可用的 AI provider。请检查 OPENAI_API_KEY、DEEPSEEK_API_KEY 或 ANTHROPIC_API_KEY。",
      });
    }

    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");
    const keyword = extractKeyword(latestUserMessage?.content ?? "");
    const newsItems = await getNews(keyword);

    const fullMessages = [
      {
        role: "system",
        content:
          NEWS_SYSTEM_PROMPT +
          "\n你已经通过 get_news 工具拿到了新闻结果，请基于结果回答，不要再次要求用户提供关键词。",
      },
      ...messages,
      {
        role: "system",
        content: `以下是通过 NewsAPI.org 获取到的新闻数据：${JSON.stringify(newsItems)}`,
      },
    ];

    const response = await callModel(fullMessages, undefined, resolvedProvider);

    return res.json({
      ok: true,
      role: "assistant",
      content:
        response.content ||
        (newsItems.length > 0
          ? "我已经查到相关新闻，但这次总结没有生成成功。你可以再问一次，我会重新整理。"
          : "暂时没有查到相关新闻。"),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = {
  newsRouter,
};
