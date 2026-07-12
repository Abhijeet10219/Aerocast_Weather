/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  CloudSun, 
  Briefcase, 
  CalendarRange, 
  Sparkles, 
  Settings, 
  BellRing, 
  HelpCircle,
  LogOut,
  User,
  ShieldCheck,
  Compass,
  Pin,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { GeminiLogo } from "./AIAssistant";
import { motion, AnimatePresence } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: any;
  onLogout: () => void;
  dashboardProfile: 'Professional' | 'Traveler' | 'Minimalist';
  notificationsCount: number;
}

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  user, 
  onLogout, 
  dashboardProfile,
  notificationsCount 
}: SidebarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLocked, setIsLocked] = useState(true); // Default locked/expanded for good visibility, toggles off smoothly

  const isOpen = isHovered || isLocked;
  
  const menuItems = [
    { id: "dashboard", label: "Weather Dashboard", icon: CloudSun },
    { id: "travel", label: "Travel & Itineraries", icon: Compass },
    { id: "workspace", label: "Workspace Sync", icon: CalendarRange },
    { id: "ai", label: "Aerocast AI Hub", icon: Sparkles },
    { id: "alerts", label: "Smart Triggers", icon: BellRing, badge: notificationsCount },
    { id: "personalize", label: "Personalization", icon: Settings },
    { id: "help", label: "Help & Guides", icon: HelpCircle },
  ];

  return (
    <motion.aside 
      id="app-sidebar" 
      className="bg-[#0B0F1A] border-r border-slate-800/50 flex flex-col text-slate-200 h-screen sticky top-0 shrink-0 overflow-x-hidden select-none z-30 shadow-2xl shadow-black/40"
      animate={{ 
        width: isOpen ? "288px" : "80px" 
      }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 30 
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* App Logo */}
      <div className="p-4 h-20 border-b border-slate-800/50 flex items-center justify-between relative">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shadow-lg shadow-sky-500/10 shrink-0">
            <CloudSun className="w-8 h-8 animate-pulse" />
          </div>
          
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex-grow min-w-0"
              >
                <h1 className="text-xl font-semibold tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                  AeroCast
                  <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded font-mono">PRO</span>
                </h1>
                <p className="text-xs text-slate-400 whitespace-nowrap">Weather & Itinerary Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Pin lock button - only visible on hover or if locked */}
        {(isHovered || isLocked) && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setIsLocked(!isLocked)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/60 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 absolute right-3"
            title={isLocked ? "Collapse sidebar" : "Lock sidebar open"}
          >
            <Pin className={`w-3.5 h-3.5 transition-transform duration-200 ${isLocked ? "rotate-45 text-sky-400" : ""}`} />
          </motion.button>
        )}
      </div>

      {/* User Context & Profile Mode */}
      <div className="p-3 mx-3 my-3 bg-slate-900/50 rounded-2xl border border-slate-800/50 flex items-center space-x-3 overflow-hidden min-h-[64px]">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-sky-400 font-semibold text-sm">
            {user?.email ? user.email[0].toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
        </div>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-slate-200 truncate">{user?.email || "Guest Professional"}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-mono text-sky-400 uppercase tracking-wider">{dashboardProfile}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-btn-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center relative px-3.5 py-3 rounded-xl transition-all duration-200 group text-left cursor-pointer ${
                isActive 
                  ? "bg-sky-500/10 text-white border-l-4 border-sky-500 font-medium" 
                  : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center w-full min-w-0">
                {/* Icon wrapper to keep it standard sized */}
                <div className="relative shrink-0 flex items-center justify-center w-6 h-6 mr-3">
                  {item.id === "ai" ? (
                    <GeminiLogo className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  ) : (
                    <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                      isActive ? "text-sky-400" : "text-slate-400 group-hover:text-slate-300"
                    }`} />
                  )}

                  {/* Overlaid minimal count indicator when collapsed */}
                  {!isOpen && item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[9px] font-bold flex items-center justify-center bg-amber-500 text-slate-950 rounded-full border border-[#0B0F1A]">
                      {item.badge}
                    </span>
                  ) : null}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.12 }}
                      className="text-sm truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              {/* Normal full badge on the right when expanded */}
              {isOpen && item.badge && item.badge > 0 ? (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold font-mono bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full shrink-0">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Logout & Footer */}
      <div className="p-3 border-t border-slate-800/50">
        <button
          id="logout-button"
          onClick={onLogout}
          className="w-full flex items-center px-3.5 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-colors text-left text-sm cursor-pointer overflow-hidden"
        >
          <div className="w-6 h-6 shrink-0 flex items-center justify-center mr-3">
            <LogOut className="w-5 h-5" />
          </div>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.12 }}
                className="whitespace-nowrap"
              >
                Sign Out / Reset
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className="mt-4 flex items-center justify-between px-2 text-[10px] text-slate-500 font-mono">
          {isOpen ? (
            <>
              <span>v2.1.4</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Secure Sync
              </span>
            </>
          ) : (
            <div className="w-full flex justify-center">
              <ShieldCheck className="w-4 h-4 text-emerald-500" title="Secure Sync Active" />
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
