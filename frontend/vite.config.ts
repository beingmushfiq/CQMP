import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env so we can use VITE_API_URL in the workbox config
  const env = loadEnv(mode, process.cwd(), '');

  // Build the API URL pattern for the service worker.
  // Replaces hardcoded localhost:8000 with the actual production API URL.
  const apiUrl = env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
  // Escape for use in a regex — handle dots and slashes
  const apiUrlPattern = apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'logo.svg', 'icon-192.svg', 'icon-512.svg'],
        manifest: false, // We manage manifest.json ourselves in /public
        workbox: {
          // Cache all static assets for offline support
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

          // Network-only for API calls — use env-driven URL, not localhost
          runtimeCaching: [
            {
              // Match the actual production API URL (not hardcoded localhost)
              urlPattern: new RegExp(`^${apiUrlPattern}.*`, 'i'),
              handler: 'NetworkOnly',
              options: {
                backgroundSync: {
                  name: 'cqmp-api-queue',
                  options: { maxRetentionTime: 24 * 60 },
                },
              },
            },
          ],

          // New SW activates immediately — clinic staff always get latest version
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          // Enable SW in dev so offline behavior can be tested
          enabled: true,
          type: 'module',
        },
      }),
    ],

    build: {
      // No source maps in production — prevents exposing app logic
      sourcemap: false,

      // Raise the warning threshold — we expect a moderately sized bundle
      chunkSizeWarningLimit: 600,

      rollupOptions: {
        output: {
          // Split vendor code into separate chunks — browsers cache vendor
          // chunks independently, so a business logic update doesn't bust
          // the React/Zustand/Echo cache.
          // Function form required by Rollup's ManualChunksFunction type.
          manualChunks(id: string) {
            if (id.includes('/react') || id.includes('/react-dom') || id.includes('react/')) {
              return 'vendor';
            }
            if (id.includes('zustand')) {
              return 'state';
            }
            if (id.includes('laravel-echo') || id.includes('pusher-js')) {
              return 'ws';
            }
            if (id.includes('lucide-react')) {
              return 'icons';
            }
          },
        },
      },
    },
  };
});
