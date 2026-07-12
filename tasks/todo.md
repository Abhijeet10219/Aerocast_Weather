# Tasks

- [x] **Phase 1: Environment & Skill Discovery**
  - [x] Read the relevant skills: `firebase-integration`, `oauth-integration`, `workspace-integration`, `gemini-api`, `google-maps-platform`.
  - [x] Set up Firebase terms approval.
  - [x] Set up OAuth permissions.

- [x] **Phase 2: Database and API Layer Configuration**
  - [x] Design Firestore blueprint `firebase-blueprint.json` and `firestore.rules`.
  - [x] Implement backend `server.ts` with Vite development server integration, handling API routes for Gemini models, Workspace API proxying, and weather proxy requests.
  - [x] Declare all new environment variables in `.env.example`.

- [x] **Phase 3: Core Client Weather Components**
  - [x] Implement robust Types system in `src/types.ts` for Weather, Workspace items, AI settings, and User settings.
  - [x] Build current weather, hourly, daily, AQI, wind, and rain details modules.
  - [x] Create an interactive custom-drawn weather map component showing precipitation, cloud layers, and temperatures.
  - [x] Add astronomy widgets (sunrise/sunset, moon phases, golden hour) and severe weather alerts.

- [x] **Phase 4: Professional & Traveler Dashboard Features**
  - [x] Create a traveler-focused trip planner comparing weather for multiple cities, suggesting packing lists, and predicting AI-powered flight delays.
  - [x] Build the Professional dashboard: Overlay Google Calendar schedules with weather conditions, sync outdoor tasks with Google Tasks, and add reschedule alerts.
  - [x] Implement custom home screen widgets and user personalization options (temperature units, dashboard layout config).

- [x] **Phase 5: Gemini AI Intelligence Hub**
  - [x] Build the Multi-turn Chatbot using `gemini-3.5-flash` with conversation history and a tailored weather expert role.
  - [x] Create the TTS Assistant using `models/gemini-3.1-flash-tts-preview` to generate morning spoken audio briefings.
  - [x] Add the Live Voice conversation simulator using `models/gemini-3.1-flash-live-preview`.
  - [x] Implement Search Grounding (`gemini-3.5-flash` + search) for real-time local alert queries, and Maps Grounding (`gemini-3.5-flash` + maps) for travel destinations.
  - [x] Implement High Thinking planner (`gemini-3.1-pro-preview` with `thinkingLevel: "HIGH"`) for complex itineraries.

- [x] **Phase 6: Auth, Sidebar Frame, & Demo Data**
  - [x] Design a gorgeous modern Dashboard container with fluid responsive grids and sidebar navigation.
  - [x] Set up Firebase Auth and Firestore syncing for user settings, itineraries, and widgets.
  - [x] Seed full demo data so the dashboard is alive on first load for non-auth or initial states.
  - [x] Compile, verify linter, and run test builds to guarantee production quality.

- [x] **Phase 7: Sandbox Iframe Environment Compatibility**
  - [x] Solve `Uncaught TypeError: Cannot set property fetch of #<Window> which has only a getter` error triggered by deep third-party polyfills like `formdata-polyfill` (pulled by `node-fetch`).
  - [x] Inject a lightweight descriptor patch at the top of `/index.html` to redefine `window.fetch` and `globalThis.fetch` with safe getter/setter descriptors to prevent assignment exceptions.
  - [x] Compile and verify linter to ensure flawless browser operation and a completely green applet state.

- [x] **Phase 8: Outstanding User Feature Refinements**
  - [x] **AIAssistant Streaming & Logo**: Update `AIAssistant` to initialize with "How can I help?" system message, replace standard Bot icon with a gorgeous custom 4-point Gemini star SVG logo (based on Image 1), and implement real SSE streaming response handling.
  - [x] **Astronomy Countdown & Phases**: Add a 1-second dynamic countdown timer to the next sunset or sunrise inside `AstronomyMetrics`, and support specific moon phases like waning crescent.
  - [x] **WeatherMap Zoom & Scroll**: Build native non-passive mouse wheel zoom and dedicated Zoom controls inside `WeatherMap` to prevent document scrolling and support precise coordinate centering.
  - [x] **Global Settings Persistence**: Persist Guest unit choices in local storage and synchronize authenticated settings with Firestore on mount/change.

- [ ] **Phase 9: Detailed Refinements & Integrations**
  - [ ] **Weather Fetching Optimization**: Integrate commercial Open-Meteo API using `OPEN_METEO_API_KEY` with graceful public API fallbacks and ensure perfect mapping in `App.tsx` matching all UI widgets.
  - [ ] **Google Maps Integration**: Implement Google Maps inside `WeatherMap.tsx` using `GOOGLE_MAPS_PLATFORM_KEY`, ensuring interactive zooming, panning, and responsive centering on the selected city coordinates.
  - [ ] **High-Fidelity Branded Skeletons**: Replace existing loading screens in `App.tsx` with high-fidelity, branded skeleton screens featuring the Aerocast branding and Gemini logo consistently across Astronomy, Hourly Forecast, and other widgets.
  - [ ] **Firestore Theme Selector**: Add a Theme Selector dropdown to the Personalize tab that persists options (Light, Dark, System) to Firestore and immediately applies them globally.
  - [ ] **AIAssistant UI Refinements**: Rename 'Gemini AI Hub' to 'Aerocast AI Hub' in UI text and set the initial system message/thinking state to 'Aerocast weather AI is thinking...' during streaming.
