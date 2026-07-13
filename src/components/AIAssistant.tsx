/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { ChatMessage } from "../types";
import { Send, User } from "lucide-react";
import { fetchOpenMeteoDirect } from "../openMeteoDirect";

const STREAMING_THINKING_MESSAGE = "Aerocast weather AI is thinking...";

export function GeminiLogo({ className = "w-5 h-5", style }: { className?: string; style?: React.CSSProperties }) {
  const gradId = React.useId();
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className} 
      style={style}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%" fx="50%" fy="10%">
          <stop offset="0%" stopColor="#ff7085" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="70%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#10b981" />
        </radialGradient>
      </defs>
      <path 
        d="M 50,0 C 50,35 65,50 100,50 C 65,50 50,65 50,100 C 50,65 35,50 0,50 C 35,50 50,35 50,0 Z" 
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

interface AIAssistantProps {
  currentCity: string;
}

export default function AIAssistant({ currentCity }: AIAssistantProps) {
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "model",
      content: "How can I help?",
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeStreamMessageId, setActiveStreamMessageId] = useState<string | null>(null);
  const [isWaitingForFirstChunk, setIsWaitingForFirstChunk] = useState(false);
  const [liveStatus, setLiveStatus] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Chat Send
  const handleSendChat = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || chatInput;
    if (!promptToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: promptToSend,
      timestamp: Date.now()
    };

    const modelMsgId = `msg-${Date.now()}-m`;
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages([...updatedMessages, {
      id: modelMsgId,
      role: "model",
      content: STREAMING_THINKING_MESSAGE,
      timestamp: Date.now()
    }]);
    if (!customPrompt) setChatInput("");
    setIsChatLoading(true);
    setActiveStreamMessageId(modelMsgId);
    setIsWaitingForFirstChunk(true);
    setLiveStatus(STREAMING_THINKING_MESSAGE);

    let hasStartedMessage = false;
    let streamFailed = false;

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentCity,
        })
      });

      if (!response.ok) throw new Error("HTTP " + response.status);
      if (!response.body) throw new Error("No response body available for streaming");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine.startsWith("data: ")) continue;
            const payloadStr = cleanLine.substring(6);
            if (payloadStr === "[DONE]") {
              done = true;
              break;
            }
            try {
              const payload = JSON.parse(payloadStr);
              if (typeof payload.text === "string" && payload.text.length > 0) {
                if (!hasStartedMessage) {
                  hasStartedMessage = true;
                  setIsWaitingForFirstChunk(false);
                  setLiveStatus("Aerocast AI Hub response is streaming.");
                  setChatMessages(prev => prev.map(message => (
                    message.id === modelMsgId
                      ? { ...message, content: payload.text }
                      : message
                  )));
                } else {
                  setChatMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, content: m.content + payload.text } : m));
                }
              }
            } catch (e) {
              console.warn("Error parsing stream line:", e);
            }
          }
        }
      }

      if (!hasStartedMessage) {
        streamFailed = true;
        setChatMessages(prev => prev.map(message => (
          message.id === modelMsgId
            ? { ...message, content: "Aerocast AI Hub did not receive a response. Please retry." }
            : message
        )));
      }
    } catch (err) {
      if (hasStartedMessage) {
        streamFailed = true;
        console.error("Chat stream error:", err);
        setChatMessages(prev => prev.map(message => {
          if (message.id !== modelMsgId) return message;
          return {
            ...message,
            content: `${message.content}\n\n*(Stream interrupted. Please retry.)*`
          };
        }));
      } else {
        console.warn("API Chat failed or unreachable. Running client-side simulation fallback...", err);
        try {
          const liveWeather = await fetchOpenMeteoDirect(currentCity || "Delhi");
          const lastMsgLower = promptToSend.toLowerCase();
          let content = "";

          if (lastMsgLower.includes("hi") || lastMsgLower.includes("hello") || lastMsgLower.includes("hey")) {
            content = `Hello! I am your AeroCast Copilot. I specialize in weather planning, packing strategies, aviation delay prediction, and Google Workspace alignment. \n\nHow can I optimize your travel schedule today? Ask me about weather details, if it will rain, if it will be cold, or what my system prompt is!`;
          } else if (lastMsgLower.includes("system prompt") || lastMsgLower.includes("who are you") || lastMsgLower.includes("help me") || lastMsgLower.includes("role")) {
            content = `My system prompt configures me as **the ultimate Weather and Travel Consultant AI for busy professionals and elite travelers**.\n\nMy instructions are to:\n- Maintain a highly composed, helpful, authoritative, and direct tone.\n- Actively help you coordinate business flights, outdoor scheduling slots, and packing strategies.\n- Warn you about real-time aviation crosswinds, rain probabilities, and extreme UV exposures.\n- Access live meteorological satellite feeds to verify conditions!`;
          } else if (lastMsgLower.includes("rain") || lastMsgLower.includes("wet") || lastMsgLower.includes("umbrella")) {
            const prob = liveWeather.rainProb;
            const cond = liveWeather.condition.text;
            content = `For **${liveWeather.city}**: The current conditions are **${cond}** with a rain probability of **${prob}%**.\n\n${prob > 40 ? "🌧️ Yes, precipitation probability is high. You should pack a heavy business trenchcoat and keep an umbrella handy." : "☀️ Rain probability is minimal right now. Outdoor commutes and runway activities should proceed without obstruction."}`;
          } else if (lastMsgLower.includes("cold") || lastMsgLower.includes("temperature") || lastMsgLower.includes("hot") || lastMsgLower.includes("warm")) {
            const temp = liveWeather.tempC;
            content = `For **${liveWeather.city}**: The temperature is currently **${temp}°C** (${liveWeather.tempF}°F), feels like **${liveWeather.feelsLikeC}°C**.\n\n${temp < 15 ? "🧣 It is quite cold! Standard corporate layers, wool blazer, or formal trench outerwear are highly advised." : temp > 28 ? "☀️ It is warm! Light linen shirts, breathable fabrics, and UV shielding are ideal." : "👔 The temperature is moderate and comfortable. Standard business casual blazer attire is perfectly suited."}`;
          } else {
            content = `I have consulted the live meteorological feed for **${liveWeather.city}**.\n\nCurrently, it is **${liveWeather.tempC}°C** with **${liveWeather.condition.text}** conditions and **${liveWeather.windKmh} km/h** winds.\n\nPlanning travels or aligning calendars? Ask me specific queries like "Will it rain?", "Is it cold?", or "What is your system prompt?", and I will provide directly actionable advice!`;
          }

          setIsWaitingForFirstChunk(false);
          setLiveStatus("Aerocast AI Hub response is streaming (Offline Simulation).");
          
          const tokens = content.split(/(\s+)/);
          let streamedText = "";
          
          for (let i = 0; i < tokens.length; i++) {
            streamedText += tokens[i];
            const currentText = streamedText;
            setChatMessages(prev => prev.map(m => m.id === modelMsgId ? { ...m, content: currentText } : m));
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          streamFailed = false;
        } catch (simErr) {
          console.error("Simulation error:", simErr);
          streamFailed = true;
          setChatMessages(prev => prev.map(message => {
            if (message.id !== modelMsgId) return message;
            return {
              ...message,
              content: "Aerocast AI Hub could not connect to the weather service. Please check your network and retry."
            };
          }));
        }
      }
    } finally {
      setIsChatLoading(false);
      setIsWaitingForFirstChunk(false);
      setActiveStreamMessageId(null);
      setLiveStatus(streamFailed
        ? "Aerocast AI Hub could not complete the response."
        : "Aerocast AI Hub response complete."
      );
    }
  };

  return (
    <div id="aerocast-ai-hub" className="max-w-4xl mx-auto w-full">
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveStatus}
      </div>
      
      {/* Multi-turn Chat interface */}
      <div className="w-full bg-[#0B0F1A] border border-slate-800/50 rounded-2xl sm:rounded-3xl p-3 sm:p-6 flex flex-col h-[420px] sm:h-[520px] shadow-2xl relative min-w-0">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/50 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-1.5">
              <GeminiLogo className="w-5 h-5" />
              <span translate="no">Aerocast AI Hub</span>
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-500">Weather &amp; Travel Advisor</p>
          </div>
          <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono font-bold">
            Live Copilot
          </span>
        </div>

        {/* Chat Thread */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-800"
          aria-label="Conversation with Aerocast AI Hub"
          aria-busy={isChatLoading}
        >
          {chatMessages.map((msg) => {
            const isModel = msg.role === "model";
            const isInitialStreamStatus = isModel
              && msg.id === activeStreamMessageId
              && isWaitingForFirstChunk;
            return (
              <div 
                key={msg.id}
                className={`flex ${isModel ? "justify-start" : "justify-end"}`}
              >
                <div className={`flex items-start space-x-2.5 max-w-[85%] ${isModel ? "" : "flex-row-reverse space-x-reverse"}`}>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border text-xs font-semibold ${
                    isModel ? "bg-sky-500/10 border-sky-500/20 text-sky-400" : "bg-slate-800 border-slate-700 text-slate-200"
                  } ${isInitialStreamStatus ? "animate-pulse motion-reduce:animate-none" : ""}`}>
                    {isModel ? <GeminiLogo className="w-4.5 h-4.5" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isModel 
                      ? "bg-slate-900/80 text-slate-200 border border-slate-800 rounded-tl-none" 
                      : "bg-sky-600 text-white rounded-tr-none"
                  }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    <span className="block text-[9px] text-slate-400 text-right mt-1.5 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="pt-3 flex gap-1.5 overflow-x-auto pb-1 text-[10px] border-t border-slate-800/40">
          <button
            onClick={() => handleSendChat(undefined, `What should I pack for professional travels to ${currentCity}?`)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-full shrink-0 transition-colors"
          >
            🧳 Packing advice
          </button>
          <button
            onClick={() => handleSendChat(undefined, `Is there any aviation delay risk for flights around ${currentCity}?`)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-full shrink-0 transition-colors"
          >
            ✈️ Flight delay risk
          </button>
          <button
            onClick={() => handleSendChat(undefined, "Suggest corporate indoor venues during heavy thunderstorms")}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 rounded-full shrink-0 transition-colors"
          >
            🏢 Alternative indoor venues
          </button>
        </div>

        {/* Chat input form */}
        <form onSubmit={handleSendChat} className="mt-3 flex space-x-2">
          <label htmlFor="chat-input-text" className="sr-only">Message Aerocast AI Hub</label>
          <input
            id="chat-input-text"
            name="aerocast-chat-message"
            type="text"
            autoComplete="off"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask anything about destination weather risk or itineraries..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
          />
          <button
            id="chat-send-btn"
            type="submit"
            aria-label="Send message to Aerocast AI Hub"
            disabled={isChatLoading || !chatInput.trim()}
            className="p-3 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white rounded-xl transition-colors shrink-0 shadow-lg shadow-sky-600/10"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
