// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url))
    },
  },
  server: {
    host: true, 
    port: 3000,
    // 🛑 A MÁGICA ESTÁ AQUI: Ignora mudanças na pasta de dados
    watch: {
      ignored: [
        '**/attachments/data/**', 
        '**/data/**',
        '**/*.json' // Ignora qualquer JSON para garantir
      ]
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})