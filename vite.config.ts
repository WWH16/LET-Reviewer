import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' with no prompt UI: a new version waits until the app is closed,
      // so an update never swaps the app in the middle of a mock exam.
      registerType: 'prompt',
      includeAssets: ['icon-180.png', 'favicon.ico', 'favicon.svg'],
      manifest: {
        name: 'LET Prep',
        short_name: 'LET Prep',
        description: 'Offline practice for the Licensure Examination for Teachers',
        display: 'standalone',
        start_url: '.',
        background_color: '#FAF9F5',
        theme_color: '#FAF9F5',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // Latin-ext font files are left out of the offline cache: English and Filipino need only latin.
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], globIgnores: ['**/*-ext-*.woff2'] },
    }),
  ],
});
