// lib/tools/news.ts

export const newsToolDefinition = {
  type: "function", // 定义为一个 AI 可调用的函数工具
  function: {
    name: "get_news", // 工具名称（AI 调用时使用）
    description:
      "获取最新新闻，可按关键词搜索；如果没有关键词，则返回当前头条新闻", // 功能描述
    parameters: {
      type: "object", // 参数是对象
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词，如：科技、体育、AI；没有明确主题时可以留空", // 关键词参数说明
        },
      },
    },
  },
};

// RSS 源配置，按分类
const RSS_SOURCES = [
  { url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "综合" }, // BBC 中文
  { url: "https://www.zaobao.com/rss/realtime/china", category: "综合" }, // 联合早报
  { url: "https://36kr.com/feed", category: "科技" }, // 36氪
  { url: "https://sspai.com/feed", category: "科技" }, // 少数派
  { url: "https://www.huxiu.com/rss/0.xml", category: "财经" }, // 虎嗅
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "国际" }, // BBC 国际
  { url: "https://rss.dw.com/xml/rss-zh-all", category: "国际" }, // 德国之声
];

// 关键词 → 优先抓哪些分类
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  科技: ["科技"], // 中文科技关键词
  ai: ["科技"], // 英文 ai
  AI: ["科技"],
  人工智能: ["科技"],
  财经: ["财经"],
  经济: ["财经"],
  股市: ["财经"],
  国际: ["国际"],
  世界: ["国际"],
  综合: ["综合"],
};

type NewsItem = {
  title: string; // 标题
  description: string; // 摘要
  source: string; // 来源站点
  url: string; // 新闻链接
  publishedAt: string; // 发布时间
};

// 解析单条 <item>
function parseItem(itemXml: string, sourceName: string): NewsItem | null {
  const get = (tag: string) => {
    const m = itemXml.match(
      new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
        "i",
      ),
    ); // 用正则提取标签内容（兼容 CDATA）
    return m ? m[1].trim() : ""; // 没有就返回空字符串
  };

  const title = get("title"); // 提取标题
  if (!title) return null; // 没有标题直接丢弃

  return {
    title,
    description:
      get("description") // 提取描述
        .replace(/<[^>]+>/g, "") // 去掉 HTML 标签
        .slice(0, 200) || "暂无摘要", // 截取前200字符
    source: sourceName, // 来源名称
    url: get("link") || get("guid") || "", // 优先 link，其次 guid
    publishedAt: get("pubDate") || get("published") || "", // 发布时间（兼容不同格式）
  };
}

// 抓单个 RSS 源
async function fetchRss(
  rssUrl: string,
  sourceName: string,
): Promise<NewsItem[]> {
  try {
    const res = await fetch(rssUrl, {
      cache: "no-store", // 不使用缓存，保证最新数据
      signal: AbortSignal.timeout(8000), // 8秒超时
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AriaBot/1.0)" }, // 模拟浏览器请求
    });

    if (!res.ok) return []; // 请求失败直接返回空数组

    const xml = await res.text(); // 获取 XML 内容

    const items =
      xml.match(/<item[\s\S]*?<\/item>/gi) ?? // RSS 标准
      xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? // Atom 标准
      [];

    return items
      .slice(0, 6) // 每个源最多取6条
      .map((item) => parseItem(item, sourceName)) // 解析每条
      .filter((item): item is NewsItem => item !== null); // 过滤 null
  } catch {
    return []; // 出错返回空数组（容错）
  }
}

// 从 URL 提取站点名
function sourceName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
    // 例：www.bbc.com → bbc
  } catch {
    return "RSS"; // fallback
  }
}

export async function getNews(keyword?: string): Promise<NewsItem[]> {
  const kw = keyword?.trim().toLowerCase() ?? ""; // 关键词统一处理（小写）

  // 根据关键词选择优先分类
  let priorityCategories: string[] = [];
  for (const [key, cats] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (kw.includes(key.toLowerCase())) {
      priorityCategories = cats; // 找到匹配分类
      break;
    }
  }

  // 优先源排在前面，其余追加
  const prioritySources = RSS_SOURCES.filter((s) =>
    priorityCategories.includes(s.category),
  ); // 优先分类源
  const otherSources = RSS_SOURCES.filter(
    (s) => !priorityCategories.includes(s.category),
  ); // 其他源

  const orderedSources = priorityCategories.length
    ? [...prioritySources, ...otherSources] // 优先 + 其他
    : RSS_SOURCES; // 没关键词就全部

  // 并发拉取前 4 个源（性能优化）
  const results = await Promise.all(
    orderedSources.slice(0, 4).map((s) => fetchRss(s.url, sourceName(s.url))),
  );

  let items = results.flat(); // 扁平化数组

  // 关键词过滤
  if (kw) {
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(kw) || // 标题匹配
        item.description.toLowerCase().includes(kw), // 描述匹配
    );

    if (filtered.length >= 3) items = filtered; // 至少3条才使用过滤结果（避免太少）
  }

  // 去重（按标题）
  const seen = new Set<string>();
  const deduped = items.filter((item) => {
    if (seen.has(item.title)) return false; // 已存在就丢弃
    seen.add(item.title);
    return true;
  });

  return deduped.slice(0, 8); // 最多返回 8 条新闻
}
