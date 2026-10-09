import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const serverEnv = loadEnv(mode, '../server', '')
  const apiPort = serverEnv.PORT || '5000'
  const apiTarget = env.API_PROXY_TARGET || `http://127.0.0.1:${apiPort}`

  return {
    plugins: [react()],
    server: {
      host: "127.0.0.1",
      proxy: {
        "/api": apiTarget,
        "/health": apiTarget,
      },
    },
  }
})
