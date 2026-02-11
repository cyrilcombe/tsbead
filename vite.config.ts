import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const repository = process.env.GITHUB_REPOSITORY
const repoName = repository?.split('/')[1]
const base = process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'TsBead',
        short_name: 'TsBead',
        description: 'TsBead pattern editor',
        theme_color: '#245a58',
        background_color: '#f3efe8',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          {
            src: 'icons/tsbead-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/tsbead-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/tsbead-icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        file_handlers: [
          {
            action: '.',
            accept: {
              'application/x-jbb': ['.jbb'],
              'text/plain': ['.jbb'],
            },
          },
        ],
      },
      workbox: {
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
  base,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
