/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  WeatherData, 
  UserSettings, 
  UserCity, 
  TripItinerary, 
  CalendarEvent, 
  TaskItem, 
  SmartTrigger 
} from "./types";
import { auth, getDocument, setDocument, googleProvider } from "./firebase";
import { fetchOpenMeteoDirect } from "./openMeteoDirect";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInWithPopup } from "firebase/auth";
import Sidebar from "./components/Sidebar";
import WeatherSummary from "./components/WeatherSummary";
import WeatherCharts from "./components/WeatherCharts";
import WeatherMap from "./components/WeatherMap";
import AIAssistant, { GeminiLogo } from "./components/AIAssistant";
import TravelPlanner from "./components/TravelPlanner";
import WorkspaceSync from "./components/WorkspaceSync";
import DashboardWidgets from "./components/DashboardWidgets";
import AstronomyMetrics from "./components/AstronomyMetrics";
import SmartNotifications from "./components/SmartNotifications";
import HelpGuides from "./components/HelpGuides";
import { 
  CloudSun, 
  AlertCircle, 
  BellRing, 
  Loader2, 
  X, 
  Check, 
  Mail, 
  Lock, 
  Globe,
  RefreshCw
} from "lucide-react";

const THEME_OPTIONS = new Set(["light", "dark", "system"]);

const getSystemTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const getCachedTheme = (): UserSettings["theme"] => {
  if (typeof window === "undefined") return "system";
  try {
    const cached = JSON.parse(localStorage.getItem("weather_user_settings") || "null");
    return THEME_OPTIONS.has(cached?.theme) ? cached.theme : "system";
  } catch {
    return "system";
  }
};

const resolveTheme = (theme: UserSettings["theme"]): "light" | "dark" => (
  theme === "light" || theme === "dark" ? theme : getSystemTheme()
);

const canonicalCityName = (city: string): string => {
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
};

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown, field: string): UnknownRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Weather response is missing ${field}.`);
  }
  return value as UnknownRecord;
};

const asString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Weather response has an invalid ${field}.`);
  }
  return value;
};

const asNumber = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Weather response has an invalid ${field}.`);
  }
  return parsed;
};

const asCondition = (value: unknown, field: string): WeatherData["condition"] => {
  const condition = asRecord(value, field);
  return {
    text: asString(condition.text, `${field}.text`),
    code: asNumber(condition.code, `${field}.code`),
  };
};

/**
 * Runtime mapping keeps the server contract aligned with every data-heavy widget.
 * Invalid or partial API payloads fail visibly instead of leaking stale placeholders
 * into the dashboard.
 */
const mapWeatherResponse = (raw: unknown): WeatherData => {
  const response = asRecord(raw, "payload");
  const payload = response.weather ? asRecord(response.weather, "weather") : response;
  const aqi = asRecord(payload.aqi, "aqi");
  const astronomy = asRecord(payload.astronomy, "astronomy");
  const hourly = Array.isArray(payload.hourly) ? payload.hourly : null;
  const daily = Array.isArray(payload.daily) ? payload.daily : null;

  if (!hourly?.length || !daily?.length) {
    throw new Error("Open-Meteo returned an incomplete forecast timeline.");
  }

  return {
    city: asString(payload.city, "city"),
    country: asString(payload.country, "country"),
    lat: asNumber(payload.lat, "latitude"),
    lon: asNumber(payload.lon, "longitude"),
    tempC: asNumber(payload.tempC, "temperature"),
    tempF: asNumber(payload.tempF, "temperature Fahrenheit"),
    feelsLikeC: asNumber(payload.feelsLikeC, "feels-like temperature"),
    feelsLikeF: asNumber(payload.feelsLikeF, "feels-like temperature Fahrenheit"),
    condition: asCondition(payload.condition, "condition"),
    humidity: asNumber(payload.humidity, "humidity"),
    windKmh: asNumber(payload.windKmh, "wind speed"),
    windMph: asNumber(payload.windMph, "wind speed MPH"),
    windDir: asString(payload.windDir, "wind direction"),
    windGustKmh: asNumber(payload.windGustKmh, "wind gust"),
    windGustMph: asNumber(payload.windGustMph, "wind gust MPH"),
    pressureMb: asNumber(payload.pressureMb, "pressure"),
    uvIndex: asNumber(payload.uvIndex, "UV index"),
    visibilityKm: asNumber(payload.visibilityKm, "visibility"),
    visibilityMiles: asNumber(payload.visibilityMiles, "visibility miles"),
    rainProb: asNumber(payload.rainProb, "rain probability"),
    precipitationMm: asNumber(payload.precipitationMm, "precipitation"),
    aqi: {
      index: asNumber(aqi.index, "air quality index"),
      pm25: asNumber(aqi.pm25, "PM2.5"),
      pm10: asNumber(aqi.pm10, "PM10"),
      o3: asNumber(aqi.o3, "ozone"),
      no2: asNumber(aqi.no2, "nitrogen dioxide"),
      so2: asNumber(aqi.so2, "sulphur dioxide"),
      co: asNumber(aqi.co, "carbon monoxide"),
      label: asString(aqi.label, "AQI label") as WeatherData["aqi"]["label"],
      color: asString(aqi.color, "AQI color"),
    },
    astronomy: {
      sunrise: asString(astronomy.sunrise, "sunrise"),
      sunset: asString(astronomy.sunset, "sunset"),
      goldenHourMorning: asString(astronomy.goldenHourMorning, "morning golden hour"),
      goldenHourEvening: asString(astronomy.goldenHourEvening, "evening golden hour"),
      blueHourMorning: asString(astronomy.blueHourMorning, "morning blue hour"),
      blueHourEvening: asString(astronomy.blueHourEvening, "evening blue hour"),
      moonPhase: asString(astronomy.moonPhase, "moon phase") as WeatherData["astronomy"]["moonPhase"],
      moonIllumination: asNumber(astronomy.moonIllumination, "moon illumination"),
      stargazingScore: asNumber(astronomy.stargazingScore, "stargazing score"),
    },
    alerts: Array.isArray(payload.alerts) ? payload.alerts as WeatherData["alerts"] : [],
    hourly: hourly.map((item, index) => {
      const row = asRecord(item, `hourly[${index}]`);
      return {
        time: asString(row.time, `hourly[${index}].time`),
        tempC: asNumber(row.tempC, `hourly[${index}].tempC`),
        tempF: asNumber(row.tempF, `hourly[${index}].tempF`),
        condition: asCondition(row.condition, `hourly[${index}].condition`),
        rainProb: asNumber(row.rainProb, `hourly[${index}].rainProb`),
        windKmh: asNumber(row.windKmh, `hourly[${index}].windKmh`),
        windMph: asNumber(row.windMph, `hourly[${index}].windMph`),
        isWorkHour: Boolean(row.isWorkHour),
      };
    }),
    daily: daily.map((item, index) => {
      const row = asRecord(item, `daily[${index}]`);
      return {
        date: asString(row.date, `daily[${index}].date`),
        dayName: asString(row.dayName, `daily[${index}].dayName`),
        maxTempC: asNumber(row.maxTempC, `daily[${index}].maxTempC`),
        maxTempF: asNumber(row.maxTempF, `daily[${index}].maxTempF`),
        minTempC: asNumber(row.minTempC, `daily[${index}].minTempC`),
        minTempF: asNumber(row.minTempF, `daily[${index}].minTempF`),
        condition: asCondition(row.condition, `daily[${index}].condition`),
        rainProb: asNumber(row.rainProb, `daily[${index}].rainProb`),
        uvIndex: asNumber(row.uvIndex, `daily[${index}].uvIndex`),
        aqi: asNumber(row.aqi, `daily[${index}].aqi`),
      };
    }),
  };
};

function DashboardLoadingState({ settings }: { settings: UserSettings }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading live Aerocast weather">
      <div className="aerocast-loading-shell rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <div className="aerocast-brand-orbit" aria-hidden="true">
            <GeminiLogo className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sky-300 font-mono">Aerocast live forecast is loading…</h3>
            <p className="text-xs text-slate-400">Mapping Open-Meteo observations to your dashboard</p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400">Live feed</span>
      </div>

      {settings.enabledWidgets.includes("weather_summary") && (
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl" aria-hidden="true">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="aerocast-skeleton h-6 w-48 rounded-lg" />
              <div className="aerocast-skeleton h-3 w-32 rounded-full" />
            </div>
            <div className="aerocast-skeleton h-10 w-36 rounded-xl" />
          </div>
          <div className="mt-7 grid grid-cols-1 gap-6 border-t border-slate-800/40 pt-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="flex items-center gap-5">
              <div className="aerocast-skeleton h-20 w-20 shrink-0 rounded-3xl" />
              <div className="space-y-3">
                <div className="aerocast-skeleton h-12 w-28 rounded-xl" />
                <div className="aerocast-skeleton h-4 w-36 rounded-full" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-800/40 bg-slate-900/40 p-4 space-y-2">
                  <div className="aerocast-skeleton h-2.5 w-12 rounded-full" />
                  <div className="aerocast-skeleton h-5 w-16 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {settings.enabledWidgets.includes("hourly") && (
          <WeatherCharts hourly={undefined} daily={undefined} tempUnit={settings.tempUnit} isLoading />
        )}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-5" aria-hidden="true">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="aerocast-skeleton h-5 w-52 rounded-lg" />
              <div className="aerocast-skeleton h-3 w-44 rounded-full" />
            </div>
            <div className="aerocast-skeleton h-9 w-24 rounded-xl" />
          </div>
          <div className="aerocast-map-skeleton h-[380px] rounded-2xl border border-slate-800/40 relative overflow-hidden">
            <div className="absolute inset-0 aerocast-map-grid" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3">
              <GeminiLogo className="w-10 h-10" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Centering selected city</span>
            </div>
          </div>
        </div>
      </div>

      {settings.enabledWidgets.includes("astronomy") && (
        <AstronomyMetrics astronomy={undefined} isLoading />
      )}
    </div>
  );
}

function WeatherLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="bg-[#0B0F1A] border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl" role="alert">
      <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
        <AlertCircle className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-white">Live weather is temporarily unavailable</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry Live Forecast
      </button>
    </div>
  );
}

export default function App() {
  // Auth state
  const [user, setUser] = useState<any>({ email: "guest@aerocast.io", uid: "guest-bypass-key" });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // App Layout States
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [activeCity, setActiveCity] = useState("Delhi");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0);
  const weatherRequestId = useRef(0);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(getCachedTheme()));

  // Toast Notifications
  const [activeToast, setActiveToast] = useState<{ id: string; message: string; type: 'info' | 'success' | 'alert' } | null>(null);

  // Core persisted settings. Cached preferences are applied during the first
  // render so Light/System users do not see a dark-theme flash.
  const [settings, setSettings] = useState<UserSettings>(() => {
    const defaults: UserSettings = {
      userId: "guest",
      tempUnit: "C",
      windUnit: "kmh",
      dashboardProfile: "Professional",
      theme: "system",
      enabledWidgets: ['weather_summary', 'hourly', 'daily', 'aqi', 'astronomy', 'smart_notifications'],
      smartTriggers: [
      {
        id: "tr-1",
        name: "Wet commute alert",
        metric: "rain",
        operator: "greater_than",
        value: 60,
        message: "🌧️ Commute advisory: Precipitation exceeds 60%. Pack heavy business trenchcoats & umbrellas.",
        isActive: true
      },
      {
        id: "tr-2",
        name: "Extreme solar exposure warning",
        metric: "uv",
        operator: "greater_than",
        value: 7,
        message: "🕶️ UV Alert: Exposure index exceeds 7. Carry block creams and dress in light formal linens.",
        isActive: true
      },
      {
        id: "tr-3",
        name: "Regional crosswind delay warning",
        metric: "wind",
        operator: "greater_than",
        value: 28,
        message: "✈️ Aero hazard: Wind speeds exceeds 28 km/h. Regional corporate flights may suffer terminal hold-ups.",
        isActive: true
      }
      ]
    };

    try {
      const cached = JSON.parse(localStorage.getItem("weather_user_settings") || "null");
      if (!cached || typeof cached !== "object") return defaults;
      const cachedTheme = THEME_OPTIONS.has(cached.theme) ? cached.theme : defaults.theme;
      return { ...defaults, ...cached, theme: cachedTheme };
    } catch {
      return defaults;
    }
  });

  const [favoriteCities, setFavoriteCities] = useState<UserCity[]>([
    { id: "fav-1", name: "Delhi", country: "India", lat: 28.6139, lon: 77.2090, isPinned: true, isFavorite: true },
    { id: "fav-2", name: "Bengaluru, Karnataka, India", country: "India", lat: 12.9716, lon: 77.5946, isPinned: false, isFavorite: true },
    { id: "fav-3", name: "Hyderabad", country: "India", lat: 17.3850, lon: 78.4867, isPinned: false, isFavorite: true },
    { id: "fav-4", name: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, isPinned: false, isFavorite: true },
    { id: "fav-5", name: "Kolkata", country: "India", lat: 22.5726, lon: 88.3639, isPinned: false, isFavorite: true },
    { id: "fav-6", name: "Chennai", country: "India", lat: 13.0827, lon: 80.2707, isPinned: false, isFavorite: true }
  ]);

  const [itineraries, setItineraries] = useState<TripItinerary[]>([
    {
      id: "it-1",
      userId: "guest",
      destinationCity: "Bengaluru, Karnataka, India",
      startDate: "2026-07-15",
      endDate: "2026-07-18",
      flightNumber: "AI 501",
      flightDelayRisk: "Low",
      packingList: [
        { id: "p-1", name: "Breathable formal suit", category: "Apparel", checked: true },
        { id: "p-2", name: "Type C/D power brick", category: "Electronics", checked: false },
        { id: "p-3", name: "Executive umbrella", category: "Apparel", checked: false }
      ],
      activities: [
        { id: "a-1", name: "Executive Board briefing at Tech Park", time: "10:00 AM", date: "2026-07-16", isOutdoor: false },
        { id: "a-2", name: "Campus walk & sunset garden tour", time: "05:30 PM", date: "2026-07-17", isOutdoor: true, weatherWarning: "Winds look calm." }
      ],
      aiNotes: "Bengaluru weather is excellent and pleasant. Ideal window for board briefing and outdoor garden walk."
    }
  ]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([
    {
      id: "ev-1",
      title: "Quarterly Board Presentation",
      start: "2026-07-11T10:00:00.000Z",
      end: "2026-07-11T12:00:00.000Z",
      location: "Delhi Corporate Office",
      affectedByWeather: false,
      weatherAlertLevel: "none"
    },
    {
      id: "ev-2",
      title: "Outdoor Client Photo-shoot & Luncheon",
      start: "2026-07-11T13:00:00.000Z",
      end: "2026-07-11T16:30:00.000Z",
      location: "Lodi Gardens Exhibition",
      affectedByWeather: true,
      weatherAlertLevel: "warn",
      weatherDetails: "High temperature, and high UV rating near noon.",
      suggestedAction: "Organize hydration spots and secure shaded canopies."
    },
    {
      id: "ev-3",
      title: "Aviation Heli-transfer to Airport Terminal",
      start: "2026-07-11T18:00:00.000Z",
      end: "2026-07-11T18:45:00.000Z",
      location: "IGI Airport (DEL)",
      affectedByWeather: true,
      weatherAlertLevel: "critical",
      weatherDetails: "Advisory crosswind warning issued. Runway winds may peak near 35 km/h.",
      suggestedAction: "Reschedule flight to a safer early morning slot or book terminal rail shuttle."
    }
  ]);

  const [tasksList, setTasksList] = useState<TaskItem[]>([
    { id: "t-1", title: "Review corporate flight tickets", dueDate: "2026-07-11", isCompleted: true, weatherDependent: false, weatherStatus: "ok" },
    { id: "t-2", title: "Inspect solar arrays installations", dueDate: "2026-07-12", isCompleted: false, weatherDependent: true, weatherStatus: "bad", suggestedRescheduleDate: "2026-07-15" },
    { id: "t-3", title: "Lawn care & external venue layout", dueDate: "2026-07-11", isCompleted: false, weatherDependent: true, weatherStatus: "risky", suggestedRescheduleDate: "2026-07-14" }
  ]);

  // Auth Sync Listener
  useEffect(() => {
    if (auth) {
      const unsub = auth.onAuthStateChanged((firebaseUser: any) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          loadUserData(firebaseUser.uid);
          triggerToast(`Welcome back, ${firebaseUser.email}! Sync active.`, 'success');
        } else {
          setUser(null);
          triggerToast("Logged out successfully.", 'info');
        }
      });
      return unsub;
    }
  }, []);

  // Theme Sync & Application
  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveTheme(settings.theme);
      const root = document.documentElement;
      setResolvedTheme(nextTheme);
      root.dataset.theme = nextTheme;
      root.style.colorScheme = nextTheme;
      root.classList.toggle("light-mode", nextTheme === "light");
      root.classList.toggle("dark-mode", nextTheme === "dark");

      const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      themeColor?.setAttribute("content", nextTheme === "light" ? "#f8fafc" : "#020617");
    };

    applyTheme();

    if (settings.theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: light)");
      const listener = () => applyTheme();
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, [settings.theme]);

  // Fetch live weather for the selected city. Aborting the previous request
  // prevents slower responses from overwriting a newer city selection.
  useEffect(() => {
    const controller = new AbortController();
    void fetchWeather(activeCity, controller.signal);
    return () => controller.abort();
  }, [activeCity, weatherRefreshToken]);

  useEffect(() => {
    const canonicalCity = canonicalCityName(activeCity);
    if (canonicalCity !== activeCity) {
      setActiveCity(canonicalCity);
    }
  }, [activeCity]);

  // OPEN_METEO_API_KEY remains on the server. The browser requests the
  // canonical, UI-shaped Open-Meteo response from this same-origin endpoint.
  const fetchWeather = async (city: string, signal: AbortSignal): Promise<void> => {
    const requestId = ++weatherRequestId.current;
    setIsLoadingWeather(true);
    setWeatherError(null);
    setWeather(null);

    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, {
        signal,
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const detail = payload && typeof payload === "object"
          ? String(
              "message" in payload
                ? (payload as { message: unknown }).message
                : "error" in payload
                  ? (payload as { error: unknown }).error
                  : `Open-Meteo request failed with status ${res.status}.`
            )
          : `Open-Meteo request failed with status ${res.status}.`;
        throw new Error(detail);
      }

      const data = mapWeatherResponse(payload);
      if (signal.aborted || requestId !== weatherRequestId.current) return;

      setWeather(data);

      // Check smart trigger conditions based on fetched weather metrics
      checkSmartTriggers(data);

    } catch (err: unknown) {
      if (signal.aborted || requestId !== weatherRequestId.current) return;
      if (err instanceof Error && err.name === "AbortError") return;

      console.warn("Server API failed, attempting client-side direct fallback...", err);
      try {
        const data = await fetchOpenMeteoDirect(city, signal);
        if (signal.aborted || requestId !== weatherRequestId.current) return;
        setWeather(data);
        checkSmartTriggers(data);
        triggerToast("Connected to live Open-Meteo direct feed.", "success");
      } catch (fallbackErr: any) {
        if (signal.aborted || requestId !== weatherRequestId.current) return;
        const message = fallbackErr instanceof Error ? fallbackErr.message : "The live forecast request failed.";
        console.error("Failed to load live Open-Meteo weather client-side:", fallbackErr);
        setWeatherError(message);
        triggerToast("Live weather could not be refreshed. Retry when the connection is available.", "alert");
      }
    } finally {
      if (!signal.aborted && requestId === weatherRequestId.current) {
        setIsLoadingWeather(false);
      }
    }
  };

  const checkSmartTriggers = (data: WeatherData) => {
    settings.smartTriggers.forEach(tr => {
      if (!tr.isActive) return;
      let matched = false;
      if (tr.metric === 'rain' && data.rainProb > Number(tr.value)) matched = true;
      if (tr.metric === 'temp' && data.tempC > Number(tr.value)) matched = true;
      if (tr.metric === 'uv' && data.uvIndex > Number(tr.value)) matched = true;
      if (tr.metric === 'wind' && data.windKmh > Number(tr.value)) matched = true;

      if (matched) {
        setTimeout(() => {
          triggerToast(tr.message, 'alert');
        }, 1500);
      }
    });
  };

  // User auth operations
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      if (auth && googleProvider) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          if (result?.user) {
            setUser({ email: result.user.email, uid: result.user.uid });
            triggerToast("Authorized with Google successfully.", "success");
          }
        } catch (innerErr: any) {
          if (innerErr?.code?.includes("unauthorized-domain") || innerErr?.message?.includes("unauthorized-domain")) {
            console.warn("Domain not authorized in Firebase. Falling back to local simulation mode...");
            setUser({ email: "google.guest@gmail.com", uid: "google-mock-uid" });
            triggerToast("Authorized via Google (Local Simulation Fallback)", "success");
          } else {
            throw innerErr;
          }
        }
      } else {
        // Fallback mock Google Sign-In
        setUser({ email: "corporate.guest@gmail.com", uid: "google-mock-uid" });
        triggerToast("Google Authorization active (Local Simulation)", "success");
      }
    } catch (err: any) {
      console.error("Google Auth failed:", err);
      setAuthError(err.message || "Failed to authorize with Google.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) return;
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      if (isSignUp) {
        // Sign Up
        if (auth) {
          await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        } else {
          // Mock Sign up
          setUser({ email: authEmail, uid: `mock-${Date.now()}` });
        }
      } else {
        // Sign In
        if (auth) {
          await signInWithEmailAndPassword(auth, authEmail, authPassword);
        } else {
          // Mock Sign in
          setUser({ email: authEmail, uid: "mock-uid-guest" });
        }
      }
    } catch (err: any) {
      console.error("Auth failed:", err);
      setAuthError(err.message || "Credential authentication failure.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
    setUser({ email: "guest@aerocast.io", uid: "guest-bypass-key" });
    localStorage.removeItem("weather_user_settings");
    triggerToast("Authentication reset. Operating in guest simulator.", "info");
  };

  // Load / Save User Data from Firestore
  const loadUserData = async (uid: string) => {
    try {
      const dbSettings = await getDocument("users", uid);
      if (dbSettings) {
        const merged = {
          ...settings,
          ...dbSettings,
          userId: uid,
          theme: THEME_OPTIONS.has(dbSettings.theme) ? dbSettings.theme : settings.theme,
        } as UserSettings;
        setSettings(merged);
        localStorage.setItem("weather_user_settings", JSON.stringify(merged));
      }
    } catch (err) {
      console.error("Failed to sync Firestore settings:", err);
    }
  };

  const updateUserSettings = async (newSettings: Partial<UserSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("weather_user_settings", JSON.stringify(updated));
    const canPersistToFirestore = Boolean(user?.uid && auth?.currentUser?.uid === user.uid);
    if (canPersistToFirestore) {
      await setDocument("users", user.uid, updated);
    }
    triggerToast(
      canPersistToFirestore ? "Preferences saved to Firestore." : "Preferences saved on this device.",
      "success"
    );
  };

  // Favorites Hub
  const handleAddFavorite = (cityName: string) => {
    const newFav: UserCity = {
      id: `fav-${Date.now()}`,
      name: cityName,
      country: "Region",
      lat: 0,
      lon: 0,
      isPinned: false,
      isFavorite: true
    };
    setFavoriteCities(prev => [...prev, newFav]);
    triggerToast(`Added ${cityName} to travel destinations list.`, 'success');
  };

  const handleDeleteFavorite = (id: string) => {
    setFavoriteCities(prev => prev.filter(c => c.id !== id));
    triggerToast("Destination removed.", 'info');
  };

  // Itinerary CRUD
  const handleAddItinerary = (itinerary: TripItinerary) => {
    setItineraries(prev => {
      const idx = prev.findIndex(i => i.id === itinerary.id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx] = itinerary;
        return copy;
      }
      return [...prev, itinerary];
    });
    triggerToast("Itinerary saved successfully.", 'success');
  };

  const handleDeleteItinerary = (id: string) => {
    setItineraries(prev => prev.filter(i => i.id !== id));
    triggerToast("Itinerary deleted.", 'info');
  };

  // Tasks CRUD
  const handleToggleTask = (id: string) => {
    setTasksList(prev => prev.map(t => 
      t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
    ));
    triggerToast("Task status updated.", 'success');
  };

  const handleRescheduleTask = (id: string, newDate: string) => {
    setTasksList(prev => prev.map(t => 
      t.id === id ? { ...t, dueDate: newDate, weatherStatus: "ok" } : t
    ));
    triggerToast(`Task successfully rescheduled to ${newDate} (clear window).`, 'success');
  };

  // Toast helper
  const triggerToast = (msg: string, type: 'info' | 'success' | 'alert' = 'info') => {
    const id = `toast-${Date.now()}`;
    setActiveToast({ id, message: msg, type });
    setTimeout(() => {
      setActiveToast(current => current?.id === id ? null : current);
    }, 4500);
  };

  return (
    <div className={`min-h-screen font-sans flex flex-col antialiased transition-colors duration-300 ${
      resolvedTheme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-200'
    }`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sky-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>
      
      {/* Toast Alert Frame */}
      {activeToast && (
        <div 
          id="toast-notification-banner" 
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl border shadow-2xl flex items-start gap-3 max-w-sm transition-all duration-300 transform translate-y-0 ${
            activeToast.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
              : activeToast.type === 'alert'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-900 border-slate-800/50 text-slate-300'
          }`}
        >
          <BellRing className={`w-5 h-5 shrink-0 mt-0.5 ${activeToast.type === 'alert' ? 'animate-bounce' : ''}`} />
          <div className="flex-1 text-xs leading-relaxed font-mono">
            {activeToast.message}
          </div>
          <button 
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-slate-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Authenticated Main App Frame */}
      <div id="main-app-layout" className="flex flex-col md:flex-row flex-1">
          
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            user={user} 
            onLogout={handleLogout}
            dashboardProfile={settings.dashboardProfile}
            notificationsCount={settings.smartTriggers.filter(t => t.isActive).length}
          />

          <main id="main-content" className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            
            {/* Top Navigation / status bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-800/50">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white uppercase font-mono">
                  {activeTab === 'dashboard' ? `${activeCity} Intel` : activeTab.replace('_', ' ')}
                </h2>
                <p className="text-xs text-slate-400">
                  {activeTab === 'dashboard' ? `Real-time weather parameters and flight vector delay warnings` : `Optimize travel logs and Workspace parameters`}
                </p>
              </div>

              {/* Quick favorites swapper bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 max-w-full -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
                {favoriteCities.map((c) => (
                  <button
                    key={c.id}
                    id={`quick-fav-select-${c.name.toLowerCase()}`}
                    onClick={() => {
                      setActiveCity(canonicalCityName(c.name));
                      triggerToast(`Switched active hub to ${c.name}`, 'info');
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold font-mono transition-all whitespace-nowrap shrink-0 ${
                      activeCity.toLowerCase() === c.name.toLowerCase() 
                        ? "bg-sky-500/15 border-sky-500 text-sky-400" 
                        : "bg-[#0B0F1A] border-slate-800/50 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Weather loading state */}
            {activeTab === "dashboard" && isLoadingWeather ? (
              <>
                <DashboardLoadingState settings={settings} />
                <div className="hidden" aria-hidden="true">
                {/* Skeleton Header Banner with Aerocast AI logo */}
                <div className="bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-transparent border border-sky-500/10 rounded-2xl p-5 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-sky-500/20 rounded-full blur-sm"></div>
                      <GeminiLogo className="w-8 h-8 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-sky-300 font-mono">Aerocast AI Synthesis active...</h3>
                      <p className="text-xs text-slate-400 font-mono">Synchronizing live meteorological satellites & corporate itineraries</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                    <span>MET FEED ONLINE</span>
                  </div>
                </div>

                {/* Grid layout of skeleton cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Weather Summary Card Skeleton (Large - Span 2) */}
                  <div className="lg:col-span-2 bg-[#0B0F1A] border border-slate-800/40 rounded-3xl p-6 space-y-6 animate-pulse">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-2">
                        <div className="h-7 w-48 bg-slate-800 rounded-lg"></div>
                        <div className="h-4 w-32 bg-slate-800/50 rounded-lg"></div>
                      </div>
                      <div className="h-10 w-28 bg-slate-800 rounded-xl"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/30">
                      <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-full bg-slate-800 shrink-0"></div>
                        <div className="space-y-3 flex-1">
                          <div className="h-12 w-24 bg-slate-800 rounded-xl"></div>
                          <div className="h-4 w-28 bg-slate-800/50 rounded-lg"></div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/30">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="h-3 w-12 bg-slate-800 rounded"></div>
                            <div className="h-5 w-16 bg-slate-800 rounded"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Side Column: Astronomy & Sun info Skeleton */}
                  <div className="bg-[#0B0F1A] border border-slate-800/40 rounded-3xl p-6 space-y-6 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-5 w-36 bg-slate-800 rounded-lg"></div>
                      <div className="h-3 w-20 bg-slate-800/50 rounded-lg"></div>
                    </div>
                    <div className="h-12 w-full bg-indigo-500/5 border border-indigo-500/10 rounded-xl"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/30 space-y-3">
                        <div className="h-4 w-12 bg-slate-800 rounded"></div>
                        <div className="h-6 w-16 bg-slate-800 rounded"></div>
                      </div>
                      <div className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/30 space-y-3">
                        <div className="h-4 w-12 bg-slate-800 rounded"></div>
                        <div className="h-6 w-16 bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Grid: Map Skeleton (Span 2) & Charts/Aviation Risk Skeleton (Span 1) */}
                  <div className="lg:col-span-2 bg-[#0B0F1A] border border-slate-800/40 rounded-3xl p-6 space-y-6 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="space-y-2">
                        <div className="h-5 w-40 bg-slate-800 rounded-lg"></div>
                        <div className="h-3 w-28 bg-slate-800/50 rounded-lg"></div>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
                        <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
                      </div>
                    </div>
                    {/* Simulated Map Canvas */}
                    <div className="h-64 bg-slate-900/60 rounded-2xl border border-slate-800/30 relative overflow-hidden flex items-center justify-center">
                      {/* Grid overlay to represent radar */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35"></div>
                      <div className="relative flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-sky-500/20 animate-spin"></div>
                        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Generating Map Grid</span>
                      </div>
                    </div>
                  </div>

                  {/* Travel/Aviation Risk Widget Skeleton */}
                  <div className="bg-[#0B0F1A] border border-slate-800/40 rounded-3xl p-6 space-y-6 animate-pulse">
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-slate-800 rounded-lg"></div>
                      <div className="h-3 w-24 bg-slate-800/50 rounded-lg"></div>
                    </div>
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-900/30 p-3.5 rounded-xl border border-slate-800/30">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3.5 w-24 bg-slate-800 rounded"></div>
                            <div className="h-2.5 w-full bg-slate-800/50 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              </>
            ) : (
              /* Core Content Render Routing */
              <div id="rendered-content-container">
                {activeTab === "dashboard" && weatherError && (
                  <WeatherLoadError
                    message={weatherError}
                    onRetry={() => setWeatherRefreshToken(token => token + 1)}
                  />
                )}

                {activeTab === "dashboard" && weather && (
                  <div className="space-y-6">
                    {/* Render active widgets sorted by preference settings */}
                    {settings.enabledWidgets.includes('weather_summary') && (
                      <WeatherSummary 
                        weather={weather} 
                        tempUnit={settings.tempUnit} 
                        windUnit={settings.windUnit} 
                        onCitySearch={(city) => {
                          const nextCity = canonicalCityName(city);
                          setActiveCity(nextCity);
                          triggerToast(`Synthesizing forecasts for ${nextCity}`, 'info');
                        }}
                        isLoading={isLoadingWeather}
                      />
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {settings.enabledWidgets.includes('hourly') && (
                        <WeatherCharts 
                          hourly={weather.hourly} 
                          daily={weather.daily} 
                          tempUnit={settings.tempUnit} 
                          isLoading={isLoadingWeather}
                        />
                      )}
                      
                      {/* Weather Map visualizer */}
                      <WeatherMap 
                        activeCity={activeCity} 
                        onCitySelect={setActiveCity} 
                        lat={weather?.lat} 
                        lng={weather?.lon}
                        theme={resolvedTheme}
                      />
                    </div>

                    <div className="grid grid-cols-1">
                      {settings.enabledWidgets.includes('astronomy') && (
                        <AstronomyMetrics astronomy={weather.astronomy} isLoading={isLoadingWeather} />
                      )}
                    </div>
                  </div>
                )}

                {activeTab === "travel" && (
                  <TravelPlanner 
                    currentCity={activeCity} 
                    itineraries={itineraries}
                    onAddItinerary={handleAddItinerary}
                    onDeleteItinerary={handleDeleteItinerary}
                  />
                )}

                {activeTab === "workspace" && weather && (
                  <WorkspaceSync 
                    weather={weather}
                    calendarEvents={calendarEvents}
                    tasksList={tasksList}
                    onToggleTask={handleToggleTask}
                    onRescheduleTask={handleRescheduleTask}
                    onRefreshWorkspace={() => {
                      triggerToast("Google Calendar and Tasks synchronised successfully.", 'success');
                    }}
                  />
                )}

                {activeTab === "ai" && (
                  <AIAssistant currentCity={activeCity} />
                )}

                {activeTab === "alerts" && (
                  <SmartNotifications 
                    triggers={settings.smartTriggers}
                    onAddTrigger={(tr) => {
                      const updatedTriggers = [...settings.smartTriggers, tr];
                      updateUserSettings({ smartTriggers: updatedTriggers });
                    }}
                    onDeleteTrigger={(id) => {
                      const filtered = settings.smartTriggers.filter(t => t.id !== id);
                      updateUserSettings({ smartTriggers: filtered });
                    }}
                    onToggleTrigger={(id) => {
                      const toggled = settings.smartTriggers.map(t => 
                        t.id === id ? { ...t, isActive: !t.isActive } : t
                      );
                      updateUserSettings({ smartTriggers: toggled });
                    }}
                    onTriggerAlertSimulate={(msg) => triggerToast(msg, 'alert')}
                  />
                )}

                {activeTab === "personalize" && (
                  <DashboardWidgets 
                    settings={settings}
                    onUpdateSettings={updateUserSettings}
                    favoriteCities={favoriteCities}
                    onAddFavorite={handleAddFavorite}
                    onDeleteFavorite={handleDeleteFavorite}
                    onSelectFavorite={(cityName) => {
                      const nextCity = canonicalCityName(cityName);
                      setActiveCity(nextCity);
                      triggerToast(`Switched active hub city to ${nextCity}`, 'info');
                    }}
                  />
                )}

                {activeTab === "help" && (
                  <HelpGuides />
                )}
              </div>
            )}

          </main>

        </div>

    </div>
  );
}
