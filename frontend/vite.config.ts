import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api calls to the Cloudflare Worker running locally on port 8787
    proxy: { '/api': 'http://localhost:8787' },
  },
})
