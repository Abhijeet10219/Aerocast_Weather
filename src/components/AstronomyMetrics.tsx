/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AstronomyData } from "../types";
import { 
  Sun, 
  Moon, 
  Sunset, 
  Sunrise, 
  Sparkles, 
  Camera, 
  Compass, 
  CloudRain 
} from "lucide-react";
import { GeminiLogo } from "./AIAssistant";

interface AstronomyMetricsProps {
  astronomy?: AstronomyData;
  isLoading?: boolean;
}

const parseTimeString = (timeStr: string): Date => {
  if (!timeStr) return new Date();
  const [time, modifier] = timeStr.split(" ");
  let [hoursStr, minutesStr] = time.split(":");
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (modifier?.toLowerCase() === "pm" && hours < 12) {
    hours += 12;
  }
  if (modifier?.toLowerCase() === "am" && hours === 12) {
    hours = 0;
  }
  
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
};

const getNextSolarEvent = (sunriseStr: string, sunsetStr: string): { type: "sunrise" | "sunset"; time: Date } => {
  const now = new Date();
  let sunriseDate = parseTimeString(sunriseStr || "06:00 AM");
  let sunsetDate = parseTimeString(sunsetStr || "06:00 PM");
  
  if (sunriseDate.getTime() < now.getTime()) {
    sunriseDate = new Date(sunriseDate.getTime() + 24 * 60 * 60 * 1000);
  }
  if (sunsetDate.getTime() < now.getTime()) {
    sunsetDate = new Date(sunsetDate.getTime() + 24 * 60 * 60 * 1000);
  }
  
  if (sunriseDate.getTime() < sunsetDate.getTime()) {
    return { type: "sunrise", time: sunriseDate };
  } else {
    return { type: "sunset", time: sunsetDate };
  }
};

export default function AstronomyMetrics({ astronomy, isLoading }: AstronomyMetricsProps) {
  const [countdownText, setCountdownText] = useState("");
  const [nextEventType, setNextEventType] = useState<"sunrise" | "sunset" | null>(null);

  useEffect(() => {
    if (isLoading || !astronomy) return;
    const updateCountdown = () => {
      const now = new Date();
      const nextEvent = getNextSolarEvent(astronomy.sunrise, astronomy.sunset);
      setNextEventType(nextEvent.type);
      
      const diffMs = nextEvent.time.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdownText("00h 00m 00s");
        return;
      }
      
      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      
      const formatted = `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
      setCountdownText(formatted);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [astronomy, isLoading]);
  
  const getMoonEmoji = (phase: string) => {
    const p = phase.toLowerCase();
    if (p.includes("new")) return "🌑";
    if (p.includes("waxing crescent")) return "🌒";
    if (p.includes("first quarter")) return "🌓";
    if (p.includes("waxing gibbous")) return "🌔";
    if (p.includes("full")) return "🌕";
    if (p.includes("waning gibbous")) return "🌖";
    if (p.includes("last quarter")) return "🌗";
    if (p.includes("waning crescent")) return "🌘";
    return "🌘";
  };

  const getStargazingLabel = (score: number) => {
    if (score >= 80) return { label: "Excellent conditions", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (score >= 60) return { label: "Good visibility", color: "text-sky-400 bg-sky-500/10 border-sky-500/20" };
    if (score >= 40) return { label: "Moderate (smog / haze)", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" };
    return { label: "Poor (Heavy overcast / moon glare)", color: "text-red-400 bg-red-500/10 border-red-500/20" };
  };

  if (isLoading || !astronomy) {
    return (
      <div
        id="astronomy-widget-panel"
        className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6 min-w-0"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Aerocast is loading astronomy and photographic-hour data.</span>

        <div aria-hidden="true" className="space-y-6">
          {/* Widget Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Moon className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div className="space-y-2 min-w-0">
                <div className="h-4.5 w-60 max-w-full bg-slate-700/80 rounded-md animate-pulse motion-reduce:animate-none"></div>
                <div className="h-3 w-80 max-w-full bg-slate-800/60 rounded-md animate-pulse motion-reduce:animate-none"></div>
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl px-3 py-2 self-start">
              <GeminiLogo className="w-4.5 h-4.5 animate-pulse motion-reduce:animate-none" />
              <div>
                <span className="block text-[9px] text-indigo-300 font-mono font-bold uppercase tracking-wider">Aerocast Sky Engine</span>
                <span className="block text-[9px] text-slate-500">Synchronizing solar data...</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-slate-900/40 border border-slate-800/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/50">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-4 h-4 rounded-full bg-amber-500/20 animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-3.5 w-36 max-w-full bg-slate-700/80 rounded animate-pulse motion-reduce:animate-none"></div>
                </div>
                <div className="h-5 w-24 bg-amber-500/10 border border-amber-500/15 rounded shrink-0 animate-pulse motion-reduce:animate-none"></div>
              </div>

              <div className="h-11 w-full bg-[#0B0F1A]/60 border border-indigo-500/10 rounded-xl px-3 flex items-center justify-between">
                <div className="h-3 w-28 bg-slate-800/80 rounded animate-pulse motion-reduce:animate-none"></div>
                <div className="h-6 w-24 bg-indigo-500/10 border border-indigo-500/15 rounded animate-pulse motion-reduce:animate-none"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {["amber", "indigo"].map(tone => (
                    <div key={tone} className="h-[52px] flex items-center gap-3 p-3 bg-[#0B0F1A]/50 border border-slate-800/50 rounded-xl">
                      <div className={`w-5 h-5 rounded ${tone === "amber" ? "bg-amber-500/20" : "bg-indigo-500/20"} animate-pulse motion-reduce:animate-none`}></div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-12 bg-slate-800 rounded animate-pulse motion-reduce:animate-none"></div>
                        <div className="h-3 w-16 bg-slate-700 rounded animate-pulse motion-reduce:animate-none"></div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3.5 pl-0 sm:pl-3 sm:border-l border-slate-800/60">
                  {["amber", "sky"].map(tone => (
                    <div key={tone} className="space-y-1.5">
                      <div className={`h-2 w-28 rounded ${tone === "amber" ? "bg-amber-500/20" : "bg-sky-500/20"} animate-pulse motion-reduce:animate-none`}></div>
                      <div className="h-3 w-24 bg-slate-700/80 rounded animate-pulse motion-reduce:animate-none"></div>
                    </div>
                  ))}
                  <div className="h-10 w-full bg-[#0B0F1A]/50 border border-slate-800/50 rounded-lg animate-pulse motion-reduce:animate-none"></div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 bg-slate-900/40 border border-slate-800/30 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-indigo-500/20 animate-pulse motion-reduce:animate-none"></div>
                    <div className="h-3.5 w-20 bg-slate-700/80 rounded animate-pulse motion-reduce:animate-none"></div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-slate-800 animate-pulse motion-reduce:animate-none"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-5 w-28 bg-slate-700/80 rounded animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-2.5 w-24 bg-slate-800/60 rounded animate-pulse motion-reduce:animate-none"></div>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-800/50">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 bg-slate-800/70 rounded animate-pulse motion-reduce:animate-none"></div>
                  <div className="h-3 w-12 bg-slate-700/80 rounded animate-pulse motion-reduce:animate-none"></div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-indigo-500/30 rounded-full animate-pulse motion-reduce:animate-none"></div>
                </div>
                <div className="h-6 w-full bg-indigo-500/10 border border-indigo-500/15 rounded animate-pulse motion-reduce:animate-none"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stargazing = getStargazingLabel(astronomy.stargazingScore);

  return (
    <div id="astronomy-widget-panel" className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-6 min-w-0">
      
      {/* Widget Header */}
      <div>
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
          <Moon className="w-4.5 h-4.5 text-indigo-400" />
          Astronomical Phases & Photographic Hours
        </h3>
        <p className="text-xs text-slate-400 font-normal">Track solar transitions and stargazer metrics for professional shoots</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Module A: Solar dial, Sunrise, Sunset, Golden Hour (photographer's dream) */}
        <div className="md:col-span-7 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <span className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Sun className="w-4 h-4 text-amber-400" /> Photographers Solar Dial
            </span>
            <span className="text-[9px] uppercase tracking-wider bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded border border-amber-500/25 font-mono font-bold">
              Golden/Blue Hours
            </span>
          </div>

          {/* Dynamic Countdown Banner */}
          <div className="bg-[#0B0F1A]/60 border border-indigo-500/10 rounded-xl p-3 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Next {nextEventType === "sunrise" ? "Sunrise" : "Sunset"} in:</span>
            <span className="font-mono text-indigo-400 font-semibold bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 tracking-wide animate-pulse motion-reduce:animate-none">
              {countdownText || "Calculating..."}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sunrise & Sunset */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-[#0B0F1A]/50 border border-slate-800/50 rounded-xl">
                <Sunrise className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Sunrise</span>
                  <span className="text-xs font-bold text-slate-200">{astronomy.sunrise}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-[#0B0F1A]/50 border border-slate-800/50 rounded-xl">
                <Sunset className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[9px] text-slate-500 font-mono uppercase block">Sunset</span>
                  <span className="text-xs font-bold text-slate-200">{astronomy.sunset}</span>
                </div>
              </div>
            </div>

            {/* Photo hours details */}
            <div className="space-y-3.5 text-xs text-slate-400 leading-normal pl-2 border-l border-slate-800/60">
              <div>
                <span className="text-[9px] text-amber-400 font-semibold block uppercase font-mono">🌅 Golden Hour (Evening)</span>
                <span className="text-[11px] text-slate-300 font-medium font-mono">{astronomy.goldenHourEvening}</span>
              </div>
              <div>
                <span className="text-[9px] text-sky-400 font-semibold block uppercase font-mono">🌌 Blue Hour (Evening)</span>
                <span className="text-[11px] text-slate-300 font-medium font-mono">{astronomy.blueHourEvening}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[10px] bg-[#0B0F1A]/50 p-2 rounded-lg border border-slate-800/50 mt-1">
                <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>Camera ready: Perfect soft ambient light indices for corporate photoshoots.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Module B: Moon Phase & stargazing index */}
        <div className="md:col-span-5 bg-slate-900/50 border border-slate-800/50 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Moon className="w-4 h-4 text-indigo-400" /> Moon Phase
              </span>
              <span className="text-[14px]">{getMoonEmoji(astronomy.moonPhase)}</span>
            </div>

            <div className="space-y-1">
              <span className="text-base font-extrabold text-white">{astronomy.moonPhase}</span>
              <span className="text-[10px] text-slate-500 font-mono block uppercase">Illumination: {astronomy.moonIllumination}%</span>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-800/60 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Stargazing Rating:</span>
              <span className="text-white font-bold font-mono">{astronomy.stargazingScore}/100</span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full rounded-full" 
                style={{ width: `${astronomy.stargazingScore}%` }}
              ></div>
            </div>

            <span className={`px-2 py-0.5 rounded border text-[10px] font-mono block text-center font-bold uppercase mt-2 ${stargazing.color}`}>
              {stargazing.label}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
