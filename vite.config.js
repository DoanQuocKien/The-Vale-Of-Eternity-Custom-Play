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
  build: {
    outDir: 'web-dist',
  },
  server: {
    port: 3000,
    host: true,
    headers: {
      // Required for SharedArrayBuffer used by Transformers.js WASM inference
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/__neutralino_globals.js': {
          target: 'http://127.0.0.1:8008',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, private';
          });
          proxy.on('error', (err, req, res) => {
            res.writeHead(200, { 
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-store, no-cache, must-revalidate, private'
            });
            res.end('// Neutralino server starting up...');
          });
        }
      },
      '/neutralino.js': {
          target: 'http://127.0.0.1:8008',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate, private';
          });
          proxy.on('error', (err, req, res) => {
            res.writeHead(200, { 
              'Content-Type': 'application/javascript',
              'Cache-Control': 'no-store, no-cache, must-revalidate, private'
            });
            res.end('// Neutralino server starting up...');
          });
        }
      }
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
