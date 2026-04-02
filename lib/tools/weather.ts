// 👉 提供给 AI 的工具定义（Function Calling）
export const weatherToolDefinition = {
  type: "function",
  function: {
    name: "get_weather", // 工具名称（AI 调用时用这个）
    description: "获取指定城市的天气信息", // 告诉 AI 这个工具是干嘛的
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "城市名称，如：北京" }, // 输入参数
      },
      required: ["city"], // 必填参数
    },
  },
};

/**
 * 👉 标准化后的天气数据结构（返回给 AI / 前端）
 */
export type WeatherData = {
  city: string; // 城市名
  temperature: number; // 当前温度（℃）
  description: string; // 天气描述（晴/多云/雨）
  humidity: number; // 湿度（%）
  windSpeed: number; // 风速
  feelsLike: number; // 体感温度
  icon: string; // 天气类型（用于 UI 图标）
};

/**
 * 👉 OpenWeather 地理编码 API 返回的数据结构
 * 用于：城市名 → 经纬度
 */
type OpenWeatherGeoItem = {
  name: string;
  lat: number;
  lon: number;
  local_names?: { zh?: string }; // 中文名（如果有）
};

/**
 * 👉 类型守卫（Type Guard）
 *
 * 用来判断：
 * 返回的数据是否符合 OpenWeather 地理接口结构
 */
function isOpenWeatherGeoResponse(data: unknown): data is OpenWeatherGeoItem[] {
  return (
    Array.isArray(data) && // 必须是数组
    data.length > 0 && // 至少有一项
    typeof (data[0] as Record<string, unknown>).lat === "number" && // lat 必须是 number
    typeof (data[0] as Record<string, unknown>).lon === "number" // lon 必须是 number
  );
}

/**
 * 👉 获取天气的核心函数
 *
 * 流程：
 * 1. 城市名 → 经纬度（geo API）
 * 2. 经纬度 → 天气数据（weather API）
 */
export async function getWeather(city: string): Promise<WeatherData> {
  // 去除首尾空格（避免用户输入 " 北京 "）
  const normalizedCity = city.trim();

  // 兼容两种环境变量名称
  const apiKey = process.env.WEATHER_API_KEY ?? process.env.OPENWEATHER_API_KEY;

  // 打印调试日志（避免泄露完整 key）
  console.log("[getWeather] city:", normalizedCity);
  console.log(
    "[getWeather] apiKey:",
    apiKey ? `${apiKey.slice(0, 6)}...` : "未找到！",
  );

  // 基础校验
  if (!normalizedCity) throw new Error("城市名称不能为空");
  if (!apiKey) throw new Error("API Key 未配置");

  /**
   * 👉 第一步：城市名 → 经纬度
   *
   * OpenWeather Geo API
   */
  const geoRes = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(normalizedCity)}&limit=1&appid=${apiKey}`,
  );

  const geoData = (await geoRes.json()) as unknown;

  console.log("[getWeather] geoData:", JSON.stringify(geoData));

  // 校验返回数据是否合法
  if (!isOpenWeatherGeoResponse(geoData)) {
    throw new Error(`未找到城市"${normalizedCity}"`);
  }

  // 取第一个匹配城市
  const location = geoData[0];

  /**
   * 👉 第二步：经纬度 → 天气数据
   *
   * OpenWeather Weather API
   */
  const weatherRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&lang=zh_cn&units=metric`,
  );

  const weatherData = (await weatherRes.json()) as Record<string, unknown>;

  console.log("[getWeather] weatherData:", JSON.stringify(weatherData));

  // 拆解字段（OpenWeather 返回结构）
  const main = weatherData.main as Record<string, number>; // 温度 / 湿度
  const wind = weatherData.wind as Record<string, number>; // 风
  const weather = weatherData.weather as Array<Record<string, string>>; // 天气描述

  /**
   * 👉 返回标准化数据（非常关键）
   *
   * 统一格式 → 方便：
   * - AI 使用
   * - 前端展示
   */
  return {
    city:
      location.local_names?.zh ?? // 优先用中文名
      location.name ?? // 否则用 API 返回名
      normalizedCity, // 再 fallback 用户输入

    temperature: main.temp, // 当前温度
    description: weather[0].description, // 天气描述（中文）
    humidity: main.humidity, // 湿度
    windSpeed: wind.speed, // 风速
    feelsLike: main.feels_like, // 体感温度
    icon: weather[0].main, // 天气类型（Rain / Clear 等）
  };
}
