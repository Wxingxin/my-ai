const weatherToolDefinition = {
  type: "function",
  function: {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "城市名称，如：北京" },
      },
      required: ["city"],
    },
  },
};

function isOpenWeatherGeoResponse(data) {
  return (
    Array.isArray(data) &&
    data.length > 0 &&
    typeof data[0]?.lat === "number" &&
    typeof data[0]?.lon === "number"
  );
}

async function getWeather(city) {
  const normalizedCity = city.trim();
  const apiKey = process.env.WEATHER_API_KEY ?? process.env.OPENWEATHER_API_KEY;

  if (!normalizedCity) {
    throw new Error("城市名称不能为空");
  }

  if (!apiKey) {
    throw new Error("API Key 未配置");
  }

  const geoRes = await fetch(
    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(normalizedCity)}&limit=1&appid=${apiKey}`,
  );
  const geoData = await geoRes.json();

  if (!isOpenWeatherGeoResponse(geoData)) {
    throw new Error(`未找到城市"${normalizedCity}"`);
  }

  const location = geoData[0];
  const weatherRes = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${apiKey}&lang=zh_cn&units=metric`,
  );
  const weatherData = await weatherRes.json();

  const main = weatherData.main;
  const wind = weatherData.wind;
  const weather = weatherData.weather;

  return {
    city: location.local_names?.zh ?? location.name ?? normalizedCity,
    temperature: main.temp,
    description: weather[0].description,
    humidity: main.humidity,
    windSpeed: wind.speed,
    feelsLike: main.feels_like,
    icon: weather[0].main,
  };
}

module.exports = {
  getWeather,
  weatherToolDefinition,
};
