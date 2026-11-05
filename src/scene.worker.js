import { createScene } from './scene.js';

// Hilo aparte para Three.js: crear el contexto WebGL, compilar shaders y dibujar cada frame
// no bloquea el hilo principal, y el scroll y los clics responden aunque la GPU vaya lenta.
let scene;

self.onmessage = ({ data }) => {
  if (data.canvas) {
    try {
      scene = createScene(data.canvas, data.options);
    } catch (err) {
      self.postMessage({ failed: String(err) });
    }
    return;
  }
  scene?.[data.method](...data.args);
};
