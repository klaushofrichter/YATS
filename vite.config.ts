import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { trmnlApiPlugin } from './src/server/api-plugin'

export default defineConfig({
  plugins: [vue(), trmnlApiPlugin()],
  server: {
    port: 3000,
  },
})
