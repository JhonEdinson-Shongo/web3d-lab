import * as THREE from 'three';

// Fondo dinámico: aurora (CSS, detrás del canvas) + partículas de luz (Three.js, dentro de la escena)

// ---------- Aurora ----------
// Tres manchas de color muy desenfocadas (ver #aurora en style.css).
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

// ---------- Partículas ----------
// Polvo de luz alrededor del portátil. Suben despacio con un leve vaivén
// y aceleran cuando se hace scroll rápido (update recibe ese multiplicador).
const AREA = { x: 9, yMin: 0.2, yMax: 5.5, zMin: -7, zMax: 4 };

export function createParticles(count) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const phases = new Float32Array(count);
  const white = new THREE.Color(0xfff4e6);
  const accent = new THREE.Color(0x10b981);
  const isAccent = []; // ~1 de cada 5 partículas lleva el color de acento, el resto blanco cálido

  for (let i = 0; i < count; i++) {
    positions[i * 3] = THREE.MathUtils.randFloatSpread(AREA.x * 2);
    positions[i * 3 + 1] = THREE.MathUtils.randFloat(AREA.yMin, AREA.yMax);
    positions[i * 3 + 2] = THREE.MathUtils.randFloat(AREA.zMin, AREA.zMax);
    speeds[i] = THREE.MathUtils.randFloat(0.05, 0.18);
    phases[i] = Math.random() * Math.PI * 2;
    isAccent[i] = Math.random() < 0.2;
    (isAccent[i] ? accent : white).toArray(colors, i * 3);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.06,
    map: createDotTexture(),
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  const points = new THREE.Points(geometry, material);

  function update(dt, t, speed = 1) {
    for (let i = 0; i < count; i++) {
      const y = i * 3 + 1;
      positions[y] += speeds[i] * speed * dt;
      positions[i * 3] += Math.sin(t * 0.5 + phases[i]) * 0.002;
      // al salir por arriba reaparece abajo
      if (positions[y] > AREA.yMax) positions[y] = AREA.yMin;
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function setAccent(color) {
    accent.set(color);
    for (let i = 0; i < count; i++) if (isAccent[i]) accent.toArray(colors, i * 3);
    geometry.attributes.color.needsUpdate = true;
  }

  return { points, update, setAccent };
}

// Punto redondo y difuso (sin textura, PointsMaterial dibuja cuadrados)
function createDotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}
