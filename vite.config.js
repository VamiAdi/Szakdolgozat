import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'RehabologyLogo.png',
        'RehabologyLogo-title.png',
        'RehabologyLogo-title512.png',
        'RehabologyLogo-title192.png',
        'Background_image.png',
      ],
      manifest: {
        name: 'Rehabology',
        short_name: 'Rehabology',
        description: 'Rehabology - rehabilitációs gyakorlatok és támogatás.',
        theme_color: '#c8dabd',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/RehabologyLogo-title512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/RehabologyLogo-title192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        navigateFallback: '/index.html',
      },
    }),
  ],
})
