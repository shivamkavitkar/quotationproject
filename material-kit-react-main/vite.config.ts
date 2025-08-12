import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const PORT = 3039;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^src(.+)/,
        replacement: path.resolve(process.cwd(), 'src/$1'),
      },
    ],
  },
  server: {
    port: PORT,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path, // Keep this as is for your /api/products route
        secure: false,
      },
    },
  },
  preview: { // It's good practice to mirror the proxy config here for preview builds
    port: PORT,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
      },
    },
  },
});