/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { UserSettings, UserCity } from "../types";
import { 
  Settings, 
  MapPin, 
  Star, 
  Trash2, 
  Plus, 
  Check, 
  Compass, 
  Briefcase, 
  EyeOff, 
  Sliders,
  Wind,
  Thermometer,
  Layers,
  Palette
} from "lucide-react";

interface DashboardWidgetsProps {
  settings: UserSettings;
  onUpdateSettings: (settings: Partial<UserSettings>) => void;
  favoriteCities: UserCity[];
  onAddFavorite: (city: string) => void;
  onDeleteFavorite: (id: string) => void;
  onSelectFavorite: (cityName: string) => void;
}

export default function DashboardWidgets({
  settings,
  onUpdateSettings,
  favoriteCities,
  onAddFavorite,
  onDeleteFavorite,
  onSelectFavorite
}: DashboardWidgetsProps) {
  const [newCityInput, setNewCityInput] = useState("");

  const profiles = [
    { id: 'Professional', label: "Corporate Professional", desc: "Focuses on runway winds, UV indices for formal outerwear, and automated smart triggers.", icon: Briefcase },
    { id: 'Traveler', label: "Elite Traveler", desc: "Prioritizes flight delay risks, multi-city comparison tables, and custom interactive weather maps.", icon: Compass },
    { id: 'Minimalist', label: "Ambient Minimalist", desc: "Keeps a simple glassmorphic card interface with pure temperatures and general forecasts.", icon: Sliders },
  ];

  const handleAddCity = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCityInput.trim()) {
      onAddFavorite(newCityInput.trim());
      setNewCityInput("");
    }
  };

  const widgetTemplates = [
    { id: 'weather_summary', label: "Current Core Conditions" },
    { id: 'hourly', label: "Hourly Forecast line-charts" },
    { id: 'daily', label: "Daily Forecast trends" },
    { id: 'aqi', label: "Grounded Air Quality & PM2.5 Monitors" },
    { id: 'astronomy', label: "Sun Phases & Golden Hour Astronomy Dial" },
    { id: 'smart_notifications', label: "Automated Custom Weather Trigger Notifications" }
  ];

  const handleWidgetToggle = (widgetId: string) => {
    let list = [...settings.enabledWidgets];
    if (list.includes(widgetId)) {
      list = list.filter(id => id !== widgetId);
    } else {
      list.push(widgetId);
    }
    onUpdateSettings({ enabledWidgets: list });
  };

  return (
    <div id="dashboard-personalization-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-200">
      
      {/* Column 1: Preferences, Profiles, Units */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Module A: Profiles Selection */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-sky-400" />
              Corporate Dashboard Profiles
            </h3>
            <p className="text-[11px] text-slate-400 font-normal">Choose a layout profile to auto-arrange widget priorities</p>
          </div>

          <div className="space-y-3">
            {profiles.map((prof) => {
              const Icon = prof.icon;
              const isSelected = settings.dashboardProfile === prof.id;
              return (
                <button
                  key={prof.id}
                  id={`profile-card-${prof.id}`}
                  onClick={() => onUpdateSettings({ 
                    dashboardProfile: prof.id as any,
                    // Auto toggle widgets suitable for the profile
                    enabledWidgets: prof.id === 'Minimalist' 
                      ? ['weather_summary', 'hourly']
                      : prof.id === 'Traveler'
                      ? ['weather_summary', 'hourly', 'daily', 'aqi']
                      : ['weather_summary', 'hourly', 'daily', 'smart_notifications']
                  })}
                  className={`w-full flex items-start space-x-3.5 p-4 rounded-2xl border text-left transition-all ${
                    isSelected 
                      ? "bg-sky-500/10 border-sky-500 text-white shadow-lg shadow-sky-500/5" 
                      : "bg-[#020617]/50 border-slate-800/50 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <div className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                    isSelected ? "bg-sky-500/20 border-sky-500/30 text-sky-400" : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block">{prof.label}</span>
                    <p className="text-[10px] text-slate-400 leading-normal mt-1">{prof.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module B: Custom Widgets Toggle switches */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Settings className="w-4.5 h-4.5 text-sky-400" />
              Widget Workspace Arrangement
            </h3>
            <p className="text-[11px] text-slate-400 font-normal">Individually toggle which forecast cards are active on your dashboard</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {widgetTemplates.map((widget) => {
              const isEnabled = settings.enabledWidgets.includes(widget.id);
              return (
                <label
                  key={widget.id}
                  className={`flex items-center justify-between p-3.5 bg-[#020617]/50 border rounded-2xl cursor-pointer hover:border-slate-700 transition-all select-none ${
                    isEnabled ? "border-sky-500/30 bg-sky-500/5" : "border-slate-800/50"
                  }`}
                >
                  <span className="text-slate-200 font-medium text-[11px]">{widget.label}</span>
                  <input
                    id={`widget-toggle-chk-${widget.id}`}
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleWidgetToggle(widget.id)}
                    className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-700 rounded focus:ring-sky-500/30 ml-3"
                  />
                </label>
              );
            })}
          </div>
        </div>

      </div>

      {/* Column 2: Pinned hubs, Units configuration */}
      <div className="lg:col-span-5 space-y-6">

        {/* Dedicated theme preference, persisted by App to Firestore */}
        <section className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4" aria-labelledby="theme-selector-title">
          <div>
            <h3 id="theme-selector-title" className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Palette className="w-4.5 h-4.5 text-sky-400" aria-hidden="true" />
              Theme Selector
            </h3>
            <p className="text-[11px] text-slate-400">Applied immediately and synced to your account</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="theme-selector-dropdown" className="block text-xs font-medium text-slate-300">
              Interface theme
            </label>
            <select
              id="theme-selector-dropdown"
              name="theme"
              value={settings.theme}
              onChange={(event) => onUpdateSettings({ theme: event.target.value as UserSettings['theme'] })}
              className="w-full bg-slate-900 text-slate-200 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-semibold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <p className="text-[10px] leading-relaxed text-slate-500">
              System follows your device and updates automatically when its appearance changes.
            </p>
          </div>
        </section>
        
        {/* Module C: Imperial / Metric unit configurations */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Thermometer className="w-4.5 h-4.5 text-sky-400" />
              Measurement Parameters
            </h3>
            <p className="text-[11px] text-slate-400 font-normal">Alter measurement metrics suited to your aviation region</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Temp Unit toggles */}
            <div className="flex items-center justify-between p-3 bg-[#020617]/50 border border-slate-800/50 rounded-2xl">
              <span className="text-slate-400 font-medium">Temperature Scales</span>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  id="temp-unit-btn-C"
                  onClick={() => onUpdateSettings({ tempUnit: 'C' })}
                  className={`px-3.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    settings.tempUnit === 'C' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Celsius (°C)
                </button>
                <button
                  id="temp-unit-btn-F"
                  onClick={() => onUpdateSettings({ tempUnit: 'F' })}
                  className={`px-3.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    settings.tempUnit === 'F' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  Fahrenheit (°F)
                </button>
              </div>
            </div>

            {/* Wind Unit toggles */}
            <div className="flex items-center justify-between p-3 bg-[#020617]/50 border border-slate-800/50 rounded-2xl">
              <span className="text-slate-400 font-medium">Velocity Units</span>
              <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  id="wind-unit-btn-kmh"
                  onClick={() => onUpdateSettings({ windUnit: 'kmh' })}
                  className={`px-3.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    settings.windUnit === 'kmh' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  km/h
                </button>
                <button
                  id="wind-unit-btn-mph"
                  onClick={() => onUpdateSettings({ windUnit: 'mph' })}
                  className={`px-3.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                    settings.windUnit === 'mph' ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  mph
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Module D: Pinned Favorite Hubs List */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <MapPin className="w-4.5 h-4.5 text-sky-400" />
              Favorite Corporate Destinations
            </h3>
            <p className="text-[11px] text-slate-400 font-normal">Manage quick destinations for rapid weather checks</p>
          </div>

          <form onSubmit={handleAddCity} className="flex gap-2 text-xs">
            <input
              id="add-fav-city-input"
              type="text"
              value={newCityInput}
              onChange={(e) => setNewCityInput(e.target.value)}
              placeholder="Add hub city name (e.g. Paris)..."
              className="flex-1 bg-slate-950 border border-slate-800 px-3.5 py-2 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
            />
            <button
              id="add-fav-city-btn"
              type="submit"
              className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all flex items-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </form>

          {/* Favorites List layout */}
          <div className="space-y-2 overflow-y-auto max-h-[160px] pr-1">
            {favoriteCities.map((city) => (
              <div
                key={city.id}
                id={`favorite-city-${city.id}`}
                className="flex items-center justify-between p-3 bg-[#020617]/50 border border-slate-800/50 rounded-xl hover:border-slate-750 transition-colors"
              >
                <button
                  id={`select-fav-${city.name.toLowerCase()}`}
                  onClick={() => onSelectFavorite(city.name)}
                  className="flex-1 text-left flex items-center space-x-2 text-xs text-slate-200 hover:text-sky-400 font-medium"
                >
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                  <span>{city.name}, {city.country}</span>
                </button>
                <button
                  id={`delete-fav-${city.id}`}
                  onClick={() => onDeleteFavorite(city.id)}
                  className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
