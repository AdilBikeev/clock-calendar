import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Позволяет доступ из локальной сети
    port: 3000,
    open: true
  },
  base: './', // Важно для Capacitor - относительные пути
  build: {
    outDir: 'dist'
  }
})

