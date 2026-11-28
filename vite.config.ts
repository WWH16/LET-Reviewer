import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { trimLayeredRules, usedTokens } from './build/trim-css';

/** Build only: trims Kumo's layered stylesheet to the classes the bundle uses (build/trim-css.ts). */
function trimKumoCss(): Plugin {
  return {
    name: 'trim-kumo-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const files = Object.values(bundle);
      const used = usedTokens(files.flatMap((f) => (f.type === 'chunk' ? [f.code] : f.fileName.endsWith('.html') ? [String(f.source)] : [])));
      for (const f of files) if (f.type === 'asset' && f.fileName.endsWith('.css')) f.source = trimLayeredRules(String(f.source), used);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    trimKumoCss(),
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
