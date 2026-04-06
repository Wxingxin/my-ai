const newsToolDefinition = {
  type: "function",
  function: {
    name: "get_news",
    description: "获取最新新闻，可按关键词搜索；如果没有关键词，则返回当前头条新闻",
    parameters: {
      type: "object",
      properties: {
        keyword: {
          type: "string",
          description: "搜索关键词，如：科技、体育、AI；没有明确主题时可以留空",
        },
      },
    },
  },
};

const RSS_SOURCES = [
  { url: "https://feeds.bbci.co.uk/zhongwen/simp/rss.xml", category: "综合" },
  { url: "https://www.zaobao.com/rss/realtime/china", category: "综合" },
  { url: "https://36kr.com/feed", category: "科技" },
  { url: "https://sspai.com/feed", category: "科技" },
  { url: "https://www.huxiu.com/rss/0.xml", category: "财经" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "国际" },
  { url: "https://rss.dw.com/xml/rss-zh-all", category: "国际" },
];

const KEYWORD_CATEGORY_MAP = {
  科技: ["科技"],
  ai: ["科技"],
  AI: ["科技"],
  人工智能: ["科技"],
  财经: ["财经"],
  经济: ["财经"],
  股市: ["财经"],
  国际: ["国际"],
  世界: ["国际"],
  综合: ["综合"],
};

function parseItem(itemXml, sourceName) {
  const get = (tag) => {
    const match = itemXml.match(
      new RegExp(
        `<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`,
        "i",
      ),
    );

    return match ? match[1].trim() : "";
  };

  const title = get("title");

  if (!title) {
    return null;
  }

  return {
    title,
    description: get("description").replace(/<[^>]+>/g, "").slice(0, 200) || "暂无摘要",
    source: sourceName,
    url: get("link") || get("guid") || "",
    publishedAt: get("pubDate") || get("published") || "",
  };
}

async function fetchRss(rssUrl, sourceName) {
  try {
    const response = await fetch(rssUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AriaBot/1.0)" },
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const items =
      xml.match(/<item[\s\S]*?<\/item>/gi) ??
      xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
      [];

    return items
      .slice(0, 6)
      .map((item) => parseItem(item, sourceName))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function sourceName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  } catch {
    return "RSS";
  }
}

async function getNews(keyword) {
  const kw = keyword?.trim().toLowerCase() ?? "";

  let priorityCategories = [];
  for (const [key, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (kw.includes(key.toLowerCase())) {
      priorityCategories = categories;
      break;
    }
  }

  const prioritySources = RSS_SOURCES.filter((source) =>
    priorityCategories.includes(source.category),
  );
  const otherSources = RSS_SOURCES.filter(
    (source) => !priorityCategories.includes(source.category),
  );
  const orderedSources = priorityCategories.length
    ? [...prioritySources, ...otherSources]
    : RSS_SOURCES;

  const results = await Promise.all(
    orderedSources.slice(0, 4).map((source) => fetchRss(source.url, sourceName(source.url))),
  );

  let items = results.flat();

  if (kw) {
    const filtered = items.filter(
      (item) =>
        item.title.toLowerCase().includes(kw) ||
        item.description.toLowerCase().includes(kw),
    );

    if (filtered.length >= 3) {
      items = filtered;
    }
  }

  const seen = new Set();
  const deduped = items.filter((item) => {
    if (seen.has(item.title)) {
      return false;
    }

    seen.add(item.title);
    return true;
  });

  return deduped.slice(0, 8);
}

module.exports = {
  getNews,
  newsToolDefinition,
};
