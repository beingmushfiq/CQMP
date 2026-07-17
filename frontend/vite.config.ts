import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg', 'icon-192.svg', 'icon-512.svg'],
      manifest: false, // We manage manifest.json ourselves in /public
      workbox: {
        // Cache all assets for offline support
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Network-first for API calls, cache-first for static assets
        runtimeCaching: [
          {
            urlPattern: /^http:\/\/localhost:8000\/api\/.*/i,
            handler: 'NetworkOnly',
            options: {
              backgroundSync: {
                name: 'cqmp-api-queue',
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          },
        ],
        // Skip waiting so new service workers activate immediately
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: true,          // Enable SW in dev so we can test
        type: 'module',
      },
    }),
  ],
});
