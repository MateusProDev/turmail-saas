import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    // Raise warning threshold a bit and split vendor code into logical chunks
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor_react'
            if (id.includes('firebase')) return 'vendor_firebase'
            if (id.includes('axios')) return 'vendor_axios'
            if (id.includes('dompurify')) return 'vendor_dompurify'
            return 'vendor'
          }
        }
      }
    }
  }
})
