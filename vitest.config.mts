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
        // These packages' dist use extensionless / directory ESM imports that
        // strict Node ESM can't resolve (better-preview → './lexicalFeature/
        // feature.server'; cmdk → './dist/translations'). Let Vite transform them.
        inline: ['payload-better-preview', '@veiag/payload-cmdk'],
      },
    },
  },
})
