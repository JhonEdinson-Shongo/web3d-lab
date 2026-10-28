import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/web3d-lab/' : '/',
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
}));
