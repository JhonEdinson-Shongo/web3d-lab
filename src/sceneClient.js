// Arranca la escena 3D en un worker y, si el navegador no puede, en el hilo principal.
// main.js usa siempre la misma interfaz y no sabe en qué hilo corre.
const METHODS = ['update', 'resize', 'setColor', 'setAccent', 'spinBy'];

export function startScene(canvas, options) {
  const latest = new Map(); // última llamada de cada método: se repite al cambiar de hilo
  let send = null;

  async function runOnMainThread(el) {
    send = null;
    try {
      const { createScene } = await import('./scene.js');
      const scene = createScene(el, options);
      send = (method, args) => scene[method](...args);
      latest.forEach((args, method) => send(method, args));
    } catch (err) {
      console.warn('WebGL no disponible; se muestra solo el contenido de texto.', err);
    }
  }

  function runInWorker() {
    const worker = new Worker(new URL('./scene.worker.js', import.meta.url), { type: 'module' });
    const offscreen = canvas.transferControlToOffscreen();
    // un canvas transferido ya no sirve en este hilo: el plan B necesita uno nuevo
    const fallBack = () => {
      worker.terminate();
      const fresh = canvas.cloneNode();
      canvas.replaceWith(fresh);
      runOnMainThread(fresh);
    };
    worker.onerror = fallBack;
    worker.onmessage = ({ data }) => data.failed && fallBack();
    worker.postMessage({ canvas: offscreen, options }, [offscreen]);
    send = (method, args) => worker.postMessage({ method, args });
  }

  if ('transferControlToOffscreen' in canvas) runInWorker();
  else runOnMainThread(canvas);

  return Object.fromEntries(
    METHODS.map((method) => [
      method,
      (...args) => {
        latest.set(method, args);
        send?.(method, args);
      },
    ]),
  );
}
