import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    // React y framer-motion cambian mucho menos que el código de la app:
    // separarlos permite cachearlos de forma independiente entre despliegues.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          motion: ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 400,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    exclude: ['node_modules/**', 'src-backend/**', 'e2e/**'],
  }
})
