/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { CalendarEvent, TaskItem, WeatherData } from "../types";
import { 
  Calendar, 
  CheckSquare, 
  RefreshCw, 
  AlertCircle, 
  Grid, 
  Check, 
  Trash2, 
  Mail, 
  Link,
  MapPin,
  Lock,
  Clock,
  Sparkles,
  Award
} from "lucide-react";

interface WorkspaceSyncProps {
  weather: WeatherData;
  calendarEvents: CalendarEvent[];
  tasksList: TaskItem[];
  onToggleTask: (id: string) => void;
  onRescheduleTask: (id: string, date: string) => void;
  onRefreshWorkspace: () => void;
}

export default function WorkspaceSync({ 
  weather, 
  calendarEvents, 
  tasksList, 
  onToggleTask, 
  onRescheduleTask,
  onRefreshWorkspace 
}: WorkspaceSyncProps) {
  const [googleToken, setGoogleToken] = useState<string | null>(
    localStorage.getItem("google_oauth_token")
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [calendarSyncCount, setCalendarSyncCount] = useState(0);

  // Simulated Google Workspace authentic authorization flow
  const handleGoogleAuth = () => {
    setIsSyncing(true);
    // Standard OAuth token request imitation (safe within iframe popup parameters)
    setTimeout(() => {
      const mockToken = "ya29.a0ARWdaO618_mock_oauth_weather_app_token_key";
      setGoogleToken(mockToken);
      localStorage.setItem("google_oauth_token", mockToken);
      setIsSyncing(false);
      onRefreshWorkspace();
      setCalendarSyncCount(5);
    }, 1500);
  };

  const handleDisconnect = () => {
    setGoogleToken(null);
    localStorage.removeItem("google_oauth_token");
    setCalendarSyncCount(0);
  };

  const handleForceSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onRefreshWorkspace();
    }, 1200);
  };

  return (
    <div id="workspace-sync-panel" className="space-y-6">
      
      {/* Workspace Connection Header Banner */}
      <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Google Workspace Sync Portal
            </h2>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Overlay localized weather conditions on your corporate meetings and tasks lists automatically. 
              Identify climate delay risks, find reschedule windows, and maintain premium planning efficiency.
            </p>
          </div>

          <div className="shrink-0">
            {googleToken ? (
              <div className="flex items-center gap-2">
                <button
                  id="workspace-force-sync"
                  onClick={handleForceSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  Sync Google
                </button>
                <button
                  id="workspace-disconnect"
                  onClick={handleDisconnect}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-red-400 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                id="workspace-auth-btn"
                onClick={handleGoogleAuth}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/15 flex items-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-300" />
                    Authorize Google Workspace
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Sync telemetry status lines */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap gap-4 text-[10px] text-slate-500 font-mono">
          <span>Connection: {googleToken ? "🟢 Secure OAuth Access Active" : "🔴 Disconnected"}</span>
          <span>•</span>
          <span>Calendar scope: calendar.events.readonly</span>
          <span>•</span>
          <span>Tasks scope: tasks.readonly</span>
        </div>
      </div>

      {/* Main Grid: Calendar Overlays & Weather Dependent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Events Overlays list */}
        <div className="lg:col-span-7 bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-emerald-400" />
                Weather Calendar Conflict Analysis
              </h3>
              <p className="text-[11px] text-slate-400">Current calendar slots contrasted against forecast storm hours</p>
            </div>
            {googleToken && (
              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-bold animate-pulse">
                Synced ({calendarEvents.length} events)
              </span>
            )}
          </div>

          <div className="space-y-3.5 overflow-y-auto max-h-[360px] pr-2">
            {calendarEvents.map((event) => {
              const alertColor = event.weatherAlertLevel === "critical" 
                ? "border-red-500/30 bg-red-500/5 text-red-400" 
                : event.weatherAlertLevel === "warn"
                ? "border-amber-500/30 bg-amber-500/5 text-amber-400"
                : "border-slate-800/50 bg-[#020617]/50 text-slate-300";

              return (
                <div 
                  key={event.id}
                  id={`calendar-event-${event.id}`}
                  className={`border rounded-2xl p-4 transition-all hover:bg-slate-900/60 ${alertColor}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-semibold text-slate-100">{event.title}</h4>
                      
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            {event.location}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Conflict Risk indicator */}
                    {event.affectedByWeather && (
                      <span className="text-[8px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border border-current shrink-0 animate-pulse">
                        {event.weatherAlertLevel} Risk
                      </span>
                    )}
                  </div>

                  {/* Weather Advisory message */}
                  {event.affectedByWeather && (
                    <div className="mt-3 p-2.5 bg-[#020617]/50 border border-slate-800/50 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span className="text-slate-200"><strong>Conflict Alert:</strong> {event.weatherDetails}</span>
                      </div>
                      {event.suggestedAction && (
                        <div className="pl-5 text-emerald-400 font-medium">
                          💡 Suggestion: {event.suggestedAction}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Google Tasks Lists & Rescheduling manager */}
        <div className="lg:col-span-5 bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <CheckSquare className="w-4.5 h-4.5 text-sky-400" />
              Weather-Dependent Google Tasks
            </h3>
            <p className="text-[11px] text-slate-400">Optimize outdoor tasks around localized storm grids</p>
          </div>

          <div className="space-y-3">
            {tasksList.map((task) => {
              const isBad = task.weatherStatus === "bad";
              const isRisky = task.weatherStatus === "risky";
              
              return (
                <div 
                  key={task.id}
                  id={`task-card-${task.id}`}
                  className={`p-3.5 bg-slate-950/60 border rounded-2xl transition-all hover:border-slate-700 ${
                    task.isCompleted ? "opacity-50 line-through" : ""
                  } ${isBad ? "border-red-500/20" : isRisky ? "border-amber-500/20" : "border-slate-800"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input
                        id={`task-chk-${task.id}`}
                        type="checkbox"
                        checked={task.isCompleted}
                        onChange={() => onToggleTask(task.id)}
                        className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-700 rounded mt-0.5"
                      />
                      <div className="text-xs">
                        <span className={`text-slate-200 ${task.isCompleted ? "line-through text-slate-500" : ""}`}>{task.title}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] text-slate-500 font-mono">Due: {task.dueDate}</span>
                          {task.weatherDependent && (
                            <span className="text-[8px] bg-sky-500/10 text-sky-400 font-bold px-1 rounded uppercase tracking-wide">Weather Dependent</span>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Reschedule Suggestion overlay */}
                    {!task.isCompleted && task.weatherDependent && (isBad || isRisky) && (
                      <span className={`text-[8px] font-mono px-1.5 py-0.2 rounded border ${
                        isBad ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      }`}>
                        Reschedule Suggested
                      </span>
                    )}
                  </div>

                  {/* Reschedule button action */}
                  {!task.isCompleted && task.weatherDependent && (isBad || isRisky) && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-900 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Rain risk! Move to clear slot:</span>
                      <button
                        id={`reschedule-btn-${task.id}`}
                        onClick={() => onRescheduleTask(task.id, task.suggestedRescheduleDate || "2026-07-15")}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded transition-colors"
                      >
                        Reschedule ({task.suggestedRescheduleDate})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-sky-500/5 rounded-2xl border border-sky-500/10 text-[10px] text-sky-300 leading-normal">
            🌲 AeroCast auto-detects outdoor context words (e.g. "lawn", "photo", "exterior", "inspect") to run automatic safety rescheduling suggestions.
          </div>
        </div>

      </div>

    </div>
  );
}
