import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2015',
    minify: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/code.ts'),
      output: {
        entryFileNames: 'code.js',
        format: 'iife',
        strict: false,
        esModule: false,
        inlineDynamicImports: true
      }
    }
  },
  plugins: [{
    name: 'copy-ui',
    closeBundle() {
      copyFileSync('src/ui.html', 'dist/ui.html');
    }
  }]
}); 