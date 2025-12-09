import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // <--- Adicione isto

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {              // <--- Adicione este bloco resolve
    alias: {
      '@': path.resolve(__dirname, './'), // Aponta @ para a raiz do projeto
    },
  },
  server: {
    port: 3000,
    host: true, // Permite acesso via IP na rede local
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // Opcional: ver logs do proxy
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})