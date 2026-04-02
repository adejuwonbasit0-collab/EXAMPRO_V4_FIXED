import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    // Output to public/dist so Express serves it as /dist/builder.js
    outDir: path.resolve(__dirname, 'public/dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        builder: path.resolve(__dirname, 'src/builder/builderMount.jsx'),
      },
      output: {
        // Single flat file → /dist/builder.js
        entryFileNames: '[name].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name][extname]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
