import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/RRHH/',
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
})