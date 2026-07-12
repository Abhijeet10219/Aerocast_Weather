/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CloudSun,
  ExternalLink,
  LocateFixed,
  MapPin,
  RefreshCw,
} from "lucide-react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  useMap,
} from "@vis.gl/react-google-maps";

interface WeatherMapProps {
  activeCity?: string;
  onCitySelect?: (city: string) => void;
  lat?: number;
  lng?: number;
  theme?: "light" | "dark";
}

type MapLoadState = "loading" | "ready" | "error";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 };
const CITY_ZOOM = 10;

// Maps JavaScript API keys are necessarily delivered to the browser. Keep this
// key restricted to the app's HTTPS referrers and to the Maps JavaScript API.
// OPEN_METEO_API_KEY is server-only and must never be added here.
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY?.trim() ?? "";
const INVALID_KEY_VALUES = new Set([
  "YOUR_API_KEY",
  "MY_GOOGLE_MAPS_PLATFORM_KEY",
  "PLACEHOLDER",
]);
const hasGoogleMapsKey =
  GOOGLE_MAPS_API_KEY.length > 0 && !INVALID_KEY_VALUES.has(GOOGLE_MAPS_API_KEY);

function SelectedCityViewport({ position }: { position: google.maps.LatLngLiteral }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Keep the map uncontrolled so gestures remain fluid. This effect only
    // recenters when the resolved city coordinates actually change.
    map.panTo(position);
    map.setZoom(CITY_ZOOM);
  }, [map, position.lat, position.lng]);

  return null;
}

function AerocastMapLoading({ theme }: { theme: "light" | "dark" }) {
  const isLight = theme === "light";

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center p-6 backdrop-blur-sm ${
        isLight ? "bg-slate-50/92" : "bg-[#050914]/92"
      }`}
      role="status"
      aria-live="polite"
      aria-label="Aerocast map is loading"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-sky-500/15" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-400/20 via-indigo-500/10 to-transparent shadow-[0_0_40px_rgba(14,165,233,0.2)]">
            <CloudSun className="h-7 w-7 animate-pulse text-sky-500" aria-hidden="true" />
          </div>
        </div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-500">
          Aerocast Maps
        </p>
        <h4 className={`mt-2 text-sm font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
          Positioning the live city view
        </h4>
        <div className="mx-auto mt-5 grid max-w-[220px] grid-cols-3 gap-2" aria-hidden="true">
          <span className="h-1.5 animate-pulse rounded-full bg-sky-500/70" />
          <span className="h-1.5 animate-pulse rounded-full bg-indigo-500/50 [animation-delay:160ms]" />
          <span className="h-1.5 animate-pulse rounded-full bg-sky-500/30 [animation-delay:320ms]" />
        </div>
      </div>
    </div>
  );
}

function MapConfigurationState({
  type,
  theme,
  onDismiss,
}: {
  type: "missing-key" | "error";
  theme: "light" | "dark";
  onDismiss?: () => void;
}) {
  const isLight = theme === "light";
  const isMissingKey = type === "missing-key";

  return (
    <div
      className={`flex h-full w-full items-center justify-center p-6 text-center ${
        isLight ? "bg-slate-50" : "bg-[#050914]"
      }`}
      role="alert"
    >
      <div className="max-w-md">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${
            isMissingKey
              ? "border-sky-500/20 bg-sky-500/10 text-sky-500"
              : "border-amber-500/20 bg-amber-500/10 text-amber-500"
          }`}
        >
          {isMissingKey ? (
            <MapPin className="h-6 w-6" aria-hidden="true" />
          ) : (
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          )}
        </div>
        <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-500">
          Aerocast Maps
        </p>
        <h4 className={`mt-2 text-base font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
          {isMissingKey ? "Google Maps key required" : "Google Maps could not load"}
        </h4>
        <p className={`mt-2 text-sm leading-6 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
          {isMissingKey ? (
            <>
              Add <code className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-xs text-sky-500">GOOGLE_MAPS_PLATFORM_KEY</code>{" "}
              to <code className="font-mono text-xs">.env.local</code> or your deployment secrets, then restart Aerocast.
            </>
          ) : (
            "Confirm that the Maps JavaScript API and billing are enabled, and that this site's HTTP referrer is authorized for the key."
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              Back to Simulated Radar
            </button>
          )}
          {!isMissingKey && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                isLight
                  ? "bg-slate-900 text-white hover:bg-slate-700"
                  : "bg-white text-slate-950 hover:bg-slate-200"
              }`}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry map
            </button>
          )}
          <a
            href="https://developers.google.com/maps/documentation/javascript/error-messages"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-500 transition-colors hover:bg-sky-500/15"
          >
            Setup guidance
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default function WeatherMap({
  activeCity = "Selected city",
  onCitySelect,
  lat,
  lng,
  theme = "dark",
}: WeatherMapProps) {
  const [loadState, setLoadState] = useState<MapLoadState>("loading");
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const isLight = theme === "light";

  const [showMapConfig, setShowMapConfig] = useState(false);
  const [radarMode, setRadarMode] = useState<'precipitation' | 'wind' | 'aviation'>('precipitation');

  const position = useMemo(() => {
    const candidate = {
      lat: lat ?? DEFAULT_CENTER.lat,
      lng: lng ?? DEFAULT_CENTER.lng,
    };

    return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lng)
      ? candidate
      : DEFAULT_CENTER;
  }, [lat, lng]);

  useEffect(() => {
    setIsInfoOpen(false);
  }, [activeCity, position.lat, position.lng]);

  const renderSimulatedRadar = () => {
    return (
      <div className="relative w-full h-full bg-[#050914] overflow-hidden flex flex-col justify-between" style={{ minHeight: "320px" }}>
        {/* Radar concentric range rings */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-[90%] h-[90%] rounded-full border border-sky-500/5 border-dashed" />
          <div className="absolute w-[70%] h-[70%] rounded-full border border-sky-500/10 border-dashed" />
          <div className="absolute w-[50%] h-[50%] rounded-full border border-sky-500/10 border-dashed" />
          <div className="absolute w-[30%] h-[30%] rounded-full border border-sky-500/15 border-dashed" />
          <div className="absolute w-[10%] h-[10%] rounded-full border border-sky-500/20 border-dashed" />
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-500/5" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-500/5" />
        </div>

        {/* Animated Sweep Line */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div 
            className="w-full h-full max-w-[85%] max-h-[85%] rounded-full animate-spin bg-[conic-gradient(from_0deg,rgba(14,165,233,0.12)_0deg,transparent_90deg)]"
            style={{ animationDuration: "10s", animationTimingFunction: "linear" }}
          />
        </div>

        {/* Pulsing weather anomalies based on selected mode */}
        <div className="absolute inset-0 pointer-events-none">
          {radarMode === 'precipitation' && (
            <>
              {/* Rain cloud anomalies */}
              <div className="absolute top-[28%] left-[25%] w-32 h-20 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '4s' }} />
              <div className="absolute bottom-[22%] right-[28%] w-40 h-24 bg-teal-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
              <div className="absolute top-[45%] right-[18%] w-24 h-24 bg-sky-500/10 rounded-full blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
            </>
          )}

          {radarMode === 'wind' && (
            <>
              {/* Wind front vector blobs */}
              <div className="absolute top-[15%] right-[35%] w-48 h-12 bg-sky-400/5 rounded-full blur-xl rotate-12 animate-pulse" style={{ animationDuration: '5s' }} />
              <div className="absolute bottom-[35%] left-[20%] w-56 h-16 bg-indigo-500/5 rounded-full blur-2xl -rotate-12 animate-pulse" style={{ animationDuration: '7s' }} />
            </>
          )}

          {radarMode === 'aviation' && (
            <>
              {/* Aviation hold alerts */}
              <div className="absolute top-[35%] left-[42%] w-16 h-16 bg-amber-500/10 rounded-full blur-xl animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute bottom-[40%] right-[30%] w-24 h-24 bg-red-500/10 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '5s' }} />
            </>
          )}
        </div>

        {/* Selected City Target indicator (Center) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center pointer-events-none">
          <span className="relative flex h-4.5 w-4.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4.5 w-4.5 bg-sky-500 border-2 border-white shadow-[0_0_15px_rgba(14,165,233,0.6)]"></span>
          </span>
          <span className="mt-2.5 px-3 py-1 rounded-lg bg-slate-950/95 border border-slate-800 text-[10px] font-mono text-sky-400 font-bold whitespace-nowrap shadow-xl">
            {activeCity} (Live Radar)
          </span>
        </div>

        {/* Top Control Bar inside radar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800/60 backdrop-blur-md flex items-center justify-between z-10">
          <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping animate-duration-1000" />
            Met Satellite Feed
          </span>
          
          <div className="flex gap-1.5">
            {(['precipitation', 'wind', 'aviation'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setRadarMode(mode)}
                className={`px-2 py-0.5 rounded text-[8px] font-mono uppercase border font-semibold transition-all cursor-pointer ${
                  radarMode === mode
                    ? 'bg-sky-500/15 border-sky-500 text-sky-400'
                    : 'bg-slate-900 border-slate-800/50 text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Control Bar inside radar */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/60 backdrop-blur-md flex items-center justify-between z-10">
          <span className="text-[9px] font-mono text-slate-400">
            Coordinates: {position.lat.toFixed(2)}°N, {position.lng.toFixed(2)}°E
          </span>
          <button
            type="button"
            onClick={() => setShowMapConfig(true)}
            className="px-2 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-[9px] font-semibold font-mono text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            Setup Google Maps
          </button>
        </div>
      </div>
    );
  };

  return (
    <section
      id="interactive-map-panel"
      className={`overflow-hidden rounded-3xl border shadow-2xl transition-colors ${
        isLight
          ? "border-slate-200 bg-white shadow-slate-200/60"
          : "border-slate-800/70 bg-[#0B0F1A] shadow-black/25"
      }`}
      aria-labelledby="weather-map-title"
    >
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-500">
              <LocateFixed className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3
                id="weather-map-title"
                className={`truncate text-sm font-semibold tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}
              >
                {activeCity} live map
              </h3>
              <p className={`mt-0.5 text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Drag to pan · scroll or pinch to zoom · keyboard navigation enabled
              </p>
            </div>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center gap-2 self-start rounded-xl border px-3 py-2 font-mono text-[10px] sm:self-auto ${
            isLight
              ? "border-slate-200 bg-slate-50 text-slate-600"
              : "border-slate-800 bg-slate-950/70 text-slate-400"
          }`}
          aria-label={`Selected coordinates ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`}
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </div>
      </div>

      <div className="relative h-[clamp(320px,48vw,460px)] min-h-[320px] w-full border-t border-slate-800/20">
        {(!hasGoogleMapsKey && showMapConfig) ? (
          <MapConfigurationState type="missing-key" theme={theme} onDismiss={() => setShowMapConfig(false)} />
        ) : !hasGoogleMapsKey ? (
          renderSimulatedRadar()
        ) : (
          <APIProvider
            apiKey={GOOGLE_MAPS_API_KEY}
            version="weekly"
            onLoad={() => setLoadState("ready")}
            onError={(error) => {
              console.error("Aerocast could not initialize Google Maps.", error);
              setLoadState("error");
            }}
          >
            {loadState === "error" ? (
              <MapConfigurationState type="error" theme={theme} />
            ) : (
              <>
                <Map
                  defaultCenter={position}
                  defaultZoom={CITY_ZOOM}
                  style={{ width: "100%", height: "100%" }}
                  colorScheme={isLight ? "LIGHT" : "DARK"}
                  gestureHandling="greedy"
                  keyboardShortcuts
                  zoomControl
                  streetViewControl
                  fullscreenControl
                  mapTypeControl={false}
                  scaleControl
                  clickableIcons
                  reuseMaps
                >
                  <SelectedCityViewport position={position} />
                  <Marker
                    position={position}
                    title={`${activeCity} selected location`}
                    label={{ text: "A", color: "#ffffff", fontWeight: "700" }}
                    onClick={() => {
                      setIsInfoOpen(true);
                      onCitySelect?.(activeCity);
                    }}
                  />
                  {isInfoOpen && (
                    <InfoWindow position={position} onCloseClick={() => setIsInfoOpen(false)}>
                      <div className="min-w-40 p-1 font-sans text-slate-900">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Aerocast location</p>
                        <h4 className="mt-1 text-sm font-bold">{activeCity}</h4>
                        <p className="mt-1 font-mono text-[11px] text-slate-600">
                          {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
                        </p>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
                {loadState === "loading" && <AerocastMapLoading theme={theme} />}
              </>
            )}
          </APIProvider>
        )}
      </div>
    </section>
  );
}
