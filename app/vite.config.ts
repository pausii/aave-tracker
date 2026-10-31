import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// A relative base lets the site be served from the root or a GitHub Pages subpath
export default defineConfig({
  base: './',
  plugins: [
    svelte(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Aave Tracker',
        short_name: 'Aave',
        description: 'Daily interest on USDT supplied to Aave V3.',
        start_url: '.',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0A1422',
        theme_color: '#0A1422',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Fonts are deliberately absent: the build ships every unicode subset
        // (cyrillic, greek, vietnamese) and precaching them would download
        // roughly 400 KB that this browser will never use. They are cached at
        // runtime instead, so only the subset actually requested is kept.
        globPatterns: ['**/*.{js,css,html,svg}', 'icons/*.png'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // The data must never be served from cache while the network is
            // reachable. Showing yesterday's figures without saying so is the
            // one failure this dashboard must not have.
            urlPattern: ({ url }) => url.pathname.endsWith('portfolio.enc.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'portfolio-data',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 1 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  build: { outDir: 'dist', emptyOutDir: true },
});
