import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE ?? 'http://localhost:8000',
        changeOrigin: true,
        // Aura-2 TTS can take a while; don't cut off slow narration requests.
        timeout: 300000,
        proxyTimeout: 300000,
      },
    },
  },
})
