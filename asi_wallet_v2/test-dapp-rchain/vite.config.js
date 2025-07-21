import { defineConfig } from 'vite';

export default defineConfig({
  // Set base for GitHub Pages deployment
  base: process.env.GITHUB_PAGES ? '/test-dapp-rchain/' : '/',
  server: {
    port: 3003,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Ensure assets use relative paths
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});