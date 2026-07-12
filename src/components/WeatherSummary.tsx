/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  WeatherData,
  SevereAlert
} from "../types";
import {
  Search,
  Wind,
  Droplets,
  Sun,
  AlertOctagon,
  Compass,
  Eye,
  Gauge,
  CloudRain,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MapPin
} from "lucide-react";

const AQI_BADGE_STYLES: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  yellow: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

interface WeatherSummaryProps {
  weather: WeatherData;
  tempUnit: 'C' | 'F';
  windUnit: 'kmh' | 'mph';
  onCitySearch: (city: string) => void;
  isLoading: boolean;
}

export default function WeatherSummary({
  weather,
  tempUnit,
  windUnit,
  onCitySearch,
  isLoading
}: WeatherSummaryProps) {
  const [searchVal, setSearchVal] = useState("");
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      onCitySearch(searchVal.trim());
    }
  };

  const getTemp = (c: number, f: number) => {
    return tempUnit === 'C' ? `${c}°C` : `${f}°F`;
  };

  const getWind = (kmh: number, mph: number) => {
    return windUnit === 'kmh' ? `${kmh} km/h` : `${mph} mph`;
  };

  const getBeaufort = (kmh: number) => {
    if (kmh < 2) return "Calm";
    if (kmh < 11) return "Light breeze";
    if (kmh < 28) return "Moderate breeze";
    if (kmh < 49) return "Strong breeze";
    if (kmh < 74) return "Gale warning";
    return "Severe storm";
  };

  const getUvRisk = (uv: number) => {
    if (uv <= 2) return { label: "Low risk", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (uv <= 5) return { label: "Moderate risk", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
    if (uv <= 7) return { label: "High risk (Sunscreen req.)", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    if (uv <= 10) return { label: "Very High risk", color: "text-red-400 bg-red-500/10 border-red-500/20" };
    return { label: "Extreme risk (Stay indoors)", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
  };

  const uvRisk = getUvRisk(weather.uvIndex);

  return (
    <div id="weather-summary-panel" className="space-y-6">
      {/* City Search Bar */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            id="city-search-input"
            type="text"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search cities (e.g., Delhi, Mumbai)..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl focus:outline-none focus:border-sky-500/50 text-slate-100 placeholder-slate-400 text-sm transition-all shadow-inner"
          />
        </div>
        <button
          id="search-submit-btn"
          type="submit"
          disabled={isLoading}
          className="px-5 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-sky-600/10 shrink-0"
        >
          {isLoading ? "Consulting..." : "Analyze"}
        </button>
      </form>

      {/* Severe Weather Alerts Section */}
      {weather.alerts && weather.alerts.length > 0 && (
        <div id="severe-alerts-container" className="space-y-3">
          {weather.alerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;
            return (
              <div
                key={alert.id}
                id={`alert-card-${alert.id}`}
                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 transition-all hover:bg-amber-500/15"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded uppercase tracking-wider">
                          {alert.severity} Alert
                        </span>
                        <span className="text-xs text-amber-300 font-medium">Issued by {alert.sender}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-100 mt-1.5">{alert.headline}</h4>
                    </div>
                  </div>
                  <button
                    id={`alert-toggle-${alert.id}`}
                    onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                    className="p-1 text-amber-400 hover:text-amber-300 rounded transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 pl-11 text-xs text-slate-300 space-y-2 border-t border-amber-500/20 pt-3">
                    <p className="leading-relaxed whitespace-pre-line">{alert.description}</p>
                    <div className="grid grid-cols-2 gap-4 pt-2 text-[11px] font-mono">
                      <div>
                        <span className="text-amber-400">Affected Areas:</span> {alert.areas.join(", ")}
                      </div>
                      <div className="text-right">
                        <span className="text-amber-400">Expires:</span> {alert.ends}
                      </div>
                    </div>
                    <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/15 mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-amber-200">🛩️ Traveler Impact: Severe risk of flight delays, turbulence, and terminal gates lockdowns.</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Glassmorphic Current Weather Card */}
      <div id="main-current-weather-card" className="bg-gradient-to-br from-sky-600/20 to-blue-900/10 border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-40 sm:w-80 h-40 sm:h-80 bg-sky-500/10 blur-[100px] rounded-full -z-10"></div>
        <div className="absolute bottom-0 left-0 w-40 sm:w-80 h-40 sm:h-80 bg-indigo-500/5 blur-[100px] rounded-full -z-10"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          {/* Main Temperature & Info */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium flex-wrap">
              <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-slate-200">{weather.city}, {weather.country}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-slate-300 rounded-full font-mono hidden sm:inline">
                {Math.abs(weather.lat).toFixed(2)}°{weather.lat >= 0 ? "N" : "S"}, {Math.abs(weather.lon).toFixed(2)}°{weather.lon >= 0 ? "E" : "W"}
              </span>
            </div>

            <div className="flex items-baseline gap-3 sm:gap-4">
              <span className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tighter text-white">
                {getTemp(weather.tempC, weather.tempF)}
              </span>
              <div className="space-y-0.5 min-w-0">
                <span className="text-base sm:text-lg font-medium text-slate-200 block truncate">{weather.condition.text}</span>
                <span className="text-xs text-slate-400 block font-mono">
                  Feels like: <strong className="text-slate-300 font-semibold">{getTemp(weather.feelsLikeC, weather.feelsLikeF)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto shrink-0 border-t md:border-t-0 md:border-l border-white/10 md:pl-6 pt-4 md:pt-0">
            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              <Wind className="w-5 h-5 text-sky-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Wind speed</span>
                <span className="text-sm font-semibold text-slate-200">{getWind(weather.windKmh, weather.windMph)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              <Droplets className="w-5 h-5 text-teal-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Humidity</span>
                <span className="text-sm font-semibold text-slate-200">{weather.humidity}%</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              <Sun className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">UV Index</span>
                <span className="text-sm font-semibold text-slate-200">{weather.uvIndex}</span>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800/50">
              <CloudRain className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Precipitation</span>
                <span className="text-sm font-semibold text-slate-200">{weather.precipitationMm} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Advisory banner */}
        <div className="mt-4 sm:mt-5 p-3 bg-white/5 backdrop-blur-md rounded-xl sm:rounded-2xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-sky-200">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            <span>
              {weather.precipitationMm > 0
                ? "💼 Umbrella recommended. Plan client meetings indoors."
                : weather.windKmh > 25
                  ? "✈️ Travel notice: Strong winds might delay executive regional flights."
                  : "🌤️ Optimal conditions for client luncheons & outdoor commutes."}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-sky-400 font-semibold shrink-0">
            AI Advisory
          </span>
        </div>
      </div>

      {/* Six Micro Metrics Cards Grid */}
      <div id="weather-micro-metrics-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Air Quality Index */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Air Quality</h5>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono border ${AQI_BADGE_STYLES[weather.aqi.color] || AQI_BADGE_STYLES.yellow}`}>
              {weather.aqi.label}
            </span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white">AQI {weather.aqi.index}</span>
            <span className="text-xs text-slate-500">fine particles</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="block text-[8px] text-slate-500">PM2.5</span>
              <span className="text-slate-300 font-medium">{weather.aqi.pm25} µg/m³</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500">O3</span>
              <span className="text-slate-300 font-medium">{weather.aqi.o3} Âµg/mÂ³</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-500">CO</span>
              <span className="text-slate-300 font-medium">{weather.aqi.co} mg/m³</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.aqi.label === "Good"
              ? "Perfect weather for standard outdoor travel and corporate activities."
              : "Sensitive individuals should wear clean masks or reduce outdoor duration."}
          </p>
        </div>

        {/* Card 2: Wind and Flight Impact */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Wind & Aero</h5>
            <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono">
              {weather.windDir} ({getBeaufort(weather.windKmh)})
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full border border-slate-700 bg-slate-950/40 flex items-center justify-center relative shadow-inner">
              <Compass className="w-8 h-8 text-sky-400 animate-spin" style={{ animationDuration: '40s' }} />
              <span className="absolute -top-1 text-[8px] font-mono text-slate-500 font-bold">N</span>
              <span className="absolute -bottom-1 text-[8px] font-mono text-slate-500 font-bold">S</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-2xl font-extrabold text-white">{getWind(weather.windKmh, weather.windMph)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">Gusts to {getWind(weather.windGustKmh, weather.windGustMph)}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.windKmh > 30
              ? "🚨 Caution: High potential for airline disruptions, flight rescheduling or crosswind hazards."
              : "✈️ Aero status: Optimal runway and take-off conditions for local commercial hubs."}
          </p>
        </div>

        {/* Card 3: UV Index and Dress Recommendation */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Sun & UV Protection</h5>
            <span className={`px-2 py-0.5 rounded border text-[10px] font-mono ${uvRisk.color}`}>
              {uvRisk.label}
            </span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white">Index {weather.uvIndex}</span>
            <span className="text-xs text-slate-500">out of 11+</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (weather.uvIndex / 11) * 100)}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.uvIndex >= 6
              ? "🕴️ Apparel advice: UV is high. Apply block, wear shades, and shield in light business linens."
              : "🕶️ Safe levels. No special protective formal layers or clothing required."}
          </p>
        </div>

        {/* Card 4: Rain & Moisture Details */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Precipitation & Rain</h5>
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-[10px] font-mono">
              Rain Chance: {weather.rainProb}%
            </span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white">{weather.precipitationMm} mm</span>
            <span className="text-xs text-slate-500">daily volume</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.rainProb > 60
              ? "🌧️ Wet commute warning. Ensure travel itinerary coordinates outdoor schedules safely around rain windows."
              : "☀️ No rain expected. Perfect timing for walking to client centers or terminals."}
          </p>
        </div>

        {/* Card 5: Visibility & Logistics */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Logistical Visibility</h5>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white">
              {windUnit === "kmh" ? `${weather.visibilityKm} km` : `${weather.visibilityMiles} mi`}
            </span>
            <span className="text-xs text-slate-500">horizontal sight</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.visibilityKm < 5
              ? "🌫️ Heavy smog/fog alert. High risk of runway takeoff holds or commuter traffic delays."
              : "🌟 Pristine visibility. Clear air allows perfect transit logistics and timing."}
          </p>
        </div>

        {/* Card 6: Barometric Pressure */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Barometric Pressure</h5>
            <Gauge className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-extrabold text-white">{weather.pressureMb} hPa</span>
            <span className="text-xs text-slate-500">atm pressure</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-normal">
            {weather.pressureMb < 1009
              ? "📉 Low pressure system. Storm weather, precipitation, or unstable winds will likely follow."
              : "📈 Steady High pressure system. Stable, calm, and predictable weather forecast pattern."}
          </p>
        </div>
      </div>
    </div>
  );
}
