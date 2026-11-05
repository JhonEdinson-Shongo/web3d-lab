// Canvas 2D para dibujar texturas. En un worker no existe `document`, así que se usa
// OffscreenCanvas; los navegadores sin él corren la escena en el hilo principal.
export function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
