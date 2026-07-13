import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/int/**/*.int.spec.ts'],
    server: {
      deps: {
        // dist imports './lexicalFeature/feature.server' without .js — strict
        // Node ESM can't resolve it, so let Vite transform the package instead
        inline: ['payload-better-preview'],
      },
    },
  },
})
