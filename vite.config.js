import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/arow': {
        target: 'https://artemis2mission.live',
        changeOrigin: true,
      },
    },
  },
})
