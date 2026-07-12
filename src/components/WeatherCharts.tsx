/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  HourlyForecast, 
  DailyForecast 
} from "../types";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { Calendar, Clock, Briefcase, Sun, CloudRain } from "lucide-react";
import { GeminiLogo } from "./AIAssistant";

interface WeatherChartsProps {
  hourly?: HourlyForecast[];
  daily?: DailyForecast[];
  tempUnit: 'C' | 'F';
  isLoading?: boolean;
}

export default function WeatherCharts({ hourly, daily, tempUnit, isLoading }: WeatherChartsProps) {
  const [activeChartTab, setActiveChartTab] = useState<'hourly' | 'daily'>('hourly');

  if (isLoading || !hourly || !daily) {
    return (
      <div
        id="weather-charts-card-loading"
        className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-6"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Aerocast is loading hourly and daily forecast trends.</span>

        <div aria-hidden="true" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <GeminiLogo className="w-4.5 h-4.5 animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-4.5 w-44 max-w-full bg-slate-700/80 rounded-md animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-2.5 w-28 bg-sky-500/20 rounded-full animate-pulse motion-reduce:animate-none"></div>
                </div>
              </div>
              <div className="h-3 w-72 max-w-full bg-slate-800/60 rounded-md animate-pulse motion-reduce:animate-none"></div>
            </div>

            <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 flex self-start sm:self-auto shrink-0">
              <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse motion-reduce:animate-none"></div>
              <div className="h-8 w-32 rounded-lg flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded bg-slate-800/80 animate-pulse motion-reduce:animate-none"></div>
                <div className="h-2.5 w-20 bg-slate-800/60 rounded animate-pulse motion-reduce:animate-none"></div>
              </div>
            </div>
          </div>

          <div className="h-[320px] w-full bg-slate-900/30 border border-slate-800/30 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-5 bottom-8 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30"></div>

            <div className="absolute inset-x-8 bottom-8 h-44 flex items-end justify-between gap-2 opacity-80">
              {[38, 52, 46, 68, 57, 75, 63, 81, 70, 61, 48, 56].map((height, index) => (
                <div key={index} className="h-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-sky-500/5 to-sky-500/20 animate-pulse motion-reduce:animate-none"
                    style={{ height: `${height}%` }}
                  ></div>
                </div>
              ))}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-[#0B0F1A]/90 border border-sky-500/15 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-xl">
                <div className="relative w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                  <GeminiLogo className="w-6 h-6 animate-spin motion-reduce:animate-none" style={{ animationDuration: '4s' }} />
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-sky-400 font-mono tracking-wider uppercase font-bold">Aerocast Forecast Engine</span>
                  <span className="block text-[10px] text-slate-500">Plotting live weather signals...</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-x-8 bottom-3 flex justify-between">
              {[0, 1, 2, 3, 4, 5].map(index => (
                <div key={index} className="h-2 w-7 bg-slate-800/70 rounded animate-pulse motion-reduce:animate-none"></div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["emerald", "indigo"].map((tone, index) => (
              <div key={tone} className="flex items-start gap-2">
                <div className={`w-4 h-4 mt-0.5 rounded ${index === 0 ? "bg-emerald-500/20" : "bg-indigo-500/20"} animate-pulse motion-reduce:animate-none`}></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-slate-700/70 rounded animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-2.5 w-full bg-slate-800/60 rounded animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-2.5 w-4/5 bg-slate-800/50 rounded animate-pulse motion-reduce:animate-none"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hourlyData = hourly.map(item => ({
    time: item.time,
    temp: tempUnit === 'C' ? item.tempC : item.tempF,
    rainProb: item.rainProb,
    wind: item.windKmh,
    isWorkHour: item.isWorkHour
  }));

  const dailyData = daily.map(item => ({
    day: item.dayName,
    maxTemp: tempUnit === 'C' ? item.maxTempC : item.maxTempF,
    minTemp: tempUnit === 'C' ? item.minTempC : item.minTempF,
    rainProb: item.rainProb,
    aqi: item.aqi
  }));

  // Custom tooltips for elegant dark styling
  const CustomHourlyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isWork = hourly.find(h => h.time === label)?.isWorkHour;
      return (
        <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" /> {label}
            {isWork && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-bold">Work Hour</span>}
          </p>
          <div className="space-y-1 text-xs">
            <p className="text-white font-medium">Temperature: <strong className="text-sky-400">{payload[0].value}°{tempUnit}</strong></p>
            {payload[1] && <p className="text-slate-400">Rain Chance: <strong className="text-indigo-400">{payload[1].value}%</strong></p>}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomDailyTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-400" /> {label}
          </p>
          <div className="space-y-1 text-xs">
            <p className="text-white font-medium">Max Temp: <strong className="text-sky-400">{payload[0].value}°{tempUnit}</strong></p>
            {payload[1] && <p className="text-slate-400">Min Temp: <strong className="text-indigo-300">{payload[1].value}°{tempUnit}</strong></p>}
            {payload[2] && <p className="text-slate-400">Rain Chance: <strong className="text-indigo-400">{payload[2].value}%</strong></p>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="weather-charts-card" className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl">
      {/* Chart Headers & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
            Weather Forecast Trends
          </h3>
          <p className="text-xs text-slate-400">Track precipitation probability and temperature transitions</p>
        </div>

        <div className="bg-slate-900/50 p-1 rounded-xl border border-slate-800/50 flex self-start sm:self-auto shrink-0">
          <button
            id="chart-tab-hourly"
            onClick={() => setActiveChartTab('hourly')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeChartTab === 'hourly' 
                ? "bg-slate-800 text-white shadow-inner" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            24H Hourly
          </button>
          <button
            id="chart-tab-daily"
            onClick={() => setActiveChartTab('daily')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              activeChartTab === 'daily' 
                ? "bg-slate-800 text-white shadow-inner" 
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            7-Day Forecast
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[320px] w-full">
        {activeChartTab === 'hourly' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
              <XAxis 
                dataKey="time" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(tick) => {
                  // thin out hours to make it pretty
                  const hour = parseInt(tick.split(":")[0]);
                  return hour % 3 === 0 ? tick : "";
                }}
              />
              <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit={`°`} />
              <YAxis yAxisId="right" orientation="right" stroke="#4f46e5" fontSize={10} tickLine={false} axisLine={false} unit="%" />
              <Tooltip content={<CustomHourlyTooltip />} />
              <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#tempGrad)" name="Temperature" />
              <Area yAxisId="right" type="monotone" dataKey="rainProb" stroke="#6366f1" strokeWidth={1.5} fillOpacity={0.8} fill="url(#rainGrad)" name="Rain Chance" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.4} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} unit={`°`} />
              <Tooltip content={<CustomDailyTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Line type="monotone" dataKey="maxTemp" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 6 }} name="High Temp" />
              <Line type="monotone" dataKey="minTemp" stroke="#38bdf8" strokeWidth={2} name="Low Temp" />
              <Line type="monotone" dataKey="rainProb" stroke="#4f46e5" strokeWidth={1.5} strokeDasharray="5 5" name="Rain Prob %" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Corporate Commute Optimization Legend */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-4 text-xs text-slate-400">
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Office Hour Windows</span>
            <p className="text-[10px] leading-relaxed text-slate-500">Working hours (09:00 - 18:00) highlighted on daily overlays for traveler planning convenience.</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CloudRain className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Precipitation Risks</span>
            <p className="text-[10px] leading-relaxed text-slate-500">Overlapped probability indexes allow smart rain navigation in client schedule alignments.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
