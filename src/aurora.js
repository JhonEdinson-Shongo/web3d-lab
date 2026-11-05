// Aurora (CSS, detrás del canvas): tres manchas de color muy desenfocadas (ver #aurora en style.css).
// CSS se encarga del movimiento y de la transición entre colores; aquí solo cambiamos los colores.
export function createAurora(el) {
  const blobs = [...el.children];
  return {
    setPalette(colors) {
      blobs.forEach((blob, i) => (blob.style.backgroundColor = colors[i % colors.length]));
    },
    setIntensity(opacity) {
      el.style.setProperty('--aurora-opacity', opacity);
    },
  };
}
