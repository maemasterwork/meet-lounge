import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative, so the build works on GitHub Pages under /<repo>/ and on a custom domain.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', chunkSizeWarningLimit: 300 },
  test: { environment: 'node', include: ['src/**/*.test.ts'], setupFiles: ['src/test-setup.ts'] },
})
