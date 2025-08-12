import path from 'path'; // Keep this import as it's used in resolve.alias
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

const PORT = 3039; // Your React app's development port

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
      eslint: {
        useFlatConfig: true,
        lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
        dev: { logLevel: ['error'] },
      },
      overlay: {
        position: 'tl',
        initialIsOpen: false,
      },
    }),
  ],
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
    // <--- START: PROXY CONFIGURATION - REMOVED FOR CLEANLINESS --->
    // Agar aapka backend ab CORS headers bhej raha hai, toh proxy ki zaroorat nahi hai.
    // Aap is 'proxy' section ko yahan se hata sakte hain.
    /*
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
      },
    },
    */
    // <--- END: PROXY CONFIGURATION - REMOVED FOR CLEANLINESS --->
  },
  preview: { // Configuration for 'vite preview' command (production preview)
    port: PORT,
    host: true,
    // Production preview ke liye bhi proxy ki zaroorat nahi hai agar backend headers bhej raha hai.
    /*
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false,
      },
    },
    */
  },
});