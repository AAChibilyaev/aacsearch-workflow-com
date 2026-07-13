import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: { 'aacsearch-ui': 'src/index.ts' },
        format: ['iife'],
        globalName: 'AACSearch',
        dts: true,
        clean: true,
        sourcemap: true,
        minify: true,
        treeshake: true,
        outExtension() { return { js: '.js' } },
    },
    {
        entry: { 'aacsearch-ui': 'src/index.ts' },
        format: ['esm'],
        dts: true,
        clean: false,
        sourcemap: true,
        treeshake: true,
        outExtension() { return { js: '.mjs' } },
        onSuccess: 'cp src/theme.css dist/theme.css 2>/dev/null; echo "✓"',
    },
])
