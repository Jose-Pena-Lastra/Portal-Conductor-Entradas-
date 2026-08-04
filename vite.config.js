import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Portal-Conductor-Entradas-/',
  plugins: [react()],
  server: {
    port: 5174,
    watch: {
      usePolling: true
    }
  }
})
