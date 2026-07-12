/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React from "react";
import { HelpCircle, BookOpen, ShieldAlert, Award, Calendar, Volume2 } from "lucide-react";

export default function HelpGuides() {
  const onboardingSteps = [
    {
      title: "1. Workspace Authorization",
      desc: "Connect your corporate calendar and chores securely. Our framework will automatically check hourly forecasts against meeting times.",
      icon: Calendar
    },
    {
      title: "2. Setting Smart triggers",
      desc: "Calibrate wind thresholds or heavy rain alerts. AeroCast will notify you before transit schedules are disrupted.",
      icon: ShieldAlert
    },
    {
      title: "3. Spoken Audio Morning Briefings",
      desc: "Use the Gemini TTS center to compile custom weather briefings into high-fidelity speech files suitable for transit listening.",
      icon: Volume2
    }
  ];

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

  const faqs = [
    {
      q: "How does the High-Thinking Planner work?",
      a: "By utilizing the models/gemini-3.1-pro-preview reasoning core, the planner evaluates regional weather hazards, crosswind wind shear, and your listed corporate activities to suggest optimized layers, clothing, and travel adjustments."
    },
    {
      q: "Is my corporate calendar sync secure?",
      a: "Yes. All OAuth protocols are handled strictly via standard secure browser clients. Tokens are preserved locally and never stored on secondary intermediate databases."
    },
    {
      q: "How do I trigger synthetic voice briefings?",
      a: "Enter your desired briefing script in the AI Briefing text box, click 'Generate Spoken Briefing', and the Gemini TTS audio model will return high-fidelity wave audio."
    }
  ];

  return (
    <div id="help-guides-panel" className="space-y-6 text-slate-200">
      
      {/* Onboarding Quick-Start cards */}
      <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            <BookOpen className="w-4.5 h-4.5 text-sky-400" />
            AeroCast Quick-Start Onboarding
          </h3>
          <p className="text-xs text-slate-400">Maximize travel logistics using automated weather sync triggers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onboardingSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="p-4 bg-[#020617]/50 border border-slate-800/50 rounded-2xl space-y-2">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg w-fit">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-semibold text-slate-200">{step.title}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Travel safety tips */}
        <div className="lg:col-span-6 bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
              Professional Weather Safety Guidelines
            </h3>
            <p className="text-[11px] text-slate-400">Aviation weather regulations and transit security practices</p>
          </div>

          <div className="space-y-3.5">
            {travelTips.map((tip, idx) => (
              <div key={idx} className="p-3 bg-[#020617]/50 border border-slate-800/50 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-200 block">{tip.title}</span>
                <p className="text-[10px] text-slate-400 leading-normal">{tip.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs list */}
        <div className="lg:col-span-6 bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <HelpCircle className="w-4.5 h-4.5 text-sky-400" />
              Frequently Answered Questions
            </h3>
            <p className="text-[11px] text-slate-400">Underlying AI architecture and cloud synchronizations</p>
          </div>

          <div className="space-y-3.5 overflow-y-auto max-h-[300px]">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-xs font-semibold text-slate-200 block">Q: {faq.q}</span>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-3.5 border-l border-sky-500/30">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
