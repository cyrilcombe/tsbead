import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const repository = process.env.GITHUB_REPOSITORY
const repoName = repository?.split('/')[1]
const base = process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/'

export default defineConfig({
  plugins: [react()],
  base,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
  },
})
