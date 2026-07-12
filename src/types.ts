/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherCondition {
  text: string;
  code: number; // e.g., 1000 clear, 1003 cloudy, 1063 rain, etc.
}

export interface AQIDetails {
  index: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  label: 'Good' | 'Moderate' | 'Unhealthy for Sensitive' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous';
  color: string;
}

export interface AstronomyData {
  sunrise: string;
  sunset: string;
  goldenHourMorning: string;
  goldenHourEvening: string;
  blueHourMorning: string;
  blueHourEvening: string;
  moonPhase: 'New Moon' | 'Waxing Crescent' | 'First Quarter' | 'Waxing Gibbous' | 'Full Moon' | 'Waning Gibbous' | 'Last Quarter' | 'Waning Crescent';
  moonIllumination: number; // 0 - 100
  stargazingScore: number; // 0 - 100
}

export interface SevereAlert {
  id: string;
  event: string;
  sender: string;
  headline: string;
  description: string;
  severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Unknown';
  areas: string[];
  ends: string;
}

export interface HourlyForecast {
  time: string; // e.g., "09:00"
  tempC: number;
  tempF: number;
  condition: WeatherCondition;
  rainProb: number; // 0 - 100
  windKmh: number;
  windMph: number;
  isWorkHour: boolean;
}

export interface DailyForecast {
  date: string; // e.g., "2026-07-11"
  dayName: string; // e.g., "Saturday"
  maxTempC: number;
  maxTempF: number;
  minTempC: number;
  minTempF: number;
  condition: WeatherCondition;
  rainProb: number;
  uvIndex: number;
  aqi: number;
}

export interface WeatherData {
  city: string;
  country: string;
  lat: number;
  lon: number;
  tempC: number;
  tempF: number;
  feelsLikeC: number;
  feelsLikeF: number;
  condition: WeatherCondition;
  humidity: number;
  windKmh: number;
  windMph: number;
  windDir: string;
  windGustKmh: number;
  windGustMph: number;
  pressureMb: number;
  uvIndex: number;
  visibilityKm: number;
  visibilityMiles: number;
  rainProb: number;
  precipitationMm: number;
  aqi: AQIDetails;
  astronomy: AstronomyData;
  alerts: SevereAlert[];
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface UserCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  isPinned: boolean;
  isFavorite: boolean;
}

export interface TripItinerary {
  id: string;
  userId: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  flightNumber?: string;
  flightDelayRisk: 'Low' | 'Medium' | 'High';
  flightDelayReason?: string;
  packingList: { id: string; name: string; category: string; checked: boolean }[];
  activities: { id: string; name: string; time: string; date: string; isOutdoor: boolean; weatherWarning?: string }[];
  aiNotes?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO string
  end: string;   // ISO string
  location?: string;
  affectedByWeather: boolean;
  weatherAlertLevel: 'none' | 'warn' | 'critical';
  weatherDetails?: string;
  suggestedAction?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  isCompleted: boolean;
  weatherDependent: boolean;
  weatherStatus: 'ok' | 'risky' | 'bad' | 'unknown';
  suggestedRescheduleDate?: string;
}

export interface SmartTrigger {
  id: string;
  name: string;
  metric: 'rain' | 'temp' | 'uv' | 'wind';
  operator: 'greater_than' | 'less_than' | 'equals' | 'starts';
  value: number | string;
  message: string;
  isActive: boolean;
}

export interface DashboardWidget {
  id: string;
  type: 'weather_summary' | 'hourly' | 'daily' | 'calendar_sync' | 'aqi' | 'travel_compare' | 'astronomy' | 'smart_notifications';
  size: 'small' | 'medium' | 'large';
  position: number;
}

export interface UserSettings {
  userId: string;
  tempUnit: 'C' | 'F';
  windUnit: 'kmh' | 'mph';
  dashboardProfile: 'Professional' | 'Traveler' | 'Minimalist';
  theme: 'dark' | 'light' | 'system';
  enabledWidgets: string[];
  smartTriggers: SmartTrigger[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelType?: string;
  audioUrl?: string;
  thinkingProcess?: string;
}
