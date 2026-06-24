import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['fs', 'stream', 'util', 'events', 'path'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: './', // Ensures relative paths in builds for desktop/offline usage
  server: {
    port: 3000,
    host: true,
    headers: {
      // Required for SharedArrayBuffer used by Transformers.js WASM inference
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  },
  optimizeDeps: {
    // Exclude large WASM/ONNX packages from Vite's dependency pre-bundling
    exclude: [
      '@huggingface/transformers',
      'upscaler',
      '@upscalerjs/esrgan-medium',
      '@tensorflow/tfjs',
    ]
  },
  worker: {
    format: 'es' // ES module workers for Transformers.js compatibility
  }
});
