import React from "react";
import { ShieldAlert } from "lucide-react";

export default function HelpGuides() {
  const travelTips = [
    {
      title: "Aviation Crosswind Delays",
      desc: "Runway takeoff vectors are restricted when crosswinds exceed 30 km/h on wet surfaces. Calibrate your triggers for wind speeds above 25 km/h to secure alternate hotel or rail travel reservations early."
    },
    {
      title: "Air Quality Indexes & Commuting",
      desc: "AQI values above 100 represent Unhealthy air. For client luncheons, outdoor photo-shoots, or commuting in business attire, transition venues indoors to guarantee client comfort."
    },
    {
      title: "Precipitation Itinerary Slots",
      desc: "Always plan critical outdoor travel or transfer windows around 2-hour rain forecast blocks. Align calendar meetings directly during high heat or heavy storms."
    }
  ];

  return (
    <div id="help-guides-panel" className="w-full text-slate-200">
      {/* Travel safety tips (Full width) */}
      <div className="w-full bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl space-y-6">
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
            Professional Weather Safety Guidelines
          </h3>
          <p className="text-xs text-slate-400 mt-1">Aviation weather regulations and transit security practices</p>
        </div>

        <div className="space-y-4">
          {travelTips.map((tip, idx) => (
            <div key={idx} className="p-4 bg-[#020617]/50 border border-slate-800/50 rounded-2xl space-y-1.5">
              <span className="text-sm font-semibold text-slate-200 block">{tip.title}</span>
              <p className="text-xs text-slate-400 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
