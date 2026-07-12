/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { SmartTrigger } from "../types";
import { 
  BellRing, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  Volume2, 
  Settings2,
  RefreshCw
} from "lucide-react";

interface SmartNotificationsProps {
  triggers: SmartTrigger[];
  onAddTrigger: (trigger: SmartTrigger) => void;
  onDeleteTrigger: (id: string) => void;
  onToggleTrigger: (id: string) => void;
  onTriggerAlertSimulate: (message: string) => void;
}

export default function SmartNotifications({
  triggers,
  onAddTrigger,
  onDeleteTrigger,
  onToggleTrigger,
  onTriggerAlertSimulate
}: SmartNotificationsProps) {
  // Trigger Form State
  const [triggerName, setTriggerName] = useState("");
  const [metric, setMetric] = useState<'rain' | 'temp' | 'uv' | 'wind'>('rain');
  const [operator, setOperator] = useState<'greater_than' | 'less_than' | 'equals' | 'starts'>('greater_than');
  const [value, setValue] = useState<number | string>(50);
  const [customMsg, setCustomMsg] = useState("");

  const handleCreateTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!triggerName.trim()) return;

    const unit = metric === 'temp' ? '°C' : metric === 'wind' ? 'km/h' : metric === 'rain' ? '%' : '';
    const operatorStr = operator === 'greater_than' ? 'exceeds' : operator === 'less_than' ? 'falls below' : 'is';
    const finalMsg = customMsg.trim() || `🚨 Alert: ${triggerName}. ${metric} ${operatorStr} ${value}${unit}! Recheck your travel itinerary.`;

    const newTrigger: SmartTrigger = {
      id: `trigger-${Date.now()}`,
      name: triggerName.trim(),
      metric,
      operator,
      value: Number(value) || value,
      message: finalMsg,
      isActive: true
    };

    onAddTrigger(newTrigger);
    setTriggerName("");
    setCustomMsg("");
    onTriggerAlertSimulate(`Successfully created trigger rule: "${newTrigger.name}"!`);
  };

  return (
    <div id="smart-triggers-panel" className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-slate-200">
      
      {/* Column 1: Rules & Custom Triggers Creator Form */}
      <div className="lg:col-span-5 bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            <Settings2 className="w-4.5 h-4.5 text-sky-400" />
            Weather Trigger Rule Creator
          </h3>
          <p className="text-[11px] text-slate-400 font-normal">Create persistent alerts that flag calendar or flight risks based on real-time trends</p>
        </div>

        <form onSubmit={handleCreateTrigger} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Trigger Rule Name</label>
            <input
              id="trigger-rule-name-input"
              type="text"
              value={triggerName}
              onChange={(e) => setTriggerName(e.target.value)}
              placeholder="e.g. Extreme commute crosswinds, High heat"
              required
              className="w-full bg-[#020617]/50 border border-slate-800/50 px-3.5 py-2.5 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Monitor Metric</label>
              <select
                id="trigger-metric-select"
                value={metric}
                onChange={(e) => setMetric(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-slate-300 focus:outline-none focus:border-sky-500/50"
              >
                <option value="rain">Precipitation Chance (%)</option>
                <option value="temp">Temperature (°C)</option>
                <option value="uv">UV Exposure Index</option>
                <option value="wind">Wind Velocity (km/h)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Condition</label>
              <select
                id="trigger-operator-select"
                value={operator}
                onChange={(e) => setOperator(e.target.value as any)}
                className="w-full bg-[#020617]/50 border border-slate-800/50 px-3 py-2 rounded-xl text-slate-300 focus:outline-none focus:border-sky-500/50"
              >
                <option value="greater_than">Is Greater Than</option>
                <option value="less_than">Is Less Than</option>
                <option value="equals">Is Equal To</option>
                <option value="starts">Starts / Initiates</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Trigger Threshold Value</label>
            <input
              id="trigger-value-input"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
              className="w-full bg-[#020617]/50 border border-slate-800/50 px-3.5 py-2 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1 font-medium">Custom Alert Notification Text (Optional)</label>
            <textarea
              id="trigger-message-textarea"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              rows={2}
              placeholder="e.g. 🚨 High crosswinds detected. Regional flights may experience gate lockdowns..."
              className="w-full p-3 bg-[#020617]/50 border border-slate-800/50 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          <button
            id="create-trigger-rule-btn"
            type="submit"
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sky-600/10 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Save Trigger Rule
          </button>
        </form>
      </div>

      {/* Column 2: Trigger Rules List & Simulator Panel */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Module B: Active Trigger Rules lists (Full CRUD delete/toggle) */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
                <BellRing className="w-4.5 h-4.5 text-sky-400" />
                Active Smart Weather Rules
              </h3>
              <p className="text-[11px] text-slate-400 font-normal">Real-time alerts triggered automatically on database refresh</p>
            </div>
            <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-mono font-bold">
              {triggers.filter(t => t.isActive).length} active
            </span>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                id={`trigger-card-${trigger.id}`}
                className={`p-3.5 border rounded-2xl transition-all ${
                  trigger.isActive 
                    ? "bg-[#020617]/80 border-slate-800/50 hover:border-slate-700 text-slate-200" 
                    : "bg-[#020617]/30 border-slate-900/50 opacity-60 text-slate-450"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold block">{trigger.name}</span>
                    <p className="text-[11px] text-slate-400 leading-normal">{trigger.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Active status */}
                    <button
                      id={`trigger-toggle-${trigger.id}`}
                      onClick={() => onToggleTrigger(trigger.id)}
                      className={`px-2 py-1 rounded text-[9px] font-mono font-bold uppercase border transition-all ${
                        trigger.isActive 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-800 text-slate-500 border-slate-700"
                      }`}
                    >
                      {trigger.isActive ? "Enabled" : "Disabled"}
                    </button>

                    {/* Delete trigger */}
                    <button
                      id={`trigger-delete-${trigger.id}`}
                      onClick={() => onDeleteTrigger(trigger.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Simulation Trigger button inside rule */}
                {trigger.isActive && (
                  <div className="mt-2.5 pt-2 border-t border-slate-900 flex justify-end">
                    <button
                      id={`simulate-alert-btn-${trigger.id}`}
                      onClick={() => onTriggerAlertSimulate(trigger.message)}
                      className="px-2.5 py-0.5 text-[9px] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono rounded transition-all"
                    >
                      Simulate Trigger Alert
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Module C: Educational Tip box */}
        <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-3xl p-5 shadow-2xl flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 leading-normal">
            <span className="font-semibold text-slate-200">Aviation Crosswind Guidelines:</span>
            <p className="text-[10px] mt-0.5 leading-relaxed">
              Standard corporate regional aircraft models (e.g. CRJ-900, Embraer 175) limit runway crosswinds strictly to 30 km/h during wet runway conditions. Ensure triggers are calibrated below these aviation safety limits for travel itineraries.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
