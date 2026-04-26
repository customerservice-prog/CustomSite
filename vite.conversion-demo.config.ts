import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/** Homepage hero island: stable filenames for root index.html (run after main `vite build`). */
export default defineConfig({
  plugins: [react()],
  base: '/dist-admin/',
  root: '.',
  publicDir: false,
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss({ config: path.resolve(__dirname, 'tailwind.conversion-demo.config.js') }),
        autoprefixer(),
      ],
    },
  },
  build: {
    outDir: 'dist-admin',
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/conversion-demo-mount.tsx'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/conversion-demo.js',
        assetFileNames: 'assets/conversion-demo[extname]',
      },
    },
  },
});
