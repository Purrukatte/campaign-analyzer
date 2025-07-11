import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    // JSX transformasyonunu React ile açıkça yapılandıralım
    jsxRuntime: 'automatic',
    // JSX importlarını otomatik ekletelim
    include: '**/*.js',
  })],
  base: '/campaign-analyzer/',
  build: {
    outDir: 'dist'
  }
})
