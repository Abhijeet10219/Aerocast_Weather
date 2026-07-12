import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Vite resolves .env files after this config runs, so load the exact runtime
  // name explicitly. The injected Maps JavaScript key is browser-visible by
  // design and must be restricted by HTTP referrer and API in Google Cloud.
  // Never add OPEN_METEO_API_KEY here; it is a server-only credential.
  const env = loadEnv(mode, process.cwd(), '');
  const googleMapsPlatformKey =
    process.env.GOOGLE_MAPS_PLATFORM_KEY || env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const disableHmr = process.env.DISABLE_HMR || env.DISABLE_HMR;

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(googleMapsPlatformKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    optimizeDeps: {
      exclude: ['@google/genai', 'express', 'dotenv'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: disableHmr !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: disableHmr === 'true' ? null : {},
    },
  };
});
