import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Phase 2: uncomment to proxy API calls to the Cloudflare Worker
  // server: {
  //   proxy: { '/api': 'http://localhost:8787' },
  // },
})
