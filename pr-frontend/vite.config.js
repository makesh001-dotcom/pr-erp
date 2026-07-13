// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(),
    tailwindcss(),
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 100, // Check for changes every 100ms
    },
    hmr: {
        overlay: true, // Show errors directly on the screen
    }
  },
})