import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    host: '0.0.0.0'
  }
})
