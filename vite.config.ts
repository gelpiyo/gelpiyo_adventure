/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/game.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [
    {
      // type="module" を除去して file:// でも動くようにする
      name: 'remove-module-type',
      transformIndexHtml(html: string) {
        return html.replace(/<script type="module" crossorigin/g, '<script')
      },
    },
  ],
  server: {
    port: 3000,
    open: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
})
