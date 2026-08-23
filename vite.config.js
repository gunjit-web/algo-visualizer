import { defineConfig } from 'vite';

export default defineConfig({
  base: '/algo-visualizer/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
