import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        changeOrigin: true,
        cookieDomainRewrite: {
          '*': '',
        },
        rewrite: (path) => `/byy/workflow_server${path}`,
        target: 'http://8.148.15.122:4001',
      },
      '/admin_api': {
        changeOrigin: true,
        cookieDomainRewrite: {
          '*': '',
        },
        rewrite: (path) => `/byy/workflow_server${path}`,
        target: 'http://8.148.15.122:4001',
      },
      '/cos': {
        changeOrigin: true,
        cookieDomainRewrite: {
          '*': '',
        },
        rewrite: (path) => `/byy/workflow_server${path}`,
        target: 'http://8.148.15.122:4001',
      },
      // '/': {
      //   changeOrigin: true,
      //   // rewrite: (path) => `/byy/workflow_server${path}`,
      //   target: 'http://192.168.30.20:4000/byy/workflow_server',
      // },
    },
  },
})
