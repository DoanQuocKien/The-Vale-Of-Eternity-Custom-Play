import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures relative paths in builds for desktop/offline usage
  server: {
    port: 3000,
    host: true
  }
});
