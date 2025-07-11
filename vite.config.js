import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/campaign-analyzer/',
  build: {
    outDir: 'dist'
  },
  // TypeScript'i atlayarak direkt JSX dosyalarıyla çalışalım
  esbuild: {
    jsx: 'automatic',
    jsxInject: `import React from 'react'`
  }
})
