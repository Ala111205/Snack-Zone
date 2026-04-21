import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  /* ── Dev server ──────────────────────────────────── */
  server: {
    port: 3000,
    proxy: {
      '/api':     { target: 'http://localhost:5000', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },

  /* ── Production build optimizations ─────────────── */
  build: {
    target:    'es2018',
    sourcemap: false,           // no sourcemaps in production — smaller bundle
    minify:    'esbuild',       // fastest minifier
    cssCodeSplit: true,         // split CSS per chunk
    assetsInlineLimit: 4096,    // inline assets <4KB as base64

    rollupOptions: {
      output: {
        // Manual chunk splitting — separate vendor code from app code
        // Vendor chunks are cached by browsers forever (content-hash changes only when deps change)
        manualChunks: {
          'react-vendor':  ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor':     ['react-hot-toast', 'axios'],
        },
        // Deterministic file names for long-term caching
        chunkFileNames:   'assets/js/[name]-[hash].js',
        entryFileNames:   'assets/js/[name]-[hash].js',
        assetFileNames:   'assets/[ext]/[name]-[hash].[ext]',
      },
    },

    // Warn when a chunk is >400KB
    chunkSizeWarningLimit: 400,
  },

  /* ── Asset optimisation ──────────────────────────── */
  assetsInclude: ['**/*.webp', '**/*.avif'],
});
