import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Portátil construido 100% con código (sin archivo .glb).
// Más adelante lo reemplazaremos por un modelo hecho en Blender (ver README).

const W = 3; // ancho
const D = 2.1; // profundidad
const BASE_H = 0.08; // grosor de la base
const LID_H = 0.05; // grosor de la tapa

export const OPEN_ANGLE = -1.9; // radianes (~110°)

export function createLaptop() {
  const group = new THREE.Group();

  // --- Materiales PBR ---
  const aluminium = new THREE.MeshPhysicalMaterial({
    color: 0x3b3e46,
    metalness: 1,
    roughness: 0.32,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  });
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.55 });
  const blackGlass = new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.1, metalness: 0.2 });
  const trackpadMat = new THREE.MeshPhysicalMaterial({ color: 0xb5b8bf, metalness: 0.9, roughness: 0.45 });

  // --- Base ---
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, BASE_H, D, 4, 0.035), aluminium);
  base.position.y = BASE_H / 2;
  group.add(base);

  // --- Teclado: una sola InstancedMesh = un solo draw call para todas las teclas ---
  const COLS = 13;
  const ROWS = 5;
  const STEP = 0.19;
  const KEY = 0.16;
  const keyGeo = new RoundedBoxGeometry(KEY, 0.016, KEY, 2, 0.007);
  const keys = new THREE.InstancedMesh(keyGeo, keyMat, COLS * ROWS);
  const matrix = new THREE.Matrix4();
  const startX = -((COLS - 1) * STEP) / 2;
  const startZ = -D / 2 + 0.38;
  let count = 0;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      // la última fila deja hueco para la barra espaciadora
      if (row === ROWS - 1 && col >= 4 && col <= 8) continue;
      matrix.makeTranslation(startX + col * STEP, BASE_H, startZ + row * STEP);
      keys.setMatrixAt(count++, matrix);
    }
  }
  keys.count = count;
  group.add(keys);

  const spacebar = new THREE.Mesh(new RoundedBoxGeometry(STEP * 4 + KEY, 0.016, KEY, 2, 0.007), keyMat);
  spacebar.position.set(startX + 6 * STEP, BASE_H, startZ + (ROWS - 1) * STEP);
  group.add(spacebar);

  // --- Retroiluminación (tipo MacBook) ---
  // Dos planos con mezcla aditiva del tamaño del teclado:
  //  1. bajo las teclas: solo se ve en las rendijas, como la luz que se escapa por los bordes
  //  2. sobre las teclas: las letras iluminadas
  // La intensidad se controla con setBacklight(0..1).
  const { glow, legends } = createBacklightTextures({ COLS, ROWS, STEP, KEY });
  const backlightMats = [];
  for (const [map, y, max] of [
    [glow, BASE_H + 0.0005, 0.7],
    [legends, BASE_H + 0.0085, 0.95],
  ]) {
    const mat = new THREE.MeshBasicMaterial({
      map,
      color: 0xfff4e6, // blanco ligeramente cálido
      transparent: true,
      opacity: 0, // empieza apagada
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    mat.userData.max = max;
    backlightMats.push(mat);

    const layer = new THREE.Mesh(new THREE.PlaneGeometry(COLS * STEP, ROWS * STEP), mat);
    layer.rotation.x = -Math.PI / 2;
    layer.position.set(0, y, startZ + ((ROWS - 1) * STEP) / 2);
    group.add(layer);
  }
  function setBacklight(level) {
    for (const mat of backlightMats) mat.opacity = level * mat.userData.max;
  }

  // --- Trackpad ---
  const trackpad = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.62), trackpadMat);
  trackpad.rotation.x = -Math.PI / 2;
  trackpad.position.set(0, BASE_H + 0.001, D / 2 - 0.42);
  group.add(trackpad);

  // --- Bisagra ---
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, W - 0.7, 24), keyMat);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, BASE_H + 0.01, -D / 2 + 0.03);
  group.add(hinge);

  // --- Tapa: el "pivot" es la bisagra; rotarlo abre/cierra la tapa ---
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, BASE_H + 0.01, -D / 2 + 0.02);
  group.add(lidPivot);

  const lid = new THREE.Mesh(new RoundedBoxGeometry(W, LID_H, D, 4, 0.024), aluminium);
  lid.position.set(0, LID_H / 2, D / 2 - 0.02);
  lidPivot.add(lid);

  // Logo en la parte exterior de la tapa (SVG de public/textures, 200×60)
  const logoMat = new THREE.MeshPhysicalMaterial({
    metalness: 1,
    roughness: 0.08,
    transparent: true,
    visible: false, // se muestra cuando la textura termina de cargar
  });
  // BASE_URL antepone el prefijo del sitio ('/' en local, '/web3d-lab/' en GitHub Pages)
  loadSvgTexture(`${import.meta.env.BASE_URL}textures/logo.svg`, 2048).then((texture) => {
    logoMat.map = texture;
    logoMat.visible = true;
    logoMat.needsUpdate = true;
  });
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.33), logoMat);
  logo.rotation.x = -Math.PI / 2; // se lee de frente con la tapa cerrada
  logo.position.set(0, LID_H + 0.001, D / 2 - 0.02);
  lidPivot.add(logo);

  // Al abrir la tapa, el logo pasa a apuntar hacia abajo y se leería al revés.
  // Si su "arriba" apunta hacia abajo en pantalla, lo giramos 180° sobre sí mismo.
  // El cambio ocurre cuando la tapa está de canto frente a la cámara, por eso no se nota.
  const logoUp = new THREE.Vector3();
  function orientLogo(camera) {
    logo.updateWorldMatrix(true, false);
    logoUp.setFromMatrixColumn(logo.matrixWorld, 1).transformDirection(camera.matrixWorldInverse);
    if (logoUp.y < 0) logo.rotation.z = logo.rotation.z === 0 ? Math.PI : 0;
  }

  // Marco negro + pantalla (en la cara interior de la tapa, mirando hacia abajo cuando está cerrada)
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.06, D - 0.06), blackGlass);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.set(0, -0.0005, D / 2 - 0.02);
  lidPivot.add(bezel);

  const screenMat = new THREE.MeshBasicMaterial({ map: createScreenTexture(), toneMapped: false });
  screenMat.color.setScalar(0); // empieza apagada
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.22, D - 0.22), screenMat);
  screen.rotation.x = Math.PI / 2;
  screen.position.set(0, -0.001, D / 2 - 0.02);
  lidPivot.add(screen);

  // Las capas transparentes (logo, retroiluminación) no proyectan sombra
  group.traverse((obj) => {
    if (obj.isMesh) obj.castShadow = !obj.material.transparent;
  });

  return { group, lidPivot, screenMat, aluminium, orientLogo, setBacklight };
}

// Letras de cada fila; '' = hueco de la barra espaciadora
const LEGENDS = [
  ['esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '⌫'],
  ['⇥', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['⇪', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", '↩'],
  ['⇧', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', '⇧', '↑'],
  ['fn', '⌃', '⌥', '⌘', '', '', '', '', '', '⌘', '←', '↓', '→'],
];

// Texturas de la retroiluminación, dibujadas con la misma rejilla que el teclado.
// El canvas cubre el teclado completo: arriba del canvas = fila del fondo (junto a la bisagra).
function createBacklightTextures({ COLS, ROWS, STEP, KEY }) {
  const PPU = 640; // píxeles por unidad 3D
  const width = Math.round(COLS * STEP * PPU);
  const height = Math.round(ROWS * STEP * PPU);
  const key = KEY * PPU;

  // Rectángulo de cada tecla en píxeles (la barra espaciadora ocupa las columnas 4–8)
  const rects = [];
  LEGENDS.forEach((row, r) => {
    row.forEach((label, c) => {
      if (label === '') return;
      rects.push({ label, cx: (c + 0.5) * STEP * PPU, cy: (r + 0.5) * STEP * PPU, w: key });
    });
  });
  rects.push({ label: '', cx: 6.5 * STEP * PPU, cy: (ROWS - 0.5) * STEP * PPU, w: (STEP * 4 + KEY) * PPU });

  const makeCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return [canvas, canvas.getContext('2d')];
  };
  const toTexture = (canvas) => {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  };

  // 1. Halo: cada tecla rellena con un resplandor difuso; la tecla tapa el centro
  //    y solo queda visible el borde de luz en las rendijas
  const [glowCanvas, g] = makeCanvas();
  g.fillStyle = '#fff';
  g.shadowColor = '#fff';
  g.shadowBlur = 0.03 * PPU;
  for (const { cx, cy, w } of rects) g.fillRect(cx - w / 2, cy - key / 2, w, key);

  // 2. Letras centradas en cada tecla; las de varias letras (esc, fn) más pequeñas
  const [legendCanvas, l] = makeCanvas();
  l.fillStyle = '#fff';
  l.textAlign = 'center';
  l.textBaseline = 'middle';
  l.shadowColor = 'rgba(255, 255, 255, 0.6)';
  l.shadowBlur = 0.006 * PPU;
  for (const { label, cx, cy } of rects) {
    if (!label) continue;
    const size = label.length > 1 ? 0.04 : 0.06;
    l.font = `500 ${size * PPU}px -apple-system, 'SF Pro Text', Helvetica, sans-serif`;
    l.fillText(label, cx, cy);
  }

  return { glow: toTexture(glowCanvas), legends: toTexture(legendCanvas) };
}

// Un SVG cargado directo como textura saldría a su tamaño nativo (200px) y pixelado,
// así que lo dibujamos en un canvas grande antes de pasarlo a Three.js
function loadSvgTexture(url, width) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = Math.round((width * img.height) / img.width);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      resolve(texture);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Dibujamos la "pantalla" con un canvas 2D y lo usamos como textura
function createScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 700;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 1024, 700);
  g.addColorStop(0, '#2b1b5a');
  g.addColorStop(0.5, '#1f4fbf');
  g.addColorStop(1, '#5fd3e6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 700);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 96px -apple-system, Helvetica, sans-serif';
  ctx.fillText('Shongo :3', 512, 360);
  ctx.font = '36px -apple-system, Helvetica, sans-serif';
  ctx.globalAlpha = 0.75;
  ctx.fillText('jhoncastaneda.vercel.app', 512, 430);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
