import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    watch: {
      usePolling: true, // Necesario para hot-reload en Docker
    },
    hmr: {
      clientPort: 5173, // Puerto para Hot Module Replacement
    }
  },
  build: {
    // Optimizaciones de build
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.logs en producción
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Code splitting para mejor caching
          vendor: ['react', 'react-dom', 'react-router-dom'],
          axios: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
