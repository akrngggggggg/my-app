// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    minify: false,  // 🔥 エラーを確認するために一時的に無効化
    sourcemap: true,  // 🔥 デバッグを容易にするために sourcemap を有効化
  },
});
