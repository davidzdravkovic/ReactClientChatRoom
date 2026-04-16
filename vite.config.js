import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const allowInsecureProd = env.ALLOW_INSECURE_PROD_BUILD === 'true'

  if (mode === 'production') {
    const ws = env.VITE_WS_URL?.trim()
    const media = env.VITE_MEDIA_BASE?.trim()
    if (!ws || !media) {
      throw new Error(
        'Production build requires VITE_WS_URL and VITE_MEDIA_BASE. Copy .env.production.example to .env.production or set them in your CI/hosting dashboard.'
      )
    }
    if (!allowInsecureProd) {
      if (!ws.startsWith('wss://')) {
        throw new Error(
          `VITE_WS_URL must start with wss:// in production (got "${ws}"). For a local prod build against ws://, set ALLOW_INSECURE_PROD_BUILD=true in .env.production.`
        )
      }
      if (!media.startsWith('https://')) {
        throw new Error(
          `VITE_MEDIA_BASE must start with https:// in production (got "${media}"). For a local prod build against http://, set ALLOW_INSECURE_PROD_BUILD=true in .env.production.`
        )
      }
    }
  }

  return {
    plugins: [react()],
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
    },
  }
})
