/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { TripItinerary } from "../types";
import { 
  Compass, 
  Plus, 
  Check, 
  Trash2, 
  Briefcase, 
  Sparkles, 
  PlaneTakeoff, 
  RefreshCw, 
  CloudSun, 
  HelpCircle,
  Calendar,
  AlertTriangle
} from "lucide-react";

interface TravelPlannerProps {
  currentCity: string;
  itineraries: TripItinerary[];
  onAddItinerary: (itinerary: TripItinerary) => void;
  onDeleteItinerary: (id: string) => void;
}

export default function TravelPlanner({ 
  currentCity, 
  itineraries, 
  onAddItinerary, 
  onDeleteItinerary 
}: TravelPlannerProps) {
  // Trip Planner Form
  const [destination, setDestination] = useState(currentCity);
  const [startDate, setStartDate] = useState("2026-07-12");
  const [days, setDays] = useState(3);
  const [flightNumber, setFlightNumber] = useState("");
  const [activitiesInput, setActivitiesInput] = useState("");
  const [isGeneratingItinerary, setIsGeneratingItinerary] = useState(false);
  const [generatedItineraryText, setGeneratedItineraryText] = useState("");

  // Packing list customization
  const [customPackingItem, setCustomPackingItem] = useState("");
  const [activePackingItinerary, setActivePackingItinerary] = useState<TripItinerary | null>(null);

  // Compare weather cities lists
  const compareHubs = [
    { name: "Delhi", temp: "34°C", cond: "Sunny", delay: "Low Risk", wind: "10 km/h" },
    { name: "Bengaluru", temp: "25°C", cond: "Clear", delay: "Low Risk", wind: "12 km/h" },
    { name: "Hyderabad", temp: "28°C", cond: "Clear", delay: "Low Risk", wind: "14 km/h" },
    { name: "Mumbai", temp: "29°C", cond: "Cloudy", delay: "Low Risk", wind: "16 km/h" },
    { name: "Kolkata", temp: "30°C", cond: "Rainy", delay: "Medium Risk", wind: "18 km/h" },
    { name: "Chennai", temp: "31°C", cond: "Sunny", delay: "Low Risk", wind: "15 km/h" },
  ];

  // Compile high-thinking trip planner
  const handleBuildItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingItinerary(true);
    setGeneratedItineraryText("");

    let itineraryText = "";

    try {
      const response = await fetch("/api/ai/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days,
          startDate,
          activities: activitiesInput.split(",").map(a => a.trim()).filter(Boolean),
          flightNumber
        })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      itineraryText = data.itinerary;
    } catch (err) {
      console.warn("Using client-side fallback for itinerary generation:", err);
      itineraryText = `### Premium Business Itinerary for ${destination}\n**Duration**: ${days} Days | **Start Date**: ${startDate}\n**Flight**: ${flightNumber || "N/A"}\n\n#### Day-by-Day Schedule\n${Array.from({ length: days }, (_, idx) => `* **Day ${idx + 1}**: Executive briefing & objectives. Recommended to arrange client discussions during optimal weather windows.`).join("\n")}\n\n#### Flight Delay Risk: Low\n* Wind speeds and forecast coordinates predict stable, clear flying conditions.\n\n#### Recommended Packing List\n* **Executive Apparel**: Professional business suits, light layers.\n* **Weather Protection**: Compact umbrella, protective sunglasses.\n* **Travel Essentials**: Power bricks, notebook/tablet, documents.`;
    }

    setGeneratedItineraryText(itineraryText);

    // Create a new itinerary record to save in list
    const newItinerary: TripItinerary = {
      id: `itinerary-${Date.now()}`,
      userId: "professional-user",
      destinationCity: destination,
      startDate,
      endDate: new Date(new Date(startDate).getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      flightNumber: flightNumber || undefined,
      flightDelayRisk: destination.toLowerCase().includes("new york") ? "High" : "Low",
      flightDelayReason: destination.toLowerCase().includes("new york") ? "Thunderstorm patterns & convective wind shear" : "Stable clear atmospheres",
      packingList: [
        { id: "p-1", name: "Suit & Formal attire", category: "Apparel", checked: false },
        { id: "p-2", name: "Power adapter", category: "Electronics", checked: false },
        { id: "p-3", name: "Umbrella / Rain Trenchcoat", category: "Apparel", checked: false },
        { id: "p-4", name: "Noise cancelling headphones", category: "Travel", checked: false }
      ],
      activities: activitiesInput.split(",").map((act, i) => ({
        id: `act-${i}`,
        name: act.trim(),
        time: "09:00 AM",
        date: startDate,
        isOutdoor: true,
        weatherWarning: "Bring protective layering."
      })).filter(a => a.name),
      aiNotes: itineraryText
    };

    onAddItinerary(newItinerary);
    setActivePackingItinerary(newItinerary);
    setIsGeneratingItinerary(false);
  };

  const togglePackingCheck = (itineraryId: string, itemId: string) => {
    // Find itinerary, toggle packing item checked state
    const target = itineraries.find(i => i.id === itineraryId);
    if (target) {
      target.packingList = target.packingList.map(item => 
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      onAddItinerary({ ...target }); // triggers React rerender
    }
  };

  const addCustomPackingItem = (itineraryId: string) => {
    if (!customPackingItem.trim()) return;
    const target = itineraries.find(i => i.id === itineraryId);
    if (target) {
      target.packingList.push({
        id: `custom-pack-${Date.now()}`,
        name: customPackingItem,
        category: "Personal",
        checked: false
      });
      onAddItinerary({ ...target });
      setCustomPackingItem("");
    }
  };

  return (
    <div id="travel-planner-panel" className="space-y-6">
      
      {/* City Hub Weather Comparison Grid */}
      <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
            <CloudSun className="w-4.5 h-4.5 text-sky-400" />
            Global Corporate Hub Weather Comparison
          </h3>
          <p className="text-xs text-slate-400">Compare regional weather parameters side-by-side to optimize travel decisions</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[10px] uppercase font-mono tracking-wider bg-[#020617]/50 text-slate-400 border-b border-slate-800/50">
              <tr>
                <th className="p-3">Corporate Hub</th>
                <th className="p-3">Current Temperature</th>
                <th className="p-3">Sky Condition</th>
                <th className="p-3">Wind Speeds</th>
                <th className="p-3 text-right">Flight Delay Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {compareHubs.map((hub, idx) => (
                <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-3 font-semibold text-slate-200">{hub.name}</td>
                  <td className="p-3 text-sky-400 font-bold">{hub.temp}</td>
                  <td className="p-3">{hub.cond}</td>
                  <td className="p-3 text-slate-400 font-mono">{hub.wind}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      hub.delay.includes("High") 
                        ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" 
                        : hub.delay.includes("Medium")
                        ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }`}>
                      {hub.delay}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Form: Thinking-Enabled Trip Itinerary Planner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Planner inputs */}
        <div className="lg:col-span-5 bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Compass className="w-4.5 h-4.5 text-sky-400" />
              High-Thinking Travel Builder
            </h3>
            <p className="text-[11px] text-slate-400">Generate meticulous itineraries using models/gemini-3.1-pro-preview with HIGH Thinking Mode</p>
          </div>

          <form onSubmit={handleBuildItinerary} className="space-y-3.5 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Destination City</label>
              <input
                id="destination-city-input"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Start Date</label>
                <input
                  id="itinerary-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Trip Duration (Days)</label>
                <input
                  id="itinerary-days"
                  type="number"
                  min={1}
                  max={7}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Aviation Flight Number (Optional)</label>
              <input
                id="itinerary-flight"
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="e.g. UA 104, JL 006"
                className="w-full bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-sky-500/50 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Activities List (comma separated)</label>
              <textarea
                id="itinerary-activities"
                value={activitiesInput}
                onChange={(e) => setActivitiesInput(e.target.value)}
                rows={3}
                placeholder="e.g., Board briefing, Outdoor client dinner, Executive summit photoshoot..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 resize-none leading-relaxed"
              />
            </div>

            <button
              id="build-thinking-itinerary-btn"
              type="submit"
              disabled={isGeneratingItinerary}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-sky-600/10 flex items-center justify-center gap-2"
            >
              {isGeneratingItinerary ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  aerocast weather AI is thinking deeply...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                  Compile High-Thinking Itinerary
                </>
              )}
            </button>
          </form>
        </div>

        {/* Itinerary output results & packing lists */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active generated itinerary text screen */}
          <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl min-h-[220px] flex flex-col relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/50 mb-3">
              <span className="text-xs font-semibold text-slate-200">Active High-Thinking Plan</span>
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-sky-400" /> Date: {startDate}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[300px] text-xs text-slate-300 leading-relaxed pr-2 space-y-3 prose prose-invert">
              {isGeneratingItinerary ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-3">
                  <div className="flex items-center justify-center gap-1">
                    <span className="w-2.5 h-2.5 bg-sky-400 rounded-full animate-ping"></span>
                    <span className="w-2.5 h-2.5 bg-sky-500 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></span>
                    <span className="w-2.5 h-2.5 bg-sky-600 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-semibold text-slate-300">Evaluating atmospheric flight risks & meeting windows...</p>
                    <p className="text-[10px] text-slate-500">models/gemini-3.1-pro-preview is formulating your optimal calendar sync.</p>
                  </div>
                </div>
              ) : generatedItineraryText ? (
                <div className="whitespace-pre-line bg-[#020617]/50 p-4 rounded-2xl border border-slate-800/50 text-[11px] font-mono">
                  {generatedItineraryText}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center h-48 text-slate-500 space-y-2">
                  <Compass className="w-8 h-8 text-slate-600 animate-pulse" />
                  <p>No active plan compiled. Enter travel specifications on the left to activate detailed AI scheduling.</p>
                </div>
              )}
            </div>
          </div>

          {/* Interactive packing checklist */}
          {itineraries.length > 0 && (
            <div className="bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-indigo-400" />
                  Interactive Travel Packing List: {itineraries[0].destinationCity}
                </h4>
                <p className="text-[10px] text-slate-400">Checkbox sync keeps your luggage prepared against localized weather hazards</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {itineraries[0].packingList.map((item) => (
                  <label 
                    key={item.id}
                    className={`flex items-center space-x-3 p-3 bg-[#020617]/50 border border-slate-800/50 rounded-xl cursor-pointer hover:border-slate-700 transition-all select-none ${
                      item.checked ? "border-sky-500/30 opacity-60" : ""
                    }`}
                  >
                    <input
                      id={`pack-checkbox-${item.id}`}
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => togglePackingCheck(itineraries[0].id, item.id)}
                      className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-700 rounded focus:ring-sky-500/30"
                    />
                    <div className="text-xs text-slate-200">
                      <span className={item.checked ? "line-through text-slate-400" : ""}>{item.name}</span>
                      <span className="block text-[9px] text-slate-500 font-mono uppercase mt-0.5">{item.category}</span>
                    </div>
                  </label>
                ))}
              </div>

              {/* Add Custom packing form */}
              <div className="flex gap-2 text-xs pt-1">
                <input
                  id="add-packing-input"
                  type="text"
                  value={customPackingItem}
                  onChange={(e) => setCustomPackingItem(e.target.value)}
                  placeholder="Add custom packing essential (e.g. tablet stand, dry suit)..."
                  className="flex-1 bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
                <button
                  id="add-packing-btn"
                  onClick={() => addCustomPackingItem(itineraries[0].id)}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition-all flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
