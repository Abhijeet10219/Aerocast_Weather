/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI SDK safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("GEMINI_API_KEY is missing. AI features will run in mock/simulation mode.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// ----------------- Canonical real-time Open-Meteo weather feed -----------------
type OpenMeteoTier = "customer" | "public";

interface OpenMeteoResult<T = any> {
  data: T;
  tier: OpenMeteoTier;
}

class WeatherServiceError extends Error {
  constructor(message: string, public readonly statusCode = 502) {
    super(message);
    this.name = "WeatherServiceError";
  }
}

const OPEN_METEO_TIMEOUT_MS = 12_000;
const PUBLIC_GEOCODING_BASE = "https://geocoding-api.open-meteo.com";
const PUBLIC_FORECAST_BASE = "https://api.open-meteo.com";
const PUBLIC_AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com";
const GOOGLE_WEATHER_BASE = "https://weather.googleapis.com";
const GOOGLE_AIR_QUALITY_BASE = "https://airquality.googleapis.com";
const GOOGLE_GEOCODING_BASE = "https://maps.googleapis.com";

function getOpenMeteoApiKey(): string | undefined {
  const value = process.env.OPEN_METEO_API_KEY?.trim();
  if (!value || /^(YOUR_|MY_|PLACEHOLDER|REPLACE_ME|CHANGE_ME)/i.test(value)) {
    return undefined;
  }
  return value;
}

function getGoogleMapsPlatformKey(): string | undefined {
  const value = process.env.GOOGLE_MAPS_PLATFORM_KEY?.trim();
  if (!value || /^(YOUR_|MY_|PLACEHOLDER|REPLACE_ME|CHANGE_ME)/i.test(value)) {
    return undefined;
  }
  return value;
}

function buildOpenMeteoUrl(
  base: string,
  pathname: string,
  params: Record<string, string | number>,
  apiKey?: string
): string {
  const url = new URL(pathname, base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  if (apiKey) {
    url.searchParams.set("apikey", apiKey);
  }
  return url.toString();
}

function customerBaseFor(publicBase: string): string {
  const url = new URL(publicBase);
  url.hostname = "customer-" + url.hostname;
  return url.origin;
}

async function fetchOpenMeteoJson<T>(url: string, label: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const responseText = await response.text();
    let data: any;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new WeatherServiceError(label + " returned invalid JSON.");
    }

    if (!response.ok || data?.error) {
      const reason = typeof data?.reason === "string"
        ? data.reason
        : "HTTP " + response.status;
      throw new WeatherServiceError(label + " failed: " + reason);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new WeatherServiceError(label + " timed out.", 504);
    }
    if (error instanceof WeatherServiceError) {
      throw error;
    }
    throw new WeatherServiceError(label + " could not be reached.");
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOpenMeteoResource<T>(
  publicBase: string,
  pathname: string,
  params: Record<string, string | number>,
  label: string
): Promise<OpenMeteoResult<T>> {
  const apiKey = getOpenMeteoApiKey();

  if (apiKey) {
    const customerUrl = buildOpenMeteoUrl(
      customerBaseFor(publicBase),
      pathname,
      params,
      apiKey
    );
    try {
      return {
        data: await fetchOpenMeteoJson<T>(customerUrl, "Customer " + label),
        tier: "customer",
      };
    } catch (error: any) {
      console.warn(
        "Open-Meteo customer " + label + " failed; retrying the public endpoint:",
        error?.message || error
      );
    }
  }

  const publicUrl = buildOpenMeteoUrl(publicBase, pathname, params);
  return {
    data: await fetchOpenMeteoJson<T>(publicUrl, "Public " + label),
    tier: "public",
  };
}

function numberValue(value: unknown, fieldName: string): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new WeatherServiceError(
      "Open-Meteo response is missing the required field " + fieldName + "."
    );
  }
  return numericValue;
}

function rounded(value: number, decimalPlaces = 0): number {
  const multiplier = 10 ** decimalPlaces;
  return Math.round(value * multiplier) / multiplier;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function celsiusToFahrenheit(value: number): number {
  return value * 9 / 5 + 32;
}

function kilometresToMiles(value: number): number {
  return value * 0.621371;
}

function mapWmoCode(code: number): { text: string; code: number } {
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
}

function windDirectionFromDegrees(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const normalized = ((degrees % 360) + 360) % 360;
  return directions[Math.round(normalized / 45) % directions.length];
}

function localMinutesFromIso(isoString: string, fieldName: string): number {
  const match = /T(\d{2}):(\d{2})/.exec(isoString);
  if (!match) {
    throw new WeatherServiceError(
      "Open-Meteo response contains an invalid " + fieldName + " timestamp."
    );
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutes12Hour(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return (
    String(hour12).padStart(2, "0") +
    ":" +
    String(minute).padStart(2, "0") +
    " " +
    suffix
  );
}

function formatIsoTime12Hour(isoString: string, fieldName: string): string {
  return formatMinutes12Hour(localMinutesFromIso(isoString, fieldName));
}

function moonDataForDate(dateString: string): {
  phase: "New Moon" | "Waxing Crescent" | "First Quarter" | "Waxing Gibbous" | "Full Moon" | "Waning Gibbous" | "Last Quarter" | "Waning Crescent";
  illumination: number;
} {
  const date = Date.parse(dateString + "T12:00:00Z");
  if (!Number.isFinite(date)) {
    throw new WeatherServiceError("Open-Meteo returned an invalid daily date.");
  }

  const synodicMonthDays = 29.53058867;
  const referenceNewMoon = Date.parse("2000-01-06T18:14:00Z");
  const elapsedDays = (date - referenceNewMoon) / 86_400_000;
  const lunarAge = ((elapsedDays % synodicMonthDays) + synodicMonthDays) % synodicMonthDays;
  const cyclePosition = lunarAge / synodicMonthDays;
  const illumination = rounded(
    (1 - Math.cos(2 * Math.PI * cyclePosition)) * 50
  );
  const phases = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ] as const;
  const phaseIndex = Math.floor(cyclePosition * 8 + 0.5) % phases.length;

  return { phase: phases[phaseIndex], illumination };
}

function europeanAqiPresentation(europeanAqi: number): {
  label: "Good" | "Moderate" | "Unhealthy for Sensitive" | "Unhealthy" | "Very Unhealthy" | "Hazardous";
  color: string;
} {
  if (europeanAqi <= 20) return { label: "Good", color: "emerald" };
  if (europeanAqi <= 40) return { label: "Moderate", color: "yellow" };
  if (europeanAqi <= 60) return { label: "Unhealthy for Sensitive", color: "orange" };
  if (europeanAqi <= 80) return { label: "Unhealthy", color: "red" };
  if (europeanAqi <= 100) return { label: "Very Unhealthy", color: "purple" };
  return { label: "Hazardous", color: "rose" };
}

function dayNameFromDate(dateString: string): string {
  const parsed = new Date(dateString + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime())) {
    throw new WeatherServiceError("Open-Meteo returned an invalid daily date.");
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(parsed);
}

function average(values: number[]): number {
  if (values.length === 0) {
    throw new WeatherServiceError("Open-Meteo returned an empty forecast series.");
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chooseGeocodingResult(results: any[], requestedCity: string): any {
  const segments = requestedCity
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const requestedName = segments[0];
  const qualifiers = segments.slice(1);

  const scored = results.map((result, index) => {
    const resultName = String(result?.name || "").trim().toLowerCase();
    const searchable = [
      result?.name,
      result?.country,
      result?.country_code,
      result?.admin1,
      result?.admin2,
      result?.admin3,
      result?.admin4,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    let score = -index;
    if (resultName === requestedName) score += 100;
    else if (resultName.startsWith(requestedName)) score += 50;
    qualifiers.forEach((qualifier) => {
      if (searchable.includes(qualifier)) score += 25;
    });
    return { result, score };
  });

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.result;
}

function canonicalWeatherCityQuery(city: string): string {
  const normalized = city.trim().toLowerCase();
  if (
    normalized === "bangalore" ||
    normalized === "bengaluru" ||
    normalized === "bangalore, india" ||
    normalized === "bengaluru, india" ||
    normalized === "bangalore, karnataka, india"
  ) {
    return "Bengaluru, Karnataka, India";
  }
  return city.trim();
}

function buildGoogleUrl(
  base: string,
  pathname: string,
  params: Record<string, string | number>,
  apiKey: string
): string {
  const url = new URL(pathname, base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set("key", apiKey);
  return url.toString();
}

async function fetchGoogleJson<T>(
  url: string,
  label: string,
  init?: RequestInit
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPEN_METEO_TIMEOUT_MS);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const responseText = await response.text();
    let data: any;

    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new WeatherServiceError(label + " returned invalid JSON.");
    }

    if (!response.ok || data?.error) {
      const reason = typeof data?.error?.message === "string"
        ? data.error.message
        : "HTTP " + response.status;
      throw new WeatherServiceError(label + " failed: " + reason);
    }

    return data as T;
  } catch (error: any) {
    if (error?.name === "AbortError") {
      throw new WeatherServiceError(label + " timed out.", 504);
    }
    if (error instanceof WeatherServiceError) {
      throw error;
    }
    throw new WeatherServiceError(label + " could not be reached.");
  } finally {
    clearTimeout(timeout);
  }
}

function mapGoogleWeatherCondition(condition: any): { text: string; code: number } {
  const type = String(condition?.type || "").toUpperCase();
  const text = String(condition?.description?.text || type || "Unknown");
  if (type.includes("THUNDER")) return { text, code: 1087 };
  if (type.includes("SNOW") || type.includes("SLEET")) return { text, code: 1219 };
  if (type.includes("RAIN") || type.includes("SHOWERS")) return { text, code: 1183 };
  if (type.includes("DRIZZLE")) return { text, code: 1153 };
  if (type.includes("FOG") || type.includes("HAZE") || type.includes("MIST")) return { text, code: 1135 };
  if (type.includes("OVERCAST") || type.includes("CLOUDY")) return { text, code: 1009 };
  if (type.includes("PARTLY") || type.includes("MOSTLY")) return { text, code: 1003 };
  if (type.includes("CLEAR") || type.includes("SUNNY")) return { text, code: 1000 };
  return { text, code: 1006 };
}

function googleDegrees(value: any, fieldName: string): number {
  return numberValue(value?.degrees, fieldName);
}

function googleQuantity(value: any, fieldName: string, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const quantity = value?.quantity ?? value?.value ?? value?.distance;
  return quantity === null || quantity === undefined
    ? fallback
    : numberValue(quantity, fieldName);
}

function googleRainProbability(forecast: any): number {
  const percent = forecast?.precipitation?.probability?.percent;
  return percent === null || percent === undefined
    ? 0
    : rounded(numberValue(percent, "precipitation.probability"));
}

function googleDisplayDate(displayDate: any, fallbackIso: string): string {
  const year = Number(displayDate?.year);
  const month = Number(displayDate?.month);
  const day = Number(displayDate?.day);
  if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
    return [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");
  }
  return fallbackIso.slice(0, 10);
}

function googleDisplayHour(displayDateTime: any, fallbackIso: string): string {
  const hours = Number(displayDateTime?.hours);
  if (Number.isFinite(hours)) {
    return String(hours).padStart(2, "0") + ":00";
  }
  return fallbackIso.slice(11, 16) || "00:00";
}

function googleMoonPhase(value: unknown): ReturnType<typeof moonDataForDate>["phase"] {
  const normalized = String(value || "").toUpperCase();
  if (normalized.includes("NEW")) return "New Moon";
  if (normalized.includes("FIRST")) return "First Quarter";
  if (normalized.includes("FULL")) return "Full Moon";
  if (normalized.includes("LAST") || normalized.includes("THIRD")) return "Last Quarter";
  if (normalized.includes("WAXING") && normalized.includes("CRESCENT")) return "Waxing Crescent";
  if (normalized.includes("WAXING")) return "Waxing Gibbous";
  if (normalized.includes("WANING") && normalized.includes("CRESCENT")) return "Waning Crescent";
  if (normalized.includes("WANING")) return "Waning Gibbous";
  return "New Moon";
}

function googleAqiPresentation(category: unknown, index: number): ReturnType<typeof europeanAqiPresentation> {
  const normalized = String(category || "").toLowerCase();
  if (normalized.includes("hazardous")) return { label: "Hazardous", color: "rose" };
  if (normalized.includes("very")) return { label: "Very Unhealthy", color: "purple" };
  if (normalized.includes("unhealthy")) return { label: "Unhealthy", color: "red" };
  if (normalized.includes("sensitive")) return { label: "Unhealthy for Sensitive", color: "orange" };
  if (normalized.includes("moderate")) return { label: "Moderate", color: "yellow" };
  if (normalized.includes("good")) return { label: "Good", color: "emerald" };
  return europeanAqiPresentation(index);
}

function googlePollutantValue(pollutants: any[], code: string): number {
  const pollutant = pollutants.find((item) =>
    String(item?.code || "").toLowerCase() === code.toLowerCase()
  );
  return pollutant?.concentration?.value === undefined
    ? 0
    : rounded(numberValue(pollutant.concentration.value, "pollutants." + code), 1);
}

async function fetchGoogleLocation(city: string, apiKey: string): Promise<{
  resolvedCity: string;
  country: string;
  latitude: number;
  longitude: number;
}> {
  const geocodeUrl = buildGoogleUrl(
    GOOGLE_GEOCODING_BASE,
    "/maps/api/geocode/json",
    { address: city },
    apiKey
  );
  const geocode = await fetchGoogleJson<any>(geocodeUrl, "Google geocoding request");
  const firstResult = Array.isArray(geocode.results) ? geocode.results[0] : undefined;
  const location = firstResult?.geometry?.location;
  if (!firstResult || !location) {
    throw new WeatherServiceError("No Google Maps location matched " + city + ".", 404);
  }

  const components = Array.isArray(firstResult.address_components)
    ? firstResult.address_components
    : [];
  const cityComponent = components.find((component: any) =>
    Array.isArray(component.types) &&
    (component.types.includes("locality") || component.types.includes("administrative_area_level_1"))
  );
  const countryComponent = components.find((component: any) =>
    Array.isArray(component.types) && component.types.includes("country")
  );

  return {
    resolvedCity: String(cityComponent?.long_name || firstResult.formatted_address || city),
    country: String(countryComponent?.long_name || ""),
    latitude: numberValue(location.lat, "google.geocoding.latitude"),
    longitude: numberValue(location.lng, "google.geocoding.longitude"),
  };
}

async function fetchGoogleWeatherFallback(city: string): Promise<any> {
  const apiKey = getGoogleMapsPlatformKey();
  if (!apiKey) {
    throw new WeatherServiceError("GOOGLE_MAPS_PLATFORM_KEY is not configured.");
  }

  const location = await fetchGoogleLocation(canonicalWeatherCityQuery(city), apiKey);
  const locationParams = {
    "location.latitude": location.latitude,
    "location.longitude": location.longitude,
    unitsSystem: "METRIC",
  };
  const [current, hourly, daily, airQuality] = await Promise.all([
    fetchGoogleJson<any>(
      buildGoogleUrl(GOOGLE_WEATHER_BASE, "/v1/currentConditions:lookup", locationParams, apiKey),
      "Google current weather request"
    ),
    fetchGoogleJson<any>(
      buildGoogleUrl(
        GOOGLE_WEATHER_BASE,
        "/v1/forecast/hours:lookup",
        { ...locationParams, hours: 24, pageSize: 24 },
        apiKey
      ),
      "Google hourly weather request"
    ),
    fetchGoogleJson<any>(
      buildGoogleUrl(
        GOOGLE_WEATHER_BASE,
        "/v1/forecast/days:lookup",
        { ...locationParams, days: 7, pageSize: 7 },
        apiKey
      ),
      "Google daily weather request"
    ),
    fetchGoogleJson<any>(
      buildGoogleUrl(GOOGLE_AIR_QUALITY_BASE, "/v1/currentConditions:lookup", {}, apiKey),
      "Google air-quality request",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          extraComputations: ["POLLUTANT_CONCENTRATION"],
          languageCode: "en",
        }),
      }
    ),
  ]);

  const forecastHours = Array.isArray(hourly.forecastHours) ? hourly.forecastHours : [];
  const forecastDays = Array.isArray(daily.forecastDays) ? daily.forecastDays : [];
  if (forecastHours.length < 24 || forecastDays.length < 7) {
    throw new WeatherServiceError("Google Weather returned an incomplete forecast timeline.");
  }

  const aqiIndex = numberValue(airQuality.indexes?.[0]?.aqi, "google.airQuality.aqi");
  const aqiPresentation = googleAqiPresentation(airQuality.indexes?.[0]?.category, aqiIndex);
  const pollutants = Array.isArray(airQuality.pollutants) ? airQuality.pollutants : [];
  const firstDay = forecastDays[0];
  const sunrise = String(firstDay?.sunEvents?.sunriseTime || "");
  const sunset = String(firstDay?.sunEvents?.sunsetTime || "");
  const sunriseMinutes = localMinutesFromIso(sunrise, "google.daily.sunrise");
  const sunsetMinutes = localMinutesFromIso(sunset, "google.daily.sunset");
  const firstDate = googleDisplayDate(firstDay?.displayDate, firstDay?.interval?.startTime || "");

  return {
    city: location.resolvedCity,
    country: location.country,
    lat: location.latitude,
    lon: location.longitude,
    observedAt: current.currentTime || new Date().toISOString(),
    timezone: String(current.timeZone?.id || daily.timeZone?.id || "auto"),
    tempC: rounded(googleDegrees(current.temperature, "google.current.temperature")),
    tempF: rounded(celsiusToFahrenheit(googleDegrees(current.temperature, "google.current.temperature"))),
    feelsLikeC: rounded(googleDegrees(current.feelsLikeTemperature, "google.current.feelsLikeTemperature")),
    feelsLikeF: rounded(celsiusToFahrenheit(googleDegrees(current.feelsLikeTemperature, "google.current.feelsLikeTemperature"))),
    condition: mapGoogleWeatherCondition(current.weatherCondition),
    humidity: rounded(numberValue(current.relativeHumidity, "google.current.relativeHumidity")),
    windKmh: rounded(googleQuantity(current.wind?.speed, "google.current.wind.speed")),
    windMph: rounded(kilometresToMiles(googleQuantity(current.wind?.speed, "google.current.wind.speed"))),
    windDir: windDirectionFromDegrees(numberValue(current.wind?.direction?.degrees, "google.current.wind.direction")),
    windGustKmh: rounded(googleQuantity(current.wind?.gust, "google.current.wind.gust")),
    windGustMph: rounded(kilometresToMiles(googleQuantity(current.wind?.gust, "google.current.wind.gust"))),
    pressureMb: rounded(numberValue(current.airPressure?.meanSeaLevelMillibars, "google.current.airPressure")),
    uvIndex: rounded(numberValue(current.uvIndex, "google.current.uvIndex"), 1),
    visibilityKm: rounded(googleQuantity(current.visibility, "google.current.visibility"), 1),
    visibilityMiles: rounded(kilometresToMiles(googleQuantity(current.visibility, "google.current.visibility")), 1),
    cloudCover: rounded(numberValue(current.cloudCover, "google.current.cloudCover")),
    rainProb: googleRainProbability(current),
    precipitationMm: rounded(googleQuantity(current.precipitation?.qpf, "google.current.precipitation"), 1),
    rainMm: rounded(googleQuantity(current.precipitation?.qpf, "google.current.rain"), 1),
    aqi: {
      index: rounded(aqiIndex),
      pm25: googlePollutantValue(pollutants, "pm25"),
      pm10: googlePollutantValue(pollutants, "pm10"),
      o3: googlePollutantValue(pollutants, "o3"),
      no2: googlePollutantValue(pollutants, "no2"),
      so2: googlePollutantValue(pollutants, "so2"),
      co: googlePollutantValue(pollutants, "co") / 1000,
      label: aqiPresentation.label,
      color: aqiPresentation.color,
    },
    astronomy: {
      sunrise: formatIsoTime12Hour(sunrise, "google.daily.sunrise"),
      sunset: formatIsoTime12Hour(sunset, "google.daily.sunset"),
      goldenHourMorning:
        formatMinutes12Hour(sunriseMinutes) +
        " - " +
        formatMinutes12Hour(sunriseMinutes + 60),
      goldenHourEvening:
        formatMinutes12Hour(sunsetMinutes - 60) +
        " - " +
        formatMinutes12Hour(sunsetMinutes),
      blueHourMorning:
        formatMinutes12Hour(sunriseMinutes - 30) +
        " - " +
        formatMinutes12Hour(sunriseMinutes),
      blueHourEvening:
        formatMinutes12Hour(sunsetMinutes) +
        " - " +
        formatMinutes12Hour(sunsetMinutes + 30),
      moonPhase: googleMoonPhase(firstDay?.moonEvents?.moonPhase),
      moonIllumination: moonDataForDate(firstDate).illumination,
      stargazingScore: rounded(
        clamp(95 - numberValue(firstDay.daytimeForecast?.cloudCover, "google.daily.cloudCover") * 0.55, 0, 100)
      ),
    },
    alerts: [],
    hourly: forecastHours.slice(0, 24).map((item: any) => {
      const timestamp = String(item?.interval?.startTime || "");
      const windKmh = googleQuantity(item?.wind?.speed, "google.hourly.wind.speed");
      const hour = Number(googleDisplayHour(item?.displayDateTime, timestamp).slice(0, 2));
      return {
        time: googleDisplayHour(item?.displayDateTime, timestamp),
        timestamp,
        tempC: rounded(googleDegrees(item?.temperature, "google.hourly.temperature")),
        tempF: rounded(celsiusToFahrenheit(googleDegrees(item?.temperature, "google.hourly.temperature"))),
        condition: mapGoogleWeatherCondition(item?.weatherCondition),
        rainProb: googleRainProbability(item),
        precipitationMm: rounded(googleQuantity(item?.precipitation?.qpf, "google.hourly.precipitation"), 1),
        rainMm: rounded(googleQuantity(item?.precipitation?.qpf, "google.hourly.rain"), 1),
        cloudCover: rounded(numberValue(item?.cloudCover, "google.hourly.cloudCover")),
        visibilityKm: rounded(googleQuantity(item?.visibility, "google.hourly.visibility"), 1),
        windKmh: rounded(windKmh),
        windMph: rounded(kilometresToMiles(windKmh)),
        isWorkHour: hour >= 9 && hour <= 18,
      };
    }),
    daily: forecastDays.slice(0, 7).map((item: any) => {
      const date = googleDisplayDate(item?.displayDate, item?.interval?.startTime || "");
      return {
        date,
        dayName: dayNameFromDate(date),
        maxTempC: rounded(googleDegrees(item?.maxTemperature, "google.daily.maxTemperature")),
        maxTempF: rounded(celsiusToFahrenheit(googleDegrees(item?.maxTemperature, "google.daily.maxTemperature"))),
        minTempC: rounded(googleDegrees(item?.minTemperature, "google.daily.minTemperature")),
        minTempF: rounded(celsiusToFahrenheit(googleDegrees(item?.minTemperature, "google.daily.minTemperature"))),
        condition: mapGoogleWeatherCondition(item?.daytimeForecast?.weatherCondition),
        rainProb: googleRainProbability(item?.daytimeForecast),
        uvIndex: rounded(numberValue(item?.daytimeForecast?.uvIndex, "google.daily.uvIndex"), 1),
        aqi: rounded(aqiIndex),
      };
    }),
    source: {
      provider: "Google Weather",
      geocodingApi: "google",
      forecastApi: "google",
      airQualityApi: "google",
      fetchedAt: new Date().toISOString(),
    },
  };
}

async function fetchRealTimeWeather(city: string): Promise<any> {
  const requestedCity = canonicalWeatherCityQuery(city);
  if (requestedCity.length < 2) {
    throw new WeatherServiceError(
      "Enter a city name containing at least two characters.",
      400
    );
  }

  const searchName = requestedCity.split(",")[0].trim();
  const geocodingResult = await fetchOpenMeteoResource<any>(
    PUBLIC_GEOCODING_BASE,
    "/v1/search",
    {
      name: searchName,
      count: 10,
      language: "en",
      format: "json",
    },
    "geocoding request"
  );

  const geocodingMatches = Array.isArray(geocodingResult.data?.results)
    ? geocodingResult.data.results
    : [];
  if (geocodingMatches.length === 0) {
    throw new WeatherServiceError(
      "No Open-Meteo location matched " + requestedCity + ".",
      404
    );
  }

  const location = chooseGeocodingResult(geocodingMatches, requestedCity);
  const latitude = numberValue(location?.latitude, "geocoding.latitude");
  const longitude = numberValue(location?.longitude, "geocoding.longitude");
  const resolvedCity = String(location?.name || "").trim();
  const country = String(location?.country || location?.country_code || "").trim();
  if (!resolvedCity || !country) {
    throw new WeatherServiceError(
      "Open-Meteo geocoding returned incomplete location metadata."
    );
  }

  const timezone = String(location?.timezone || "auto");
  const commonParams = {
    latitude,
    longitude,
    timezone,
  };

  const [forecastResult, airQualityResult] = await Promise.all([
    fetchOpenMeteoResource<any>(
      PUBLIC_FORECAST_BASE,
      "/v1/forecast",
      {
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
      },
      "forecast request"
    ),
    fetchOpenMeteoResource<any>(
      PUBLIC_AIR_QUALITY_BASE,
      "/v1/air-quality",
      {
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
      },
      "air-quality request"
    ),
  ]);

  const forecast = forecastResult.data;
  const current = forecast?.current;
  const hourly = forecast?.hourly;
  const daily = forecast?.daily;
  const currentAir = airQualityResult.data?.current;
  const hourlyAir = airQualityResult.data?.hourly;
  if (!current || !hourly || !daily || !currentAir || !hourlyAir) {
    throw new WeatherServiceError(
      "Open-Meteo returned an incomplete weather or air-quality response."
    );
  }

  const hourlyTimes: string[] = Array.isArray(hourly.time)
    ? hourly.time.map(String)
    : [];
  const currentTime = String(current.time || "");
  const currentHourKey = currentTime.slice(0, 13);
  let currentHourlyIndex = hourlyTimes.findIndex(
    (time) => time.slice(0, 13) === currentHourKey
  );
  if (currentHourlyIndex < 0) {
    currentHourlyIndex = hourlyTimes.findIndex(
      (time) => time >= currentHourKey + ":00"
    );
  }
  if (currentHourlyIndex < 0 || hourlyTimes.length - currentHourlyIndex < 24) {
    throw new WeatherServiceError(
      "Open-Meteo did not return a complete next-24-hour forecast."
    );
  }

  const hourlyIndices = Array.from(
    { length: 24 },
    (_, offset) => currentHourlyIndex + offset
  );
  const hourlyList = hourlyIndices.map((index) => {
    const timestamp = hourlyTimes[index];
    const hour = Number(timestamp.slice(11, 13));
    const temperatureC = numberValue(
      hourly.temperature_2m?.[index],
      "hourly.temperature_2m"
    );
    const windKmh = numberValue(
      hourly.wind_speed_10m?.[index],
      "hourly.wind_speed_10m"
    );

    return {
      time: timestamp.slice(11, 16),
      timestamp,
      tempC: rounded(temperatureC),
      tempF: rounded(celsiusToFahrenheit(temperatureC)),
      condition: mapWmoCode(
        numberValue(hourly.weather_code?.[index], "hourly.weather_code")
      ),
      rainProb: rounded(
        numberValue(
          hourly.precipitation_probability?.[index],
          "hourly.precipitation_probability"
        )
      ),
      precipitationMm: rounded(
        numberValue(hourly.precipitation?.[index], "hourly.precipitation"),
        1
      ),
      rainMm: rounded(
        numberValue(hourly.rain?.[index], "hourly.rain"),
        1
      ),
      cloudCover: rounded(
        numberValue(hourly.cloud_cover?.[index], "hourly.cloud_cover")
      ),
      visibilityKm: rounded(
        numberValue(hourly.visibility?.[index], "hourly.visibility") / 1000,
        1
      ),
      windKmh: rounded(windKmh),
      windMph: rounded(kilometresToMiles(windKmh)),
      isWorkHour: hour >= 9 && hour <= 18,
    };
  });

  const airTimes: string[] = Array.isArray(hourlyAir.time)
    ? hourlyAir.time.map(String)
    : [];
  const airValues: unknown[] = Array.isArray(hourlyAir.european_aqi)
    ? hourlyAir.european_aqi
    : [];
  const dailyAqiValues = new Map<string, number[]>();
  airTimes.forEach((timestamp, index) => {
    const value = airValues[index];
    if (value === null || value === undefined) return;
    const numericValue = numberValue(value, "hourly.european_aqi");
    const date = timestamp.slice(0, 10);
    const existing = dailyAqiValues.get(date) || [];
    existing.push(numericValue);
    dailyAqiValues.set(date, existing);
  });
  const currentEuropeanAqi = numberValue(
    currentAir.european_aqi,
    "current.european_aqi"
  );
  const fallbackDailyAqi = (date: string) => {
    const availableDates = Array.from(dailyAqiValues.keys()).sort();
    const closestDate =
      availableDates
        .filter((availableDate) => availableDate <= date)
        .pop() || availableDates[0];
    const values = closestDate ? dailyAqiValues.get(closestDate) : undefined;
    return values && values.length > 0
      ? rounded(Math.max(...values))
      : rounded(currentEuropeanAqi);
  };

  const dailyTimes: string[] = Array.isArray(daily.time)
    ? daily.time.map(String)
    : [];
  if (dailyTimes.length === 0) {
    throw new WeatherServiceError("Open-Meteo returned no daily forecast.");
  }

  const dailyList = dailyTimes.slice(0, 7).map((date, index) => {
    const maxTemperatureC = numberValue(
      daily.temperature_2m_max?.[index],
      "daily.temperature_2m_max"
    );
    const minTemperatureC = numberValue(
      daily.temperature_2m_min?.[index],
      "daily.temperature_2m_min"
    );
    const aqiForDate = dailyAqiValues.get(date);
    const dailyAqi = aqiForDate && aqiForDate.length > 0
      ? rounded(Math.max(...aqiForDate))
      : fallbackDailyAqi(date);

    return {
      date,
      dayName: dayNameFromDate(date),
      maxTempC: rounded(maxTemperatureC),
      maxTempF: rounded(celsiusToFahrenheit(maxTemperatureC)),
      minTempC: rounded(minTemperatureC),
      minTempF: rounded(celsiusToFahrenheit(minTemperatureC)),
      condition: mapWmoCode(
        numberValue(daily.weather_code?.[index], "daily.weather_code")
      ),
      rainProb: rounded(
        numberValue(
          daily.precipitation_probability_max?.[index],
          "daily.precipitation_probability_max"
        )
      ),
      uvIndex: rounded(
        numberValue(daily.uv_index_max?.[index], "daily.uv_index_max"),
        1
      ),
      aqi: dailyAqi,
    };
  });

  const temperatureC = numberValue(current.temperature_2m, "current.temperature_2m");
  const feelsLikeC = numberValue(
    current.apparent_temperature,
    "current.apparent_temperature"
  );
  const windKmh = numberValue(current.wind_speed_10m, "current.wind_speed_10m");
  const windGustKmh = numberValue(
    current.wind_gusts_10m,
    "current.wind_gusts_10m"
  );
  const visibilityKm = numberValue(
    current.visibility,
    "current.visibility"
  ) / 1000;
  const cloudCover = numberValue(current.cloud_cover, "current.cloud_cover");
  const rainProbability = current.precipitation_probability === null ||
    current.precipitation_probability === undefined
    ? numberValue(
        hourly.precipitation_probability?.[currentHourlyIndex],
        "hourly.precipitation_probability"
      )
    : numberValue(
        current.precipitation_probability,
        "current.precipitation_probability"
      );

  const aqiPresentation = europeanAqiPresentation(currentEuropeanAqi);

  const firstSunrise = String(daily.sunrise?.[0] || "");
  const firstSunset = String(daily.sunset?.[0] || "");
  const sunriseMinutes = localMinutesFromIso(firstSunrise, "daily.sunrise");
  const sunsetMinutes = localMinutesFromIso(firstSunset, "daily.sunset");
  const moon = moonDataForDate(dailyTimes[0]);

  const nightIndices = hourlyIndices.filter((index) => {
    const minutes = localMinutesFromIso(hourlyTimes[index], "hourly.time");
    return minutes <= sunriseMinutes || minutes >= sunsetMinutes;
  });
  const stargazingIndices = nightIndices.length > 0 ? nightIndices : hourlyIndices;
  const averageNightCloudCover = average(
    stargazingIndices.map((index) =>
      numberValue(hourly.cloud_cover?.[index], "hourly.cloud_cover")
    )
  );
  const averageNightRainProbability = average(
    stargazingIndices.map((index) =>
      numberValue(
        hourly.precipitation_probability?.[index],
        "hourly.precipitation_probability"
      )
    )
  );
  const averageNightVisibilityKm = average(
    stargazingIndices.map((index) =>
      numberValue(hourly.visibility?.[index], "hourly.visibility") / 1000
    )
  );
  const stargazingScore = rounded(
    clamp(
      95 -
        averageNightCloudCover * 0.55 -
        averageNightRainProbability * 0.2 -
        moon.illumination * 0.15 +
        Math.min(averageNightVisibilityKm, 20) / 2,
      0,
      100
    )
  );

  return {
    city: resolvedCity,
    country,
    lat: latitude,
    lon: longitude,
    observedAt: currentTime,
    timezone: String(forecast.timezone || timezone),
    utcOffsetSeconds: numberValue(
      forecast.utc_offset_seconds,
      "utc_offset_seconds"
    ),
    tempC: rounded(temperatureC),
    tempF: rounded(celsiusToFahrenheit(temperatureC)),
    feelsLikeC: rounded(feelsLikeC),
    feelsLikeF: rounded(celsiusToFahrenheit(feelsLikeC)),
    condition: mapWmoCode(
      numberValue(current.weather_code, "current.weather_code")
    ),
    humidity: rounded(
      numberValue(current.relative_humidity_2m, "current.relative_humidity_2m")
    ),
    windKmh: rounded(windKmh),
    windMph: rounded(kilometresToMiles(windKmh)),
    windDir: windDirectionFromDegrees(
      numberValue(current.wind_direction_10m, "current.wind_direction_10m")
    ),
    windGustKmh: rounded(windGustKmh),
    windGustMph: rounded(kilometresToMiles(windGustKmh)),
    pressureMb: rounded(numberValue(current.pressure_msl, "current.pressure_msl")),
    uvIndex: rounded(numberValue(current.uv_index, "current.uv_index"), 1),
    visibilityKm: rounded(visibilityKm, 1),
    visibilityMiles: rounded(kilometresToMiles(visibilityKm), 1),
    cloudCover: rounded(cloudCover),
    rainProb: rounded(rainProbability),
    precipitationMm: rounded(
      numberValue(current.precipitation, "current.precipitation"),
      1
    ),
    rainMm: rounded(numberValue(current.rain, "current.rain"), 1),
    aqi: {
      index: rounded(currentEuropeanAqi),
      pm25: rounded(numberValue(currentAir.pm2_5, "current.pm2_5"), 1),
      pm10: rounded(numberValue(currentAir.pm10, "current.pm10"), 1),
      o3: rounded(numberValue(currentAir.ozone, "current.ozone"), 1),
      no2: rounded(
        numberValue(currentAir.nitrogen_dioxide, "current.nitrogen_dioxide"),
        1
      ),
      so2: rounded(
        numberValue(currentAir.sulphur_dioxide, "current.sulphur_dioxide"),
        1
      ),
      co: rounded(
        numberValue(currentAir.carbon_monoxide, "current.carbon_monoxide") / 1000,
        2
      ),
      label: aqiPresentation.label,
      color: aqiPresentation.color,
    },
    astronomy: {
      sunrise: formatIsoTime12Hour(firstSunrise, "daily.sunrise"),
      sunset: formatIsoTime12Hour(firstSunset, "daily.sunset"),
      goldenHourMorning:
        formatMinutes12Hour(sunriseMinutes) +
        " - " +
        formatMinutes12Hour(sunriseMinutes + 60),
      goldenHourEvening:
        formatMinutes12Hour(sunsetMinutes - 60) +
        " - " +
        formatMinutes12Hour(sunsetMinutes),
      blueHourMorning:
        formatMinutes12Hour(sunriseMinutes - 30) +
        " - " +
        formatMinutes12Hour(sunriseMinutes),
      blueHourEvening:
        formatMinutes12Hour(sunsetMinutes) +
        " - " +
        formatMinutes12Hour(sunsetMinutes + 30),
      moonPhase: moon.phase,
      moonIllumination: moon.illumination,
      stargazingScore,
    },
    alerts: [],
    hourly: hourlyList,
    daily: dailyList,
    source: {
      provider: "Open-Meteo",
      geocodingApi: geocodingResult.tier,
      forecastApi: forecastResult.tier,
      airQualityApi: airQualityResult.tier,
      fetchedAt: new Date().toISOString(),
    },
  };
}

// ----------------- Canonical Open-Meteo weather API -----------------
app.get("/api/weather", async (req, res) => {
  const cityParam = req.query.city;
  if (typeof cityParam !== "string") {
    return res.status(400).json({
      error: "Invalid city",
      message: "Provide one city using the city query parameter.",
      provider: "Open-Meteo",
    });
  }

  try {
    const liveWeather = await fetchRealTimeWeather(cityParam);
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.json(liveWeather);
  } catch (openMeteoError: any) {
    try {
      const googleWeather = await fetchGoogleWeatherFallback(cityParam);
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.json(googleWeather);
    } catch (googleError: any) {
      const googleMessage = googleError instanceof Error
        ? googleError.message
        : "Google Weather fallback is unavailable.";
      console.warn("Google Weather fallback failed:", googleMessage);
    }

    const error = openMeteoError;
    const statusCode = error instanceof WeatherServiceError
      ? error.statusCode
      : 502;
    const message = error instanceof Error
      ? error.message
      : "Live weather data is currently unavailable.";
    console.error("Open-Meteo weather request failed:", message);
    return res.status(statusCode).json({
      error: statusCode === 404 ? "City not found" : "Live weather unavailable",
      message,
      provider: "Open-Meteo",
      fallbackProvider: "Google Weather",
    });
  }
});

/// ----------------- Multi-turn Chatbot Weather Expert -----------------
app.post("/api/ai/chat", async (req, res) => {
  const { messages, currentCity } = req.body;
  const lastMessage = messages[messages.length - 1]?.content || "";
  const lastMsgLower = lastMessage.toLowerCase();
  
  const ai = getGeminiClient();

  if (!ai) {
    // Highly intelligent interactive simulation fallback
    const liveWeather = await fetchRealTimeWeather(currentCity || "Delhi");
    
    let content = "";
    
    if (lastMsgLower.includes("hi") || lastMsgLower.includes("hello") || lastMsgLower.includes("hey")) {
      content = `Hello! I am your AeroCast Copilot. I specialize in weather planning, packing strategies, aviation delay prediction, and Google Workspace alignment. 

How can I optimize your travel schedule today? Ask me about weather details, if it will rain, if it will be cold, or what my system prompt is!`;
    } else if (lastMsgLower.includes("system prompt") || lastMsgLower.includes("who are you") || lastMsgLower.includes("help me") || lastMsgLower.includes("role")) {
      content = `My system prompt configures me as **the ultimate Weather and Travel Consultant AI for busy professionals and elite travelers**. 
      
My instructions are to:
- Maintain a highly composed, helpful, authoritative, and direct tone.
- Actively help you coordinate business flights, outdoor scheduling slots, and packing strategies.
- Warn you about real-time aviation crosswinds, rain probabilities, and extreme UV exposures.
- Access live meteorological satellite feeds to verify conditions!`;
    } else if (lastMsgLower.includes("rain") || lastMsgLower.includes("wet") || lastMsgLower.includes("umbrella")) {
      const prob = liveWeather.rainProb;
      const cond = liveWeather.condition.text;
      content = `For ${liveWeather.city}: The current conditions are **${cond}** with a rain probability of **${prob}%**. 
      
${prob > 40 ? "🌧️ Yes, precipitation probability is high. You should pack a heavy business trenchcoat and keep an umbrella handy." : "☀️ Rain probability is minimal right now. Outdoor commutes and runway activities should proceed without obstruction."}`;
    } else if (lastMsgLower.includes("cold") || lastMsgLower.includes("temperature") || lastMsgLower.includes("hot") || lastMsgLower.includes("warm")) {
      const temp = liveWeather.tempC;
      content = `For ${liveWeather.city}: The temperature is currently **${temp}°C** (${liveWeather.tempF}°F), feels like **${liveWeather.feelsLikeC}°C**. 
      
${temp < 15 ? "🧣 It is quite cold! Standard corporate layers, wool blazer, or formal trench outerwear are highly advised." : temp > 28 ? "☀️ It is warm! Light linen shirts, breathable fabrics, and UV shielding are ideal." : "👔 The temperature is moderate and comfortable. standard business casual blazer attire is perfectly suited."}`;
    } else {
      content = `I have consulted the live meteorological feed for **${liveWeather.city}**. 
      
Currently, it is **${liveWeather.tempC}°C** with **${liveWeather.condition.text}** conditions and **${liveWeather.windKmh} km/h** winds. 
 
Planning travels or aligning calendars? Ask me specific queries like "Will it rain?", "Is it cold?", or "What is your system prompt?", and I will provide directly actionable advice!`;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const tokens = content.split(/(\s+)/);
    let i = 0;
    const interval = setInterval(() => {
      if (i < tokens.length) {
        const textChunk = tokens[i];
        res.write(`data: ${JSON.stringify({ text: textChunk })}\n\n`);
        i++;
      } else {
        res.write("data: [DONE]\n\n");
        res.end();
        clearInterval(interval);
      }
    }, 20);

    req.on("close", () => {
      clearInterval(interval);
    });
    return;
  }

  try {
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are the ultimate Weather and Travel Consultant AI for busy professionals and elite travelers.
        Your tone is highly composed, helpful, authoritative, and direct.
        You understand corporate travel needs, aviation rules, packing optimization, outdoor scheduling, and calendar weather risks.
        Current selected city: ${currentCity || "Delhi"}. 
        
        CRITICAL Directives:
        1. If the user greets you with "Hi" or "Hello", respond warmly, introduce yourself as the AeroCast Copilot, state your system prompt purpose clearly (Weather and Travel expert co-pilot), and ask how you can optimize their schedule.
        2. If the user asks about weather parameters (like rain, cold, wind), provide specific travel tips (attire, flight safety warnings) based on the current city's context.
        3. Keep your advice crisp, directly actionable, and professional.`
      }
    });

    for await (const chunk of responseStream) {
      const text = chunk.text || "";
      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    const isQuotaExceeded = error?.message?.includes("Quota exceeded") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
    if (isQuotaExceeded) {
      console.log("Chat API: Quota exceeded. Returning fallback simulation answer.");
      const liveWeather = await fetchRealTimeWeather(currentCity || "Delhi");
      const fallbackText = `My cloud AI quota has been temporarily reached. Here is my offline simulation mode update for ${liveWeather.city}: The current temperature is ${liveWeather.tempC}°C with ${liveWeather.condition.text}. I am still fully ready to help you plan with standard advice!`;
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      console.log("Chat API error:", error?.message || error);
      res.write(`data: ${JSON.stringify({ text: "I encountered a synchronization error with the Gemini cloud server. Please retry." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  }
});

// ----------------- TTS Spoken Morning Briefings -----------------
app.post("/api/ai/tts", async (req, res) => {
  const { text, voice } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({ audioUrl: null, text: "Gemini TTS not available (Simulation mode)" });
  }

  try {
    console.log("Generating spoken weather briefing via gemini-3.1-flash-tts-preview...");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Say clearly and professional: ${text}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Kore" } // Kore, Puck, Fenrir, Zephyr
          }
        }
      }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        audioUrl: `data:audio/wav;base64,${base64Audio}`,
        text
      });
    } else {
      return res.status(500).json({ error: "No audio data returned from TTS" });
    }
  } catch (error: any) {
    const isQuotaExceeded = error?.message?.includes("Quota exceeded") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
    if (isQuotaExceeded) {
      console.log("TTS API: Quota exceeded. Returning simulation message.");
      return res.json({ audioUrl: null, text: text + " (Running in TTS Simulation mode due to API quota limit)" });
    } else {
      console.log("TTS API error:", error?.message || error);
      res.status(500).json({ error: "Failed to generate TTS audio" });
    }
  }
});

// ----------------- High-Thinking Itinerary Planner -----------------
app.post("/api/ai/itinerary", async (req, res) => {
  const { destination, days, startDate, activities, flightNumber } = req.body;
  const ai = getGeminiClient();

  if (!ai) {
    return res.json({
      itinerary: `[Simulation Mode] Here is a premium business itinerary for ${destination} starting ${startDate}.
      - Day 1: Flight ${flightNumber || 'UA102'} arriving. Weather suggests moderate humidity. Indoor briefing at 2:00 PM.
      - Day 2: Executive round-table. Highly recommended to carry light umbrella.
      - AI delay warning: Low risk based on seasonal winds. Packing: Business-casual, light layers.`
    });
  }

  try {
    console.log(`Generating high-thinking itinerary for ${destination}...`);
    const prompt = `
      Create a highly professional, meticulously planned travel itinerary for a business traveler/busy professional visiting "${destination}" for ${days} days starting on ${startDate}.
      Activities to coordinate: ${JSON.stringify(activities || [])}.
      Flight number: ${flightNumber || "N/A"}.

      Your analysis MUST include:
      1. A day-by-day business-friendly schedule optimized around optimal weather slots (e.g. suggesting outdoor activities only during dry hours, indoor client meetings during high heat or rainy slots).
      2. AI Flight delay risk assessment (Low/Medium/High) based on expected regional seasonal weather and wind hazards.
      3. Precise Packing suggestions divided by categories: Executive Apparel, Weather Protection, Travel Essentials.
      4. Crucial travel advisory warnings if extreme wind, air pollution, or severe weather is common.

      Format the output with beautiful, scannable markdown with bold headings and structured bullet points.
    `;

    // High Thinking Mode with gemini-3.1-pro-preview
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH
        }
      }
    });

    return res.json({
      itinerary: response.text || "Failed to compile thinking itinerary."
    });
  } catch (error: any) {
    const isQuotaExceeded = error?.message?.includes("Quota exceeded") || error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429;
    if (isQuotaExceeded) {
      console.log("High Thinking API: Quota exceeded. Returning fallback simulated itinerary.");
      return res.json({
        itinerary: `[Simulation Mode - Quota Exceeded] Here is your professional itinerary for ${destination} starting ${startDate}:
- **Day 1**: Arrival. Expected regional weather patterns are stable. Recommended to schedule client dinners after sunset to avoid high heat.
- **Day 2**: Outdoor site visits. Best scheduled in mid-morning when UV levels are moderate.
- **Aviation Status**: Low risk of delay based on current climatology vectors.
- **Packing Tips**: Corporate casual, light umbrella, sunglass protective wear.`
      });
    } else {
      console.log("High Thinking API error:", error?.message || error);
      res.status(500).json({ error: "Failed to compile high-thinking itinerary" });
    }
  }
});

// ----------------- Vite Integration & Server Startup -----------------
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

const serverReady = configureServer();

async function startServer() {
  await serverReady;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default async function handler(req: any, res: any) {
  await serverReady;
  return app(req, res);
}
