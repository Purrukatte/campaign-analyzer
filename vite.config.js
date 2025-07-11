import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react({
    // JSX transformasyonunu React ile açıkça yapılandıralım
    jsxRuntime: 'automatic',
    // JSX dosyalarını işleyelim
    include: '**/*.jsx',
  })],
  base: '/campaign-analyzer/',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    }
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
})
