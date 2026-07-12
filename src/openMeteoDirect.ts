import { WeatherData } from "./types";

type UnknownRecord = Record<string, unknown>;

const OPEN_METEO_TIMEOUT_MS = 12000;
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com";
const FORECAST_BASE = "https://api.open-meteo.com";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com";

const asRecord = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Open-Meteo is missing ${field}.`);
  }
  return value as UnknownRecord;
};

const asNumber = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Open-Meteo has an invalid ${field}.`);
  }
  return parsed;
};

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Open-Meteo has an invalid ${field}.`);
  }
  return value;
};

const rounded = (value: number, decimalPlaces = 0): number => {
  const multiplier = 10 ** decimalPlaces;
  return Math.round(value * multiplier) / multiplier;
};

const clamp = (value: number, minimum: number, maximum: number): number => (
  Math.min(maximum, Math.max(minimum, value))
);

const average = (values: number[]): number => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const celsiusToFahrenheit = (value: number): number => value * 9 / 5 + 32;
const kilometresToMiles = (value: number): number => value * 0.621371;

const mapWmoCode = (code: number): WeatherData["condition"] => {
  if (code === 0) return { text: "Clear Sky", code: 1000 };
  if (code === 1) return { text: "Mainly Clear", code: 1000 };
  if (code === 2) return { text: "Partly Cloudy", code: 1003 };
  if (code === 3) return { text: "Overcast", code: 1009 };
  if (code === 45 || code === 48) return { text: "Foggy", code: 1135 };
  if ([51, 53, 55].includes(code)) return { text: "Drizzle", code: 1153 };
  if ([56, 57].includes(code)) return { text: "Freezing Drizzle", code: 1168 };
  if ([61, 63, 65].includes(code)) return { text: "Rain", code: 1183 };
  if ([66, 67].includes(code)) return { text: "Freezing Rain", code: 1198 };
  if ([71, 73, 75, 77].includes(code)) return { text: "Snow", code: 1219 };
  if ([80, 81, 82].includes(code)) return { text: "Rain Showers", code: 1240 };
  if ([85, 86].includes(code)) return { text: "Snow Showers", code: 1255 };
  if (code === 95) return { text: "Thunderstorm", code: 1087 };
  if (code === 96 || code === 99) return { text: "Thunderstorm with Hail", code: 1276 };
  return { text: "Unknown", code };
};

const windDirectionFromDegrees = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length];
};

const buildUrl = (
  base: string,
  pathname: string,
  params: Record<string, string | number>
): string => {
  const url = new URL(pathname, base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const requestJson = async <T>(url: string, signal?: AbortSignal): Promise<T> => {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || (payload && typeof payload === "object" && "error" in payload)) {
      const reason = payload && typeof payload === "object" && "reason" in payload
        ? String((payload as UnknownRecord).reason)
        : `HTTP ${response.status}`;
      throw new Error(`Open-Meteo request failed: ${reason}`);
    }
    return payload as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new Error("Open-Meteo request timed out.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
};

const chooseLocation = (results: UnknownRecord[], requestedCity: string): UnknownRecord => {
  const normalizedRequested = requestedCity.trim().toLowerCase();
  const exact = results.find((result) => {
    const name = String(result.name || "").trim().toLowerCase();
    return name === normalizedRequested;
  });
  return exact || results[0];
};

const dayNameFromDate = (dateString: string): string => (
  new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, { weekday: "long" })
);

const localMinutesFromIso = (isoString: string, fieldName: string): number => {
  const match = /T(\d{2}):(\d{2})/.exec(isoString);
  if (!match) {
    throw new Error(`Open-Meteo has an invalid ${fieldName} timestamp.`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
};

const formatMinutes12Hour = (minutes: number): string => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
};

const formatIsoTime12Hour = (isoString: string, fieldName: string): string => (
  formatMinutes12Hour(localMinutesFromIso(isoString, fieldName))
);

const europeanAqiPresentation = (value: number): WeatherData["aqi"] => {
  if (value <= 20) return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Good", color: "green" };
  if (value <= 40) return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Moderate", color: "yellow" };
  if (value <= 60) return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Unhealthy for Sensitive", color: "orange" };
  if (value <= 80) return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Unhealthy", color: "red" };
  if (value <= 100) return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Very Unhealthy", color: "purple" };
  return { index: rounded(value), pm25: 0, pm10: 0, o3: 0, no2: 0, so2: 0, co: 0, label: "Hazardous", color: "rose" };
};

const moonDataForDate = (dateString: string): Pick<WeatherData["astronomy"], "moonPhase" | "moonIllumination"> => {
  const date = Date.parse(`${dateString}T12:00:00Z`);
  const synodicMonthDays = 29.53058867;
  const referenceNewMoon = Date.parse("2000-01-06T18:14:00Z");
  const elapsedDays = (date - referenceNewMoon) / 86400000;
  const lunarAge = ((elapsedDays % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  const illumination = rounded(((1 - Math.cos((2 * Math.PI * lunarAge) / synodicMonthDays)) / 2) * 100);

  if (lunarAge < 1.84566) return { moonPhase: "New Moon", moonIllumination: illumination };
  if (lunarAge < 5.53699) return { moonPhase: "Waxing Crescent", moonIllumination: illumination };
  if (lunarAge < 9.22831) return { moonPhase: "First Quarter", moonIllumination: illumination };
  if (lunarAge < 12.91963) return { moonPhase: "Waxing Gibbous", moonIllumination: illumination };
  if (lunarAge < 16.61096) return { moonPhase: "Full Moon", moonIllumination: illumination };
  if (lunarAge < 20.30228) return { moonPhase: "Waning Gibbous", moonIllumination: illumination };
  if (lunarAge < 23.99361) return { moonPhase: "Last Quarter", moonIllumination: illumination };
  if (lunarAge < 27.68493) return { moonPhase: "Waning Crescent", moonIllumination: illumination };
  return { moonPhase: "New Moon", moonIllumination: illumination };
};

export async function fetchOpenMeteoDirect(city: string, signal?: AbortSignal): Promise<WeatherData> {
  const geocodingUrl = buildUrl(GEOCODING_BASE, "/v1/search", {
    name: city,
    count: 10,
    language: "en",
    format: "json",
  });
  const geocodingPayload = asRecord(await requestJson(geocodingUrl, signal), "geocoding");
  const results = Array.isArray(geocodingPayload.results) ? geocodingPayload.results : [];
  if (!results.length) {
    throw new Error(`No Open-Meteo location matched ${city}.`);
  }

  const location = asRecord(chooseLocation(results.map((item) => asRecord(item, "geocoding result")), city), "location");
  const latitude = asNumber(location.latitude, "latitude");
  const longitude = asNumber(location.longitude, "longitude");
  const resolvedCity = asString(location.name, "city");
  const country = asString(location.country, "country");

  const commonParams = {
    latitude,
    longitude,
    timezone: "auto",
  };

  const [forecastPayload, airPayload] = await Promise.all([
    requestJson<unknown>(
      buildUrl(FORECAST_BASE, "/v1/forecast", {
        ...commonParams,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation",
          "rain",
          "precipitation_probability",
          "weather_code",
          "cloud_cover",
          "pressure_msl",
          "visibility",
          "wind_speed_10m",
          "wind_direction_10m",
          "wind_gusts_10m",
          "uv_index",
        ].join(","),
        hourly: [
          "temperature_2m",
          "precipitation_probability",
          "precipitation",
          "rain",
          "weather_code",
          "cloud_cover",
          "visibility",
          "wind_speed_10m",
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_probability_max",
          "uv_index_max",
          "sunrise",
          "sunset",
        ].join(","),
        forecast_days: 7,
        forecast_hours: 48,
      }),
      signal
    ),
    requestJson<unknown>(
      buildUrl(AIR_QUALITY_BASE, "/v1/air-quality", {
        ...commonParams,
        current: [
          "european_aqi",
          "pm10",
          "pm2_5",
          "carbon_monoxide",
          "nitrogen_dioxide",
          "sulphur_dioxide",
          "ozone",
        ].join(","),
        hourly: "european_aqi",
        forecast_days: 7,
      }),
      signal
    ),
  ]);

  const forecast = asRecord(forecastPayload, "forecast");
  const current = asRecord(forecast.current, "current");
  const hourly = asRecord(forecast.hourly, "hourly");
  const daily = asRecord(forecast.daily, "daily");
  const currentAir = asRecord(asRecord(airPayload, "air quality").current, "air quality current");
  const hourlyAir = asRecord(asRecord(airPayload, "air quality").hourly, "air quality hourly");

  const hourlyTimes = Array.isArray(hourly.time) ? hourly.time.map((item) => String(item)) : [];
  const dailyTimes = Array.isArray(daily.time) ? daily.time.map((item) => String(item)) : [];
  const currentTime = asString(current.time, "current time");
  const currentHourKey = currentTime.slice(0, 13);
  let currentHourlyIndex = hourlyTimes.findIndex((time) => time.slice(0, 13) === currentHourKey);
  if (currentHourlyIndex < 0) {
    currentHourlyIndex = hourlyTimes.findIndex((time) => time >= `${currentHourKey}:00`);
  }
  if (currentHourlyIndex < 0 || hourlyTimes.length - currentHourlyIndex < 24 || !dailyTimes.length) {
    throw new Error("Open-Meteo returned an incomplete forecast timeline.");
  }

  const hourlyIndices = Array.from({ length: 24 }, (_, offset) => currentHourlyIndex + offset);
  const hourlyList = hourlyIndices.map((index) => {
    const timestamp = hourlyTimes[index];
    const hour = Number(timestamp.slice(11, 13));
    const temperatureC = asNumber((hourly.temperature_2m as unknown[])?.[index], `hourly temperature ${index}`);
    const windKmh = asNumber((hourly.wind_speed_10m as unknown[])?.[index], `hourly wind ${index}`);

    return {
      time: timestamp.slice(11, 16),
      tempC: rounded(temperatureC),
      tempF: rounded(celsiusToFahrenheit(temperatureC)),
      condition: mapWmoCode(asNumber((hourly.weather_code as unknown[])?.[index], `hourly weather code ${index}`)),
      rainProb: rounded(asNumber((hourly.precipitation_probability as unknown[])?.[index], `hourly rain probability ${index}`)),
      windKmh: rounded(windKmh),
      windMph: rounded(kilometresToMiles(windKmh)),
      isWorkHour: hour >= 9 && hour <= 18,
    };
  });

  const airTimes = Array.isArray(hourlyAir.time) ? hourlyAir.time.map((item) => String(item)) : [];
  const airValues = Array.isArray(hourlyAir.european_aqi) ? hourlyAir.european_aqi : [];
  const dailyAqiValues = new Map<string, number[]>();
  airTimes.forEach((timestamp, index) => {
    const value = airValues[index];
    if (value === null || value === undefined) return;
    const date = timestamp.slice(0, 10);
    const values = dailyAqiValues.get(date) || [];
    values.push(asNumber(value, `hourly AQI ${index}`));
    dailyAqiValues.set(date, values);
  });

  const currentEuropeanAqi = asNumber(currentAir.european_aqi, "current AQI");
  const currentAqiPresentation = europeanAqiPresentation(currentEuropeanAqi);

  const dailyList = dailyTimes.slice(0, 7).map((date, index) => {
    const aqiValues = dailyAqiValues.get(date) || [];
    const dailyAqi = aqiValues.length ? rounded(Math.max(...aqiValues)) : rounded(currentEuropeanAqi);
    const maxTempC = asNumber((daily.temperature_2m_max as unknown[])?.[index], `daily max temp ${index}`);
    const minTempC = asNumber((daily.temperature_2m_min as unknown[])?.[index], `daily min temp ${index}`);

    return {
      date,
      dayName: dayNameFromDate(date),
      maxTempC: rounded(maxTempC),
      maxTempF: rounded(celsiusToFahrenheit(maxTempC)),
      minTempC: rounded(minTempC),
      minTempF: rounded(celsiusToFahrenheit(minTempC)),
      condition: mapWmoCode(asNumber((daily.weather_code as unknown[])?.[index], `daily weather code ${index}`)),
      rainProb: rounded(asNumber((daily.precipitation_probability_max as unknown[])?.[index], `daily rain probability ${index}`)),
      uvIndex: rounded(asNumber((daily.uv_index_max as unknown[])?.[index], `daily uv ${index}`), 1),
      aqi: dailyAqi,
    };
  });

  const firstSunrise = asString((daily.sunrise as unknown[])?.[0], "sunrise");
  const firstSunset = asString((daily.sunset as unknown[])?.[0], "sunset");
  const sunriseMinutes = localMinutesFromIso(firstSunrise, "sunrise");
  const sunsetMinutes = localMinutesFromIso(firstSunset, "sunset");
  const moon = moonDataForDate(dailyTimes[0]);
  const nightIndices = hourlyIndices.filter((index) => {
    const minutes = localMinutesFromIso(hourlyTimes[index], "hourly time");
    return minutes <= sunriseMinutes || minutes >= sunsetMinutes;
  });
  const stargazingIndices = nightIndices.length ? nightIndices : hourlyIndices;
  const averageNightCloudCover = average(
    stargazingIndices.map((index) => asNumber((hourly.cloud_cover as unknown[])?.[index], `hourly cloud cover ${index}`))
  );
  const averageNightRainProbability = average(
    stargazingIndices.map((index) => asNumber((hourly.precipitation_probability as unknown[])?.[index], `hourly rain probability ${index}`))
  );
  const averageNightVisibilityKm = average(
    stargazingIndices.map((index) => asNumber((hourly.visibility as unknown[])?.[index], `hourly visibility ${index}`) / 1000)
  );
  const stargazingScore = rounded(
    clamp(
      95 -
        averageNightCloudCover * 0.55 -
        averageNightRainProbability * 0.2 -
        moon.moonIllumination * 0.15 +
        Math.min(averageNightVisibilityKm, 20) / 2,
      0,
      100
    )
  );

  const temperatureC = asNumber(current.temperature_2m, "temperature");
  const feelsLikeC = asNumber(current.apparent_temperature, "feels-like temperature");
  const windKmh = asNumber(current.wind_speed_10m, "wind speed");
  const windGustKmh = asNumber(current.wind_gusts_10m, "wind gust");
  const visibilityKm = asNumber(current.visibility, "visibility") / 1000;
  const rainProbability = current.precipitation_probability === null || current.precipitation_probability === undefined
    ? asNumber((hourly.precipitation_probability as unknown[])?.[currentHourlyIndex], "hourly rain probability")
    : asNumber(current.precipitation_probability, "rain probability");

  return {
    city: resolvedCity,
    country,
    lat: latitude,
    lon: longitude,
    tempC: rounded(temperatureC),
    tempF: rounded(celsiusToFahrenheit(temperatureC)),
    feelsLikeC: rounded(feelsLikeC),
    feelsLikeF: rounded(celsiusToFahrenheit(feelsLikeC)),
    condition: mapWmoCode(asNumber(current.weather_code, "weather code")),
    humidity: rounded(asNumber(current.relative_humidity_2m, "humidity")),
    windKmh: rounded(windKmh),
    windMph: rounded(kilometresToMiles(windKmh)),
    windDir: windDirectionFromDegrees(asNumber(current.wind_direction_10m, "wind direction")),
    windGustKmh: rounded(windGustKmh),
    windGustMph: rounded(kilometresToMiles(windGustKmh)),
    pressureMb: rounded(asNumber(current.pressure_msl, "pressure")),
    uvIndex: rounded(asNumber(current.uv_index, "UV index"), 1),
    visibilityKm: rounded(visibilityKm, 1),
    visibilityMiles: rounded(kilometresToMiles(visibilityKm), 1),
    rainProb: rounded(rainProbability),
    precipitationMm: rounded(asNumber(current.precipitation, "precipitation"), 1),
    aqi: {
      index: rounded(currentEuropeanAqi),
      pm25: rounded(asNumber(currentAir.pm2_5, "PM2.5"), 1),
      pm10: rounded(asNumber(currentAir.pm10, "PM10"), 1),
      o3: rounded(asNumber(currentAir.ozone, "ozone"), 1),
      no2: rounded(asNumber(currentAir.nitrogen_dioxide, "nitrogen dioxide"), 1),
      so2: rounded(asNumber(currentAir.sulphur_dioxide, "sulphur dioxide"), 1),
      co: rounded(asNumber(currentAir.carbon_monoxide, "carbon monoxide") / 1000, 2),
      label: currentAqiPresentation.label,
      color: currentAqiPresentation.color,
    },
    astronomy: {
      sunrise: formatIsoTime12Hour(firstSunrise, "sunrise"),
      sunset: formatIsoTime12Hour(firstSunset, "sunset"),
      goldenHourMorning: `${formatMinutes12Hour(sunriseMinutes)} - ${formatMinutes12Hour(sunriseMinutes + 60)}`,
      goldenHourEvening: `${formatMinutes12Hour(sunsetMinutes - 60)} - ${formatMinutes12Hour(sunsetMinutes)}`,
      blueHourMorning: `${formatMinutes12Hour(sunriseMinutes - 30)} - ${formatMinutes12Hour(sunriseMinutes)}`,
      blueHourEvening: `${formatMinutes12Hour(sunsetMinutes)} - ${formatMinutes12Hour(sunsetMinutes + 30)}`,
      moonPhase: moon.moonPhase,
      moonIllumination: moon.moonIllumination,
      stargazingScore,
    },
    alerts: [],
    hourly: hourlyList,
    daily: dailyList,
  };
}
