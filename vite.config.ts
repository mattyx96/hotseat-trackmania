import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy API calls to `wrangler pages dev` (npm run dev:api) so the Vite
    // dev server (HMR) and the Pages Functions run together.
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})
