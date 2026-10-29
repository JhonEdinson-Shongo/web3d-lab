import { defineConfig } from 'vite';

// GitHub Pages sirve el sitio en /web3d-lab/. `vite preview` cuenta como "serve",
// por eso se revisa isPreview: así el preview usa la misma ruta que el build.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/web3d-lab/' : '/',
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
}));
