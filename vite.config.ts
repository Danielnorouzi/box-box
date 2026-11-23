import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  // `--mode artifact` builds a single-page preview without the service worker.
  base: mode === 'artifact' ? './' : '/',
  resolve: mode === 'artifact' ? { alias: { 'virtual:pwa-register': '/src/pwa-stub.ts' } } : undefined,
  build: mode === 'artifact' ? { rollupOptions: { output: { inlineDynamicImports: true } } } : undefined,
  plugins: [
    react(),
    mode !== 'artifact' && VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Box Box',
        short_name: 'Box Box',
        description: 'Study sessions run as Formula 1 races.',
        theme_color: '#0d0f12',
        background_color: '#0d0f12',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: { host: true },
}));
