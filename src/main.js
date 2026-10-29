import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createLaptop, OPEN_ANGLE } from './laptop.js';
import { createAurora, createParticles } from './background.js';
import { THEMES } from './palettes.js';

gsap.registerPlugin(ScrollTrigger);

// ---------- 1. Renderer, escena y cámara ----------
const canvas = document.querySelector('#webgl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();

// Entorno para los reflejos de los materiales metálicos (PBR)
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
// Animamos estos dos vectores; en cada frame la cámara se ubica en camPos y mira a camTarget
const camPos = new THREE.Vector3(0, 2.2, 7);
const camTarget = new THREE.Vector3(0, 0.7, 0);
let portrait = false; // en pantallas verticales alejamos la cámara y centramos el modelo
const lookTarget = new THREE.Vector3();

// ---------- 2. Luces, sombra y partículas ----------
const keyLight = new THREE.DirectionalLight(0xffffff, 2);
keyLight.position.set(2, 8, 3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -4;
keyLight.shadow.camera.right = 4;
keyLight.shadow.camera.top = 4;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.radius = 10; // a menor resolución + radio, sombra más suave
scene.add(keyLight);

// Plano invisible que solo muestra la sombra
const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.25 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Polvo de luz alrededor del portátil (menos partículas en móvil)
const particles = createParticles(window.matchMedia('(max-width: 700px)').matches ? 180 : 450);
scene.add(particles.points);

// ---------- 3. Modelo ----------
const laptop = createLaptop();

// Jerarquía: parallax (ratón + flotación) > model (scroll) > spin (arrastre) > laptop
const parallax = new THREE.Group();
const model = new THREE.Group();
const spin = new THREE.Group(); // giro con el ratón/dedo en la última sección
spin.add(laptop.group);
model.add(spin);
parallax.add(model);
scene.add(parallax);

model.rotation.set(0.3, -0.7, 0);

// Desplazamiento lateral para dejar espacio al texto de cada sección
const stage = { x: 1.1 };

// ---------- 4. Animación con scroll ----------
const screen = { glow: 0 };

const tl = gsap.timeline({
  defaults: { ease: 'power2.inOut', duration: 1 },
  scrollTrigger: {
    trigger: '#scroll',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1, // suaviza: la animación "persigue" al scroll durante 1s
  },
});

// Sección 1 → 2: se endereza, se abre y se enciende la pantalla
tl.to(model.rotation, { x: 0, y: 0 }, 0)
  .to(stage, { x: -1.1 }, 0)
  .to(laptop.lidPivot.rotation, { x: OPEN_ANGLE }, 0)
  .to(screen, { glow: 1, duration: 0.5, onUpdate: () => {
        laptop.screenMat.color.setScalar(screen.glow);
        laptop.setBacklight(screen.glow); // el teclado se ilumina junto con la pantalla
      } }, 0.5)
  // Sección 2 → 3: la cámara se acerca al teclado desde un lado
  .to(camPos, { x: 2.6, y: 2.4, z: 3.6 }, 1)
  .to(camTarget, { x: 0, y: 0.55, z: 0.2 }, 1)
  .to(stage, { x: 0.4 }, 1)
  // Sección 3 → 4: vista de 3/4 para lucir el material
  .to(camPos, { x: -3.5, y: 2.8, z: 5 }, 2)
  .to(camTarget, { x: -0.6, y: 0.85, z: 0 }, 2)
  .to(stage, { x: -1.2 }, 2)
  // Sección 4 → 5: vuelta completa y regreso al frente
  .to(model.rotation, { y: Math.PI * 2 }, 3)
  .to(camPos, { x: 0, y: 2.2, z: 7 }, 3)
  .to(camTarget, { x: 0, y: 0.35, z: 0 }, 3)
  .to(stage, { x: 0 }, 3);

// Textos: aparecen al entrar en pantalla
gsap.utils.toArray('.panel:not(.hero)').forEach((panel) => {
  gsap.from(panel.querySelector('.copy'), {
    opacity: 0,
    y: 40,
    scrollTrigger: { trigger: panel, start: 'top 80%', end: 'top 30%', scrub: true },
  });
});

// ---------- 5. Aurora: colores por sección ----------
// Las paletas están en palettes.js; la primera es la que se ve al entrar
const aurora = createAurora(document.querySelector('#aurora'));
let theme = THEMES[0];
let currentSection = 0;
let chosenColor = document.querySelector('.swatch.active').dataset.color;
// la sección 03 (null) sigue al color de aluminio elegido
const auroraFor = (i) => theme.sections[i] ?? [chosenColor, theme.material, chosenColor];

gsap.utils.toArray('.panel').forEach((panel, i) => {
  ScrollTrigger.create({
    trigger: panel,
    start: 'top center',
    end: 'bottom center',
    onToggle: (self) => {
      if (!self.isActive) return;
      currentSection = i;
      aurora.setPalette(auroraFor(i));
    },
  });
});

// "Ambiente" (última sección): círculos con las paletas que puede elegir el visitante
const ambientButtons = THEMES.map(({ name, sections }, i) => {
  const btn = document.createElement('button');
  btn.className = 'ambient';
  btn.title = name;
  btn.setAttribute('aria-label', `Ambiente ${name}`);
  sections[0].forEach((c, k) => btn.style.setProperty(`--c${k + 1}`, c));
  btn.addEventListener('click', () => applyTheme(i));
  document.querySelector('.ambients').append(btn);
  return btn;
});

function applyTheme(i) {
  theme = THEMES[i];
  aurora.setPalette(auroraFor(currentSection));
  aurora.setIntensity(theme.intensity);
  particles.setAccent(theme.accent);
  ambientButtons.forEach((btn, k) => {
    btn.classList.toggle('active', k === i);
    btn.setAttribute('aria-pressed', String(k === i));
  });
}
applyTheme(0);

// ---------- 6. Selector de color ----------
document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.swatch.active')?.classList.remove('active');
    btn.classList.add('active');
    const c = new THREE.Color(btn.dataset.color);
    gsap.to(laptop.aluminium.color, { r: c.r, g: c.g, b: c.b, duration: 0.8, ease: 'power2.out' });
    chosenColor = btn.dataset.color;
    if (theme.sections[currentSection] === null) aurora.setPalette(auroraFor(currentSection));
  });
});

// ---------- 7. Ratón (parallax sutil) ----------
const pointer = { x: 0, y: 0 };
window.addEventListener('pointermove', (e) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ---------- 8. Arrastrar para girar (última sección) ----------
const playground = document.querySelector('#playground');
const drag = { enabled: false, active: false, lastX: 0, velocity: 0 };
const TURN = Math.PI * 2;

// Solo se puede arrastrar cuando la última sección está en pantalla
ScrollTrigger.create({
  trigger: playground,
  start: 'top 40%',
  onToggle: (self) => {
    drag.enabled = self.isActive;
    playground.classList.toggle('is-active', self.isActive);
  },
});

playground.addEventListener('pointerdown', (e) => {
  if (!drag.enabled || e.target.closest('a, button')) return;
  drag.active = true;
  drag.lastX = e.clientX;
  drag.velocity = 0;
  playground.setPointerCapture(e.pointerId);
  playground.classList.add('dragging');
});
playground.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  // arrastrar todo el ancho de la pantalla = una vuelta completa
  drag.velocity = ((e.clientX - drag.lastX) / window.innerWidth) * TURN;
  drag.lastX = e.clientX;
  spin.rotation.y += drag.velocity;
});
const endDrag = () => {
  if (!drag.active) return;
  drag.active = false;
  playground.classList.remove('dragging');
  playground.classList.add('touched'); // oculta la pista "Arrastra para girar"
};
playground.addEventListener('pointerup', endDrag);
playground.addEventListener('pointercancel', endDrag);

// ---------- 9. Resize ----------
function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  portrait = camera.aspect < 1;
}
window.addEventListener('resize', resize);
resize();

// ---------- 10. Loop de render ----------
const timer = new THREE.Timer();
timer.connect(document); // pausa el tiempo cuando la pestaña no está visible
let scrollBoost = 1; // multiplicador de velocidad de las partículas según la velocidad del scroll

renderer.setAnimationLoop((timestamp) => {
  timer.update(timestamp);
  const t = timer.getElapsed();
  const dt = timer.getDelta();

  // flotación + parallax con interpolación suave (lerp)
  parallax.position.y = 0.45 + Math.sin(t * 1.2) * 0.04;
  parallax.rotation.y += (pointer.x * 0.15 - parallax.rotation.y) * 0.05;
  parallax.rotation.x += (pointer.y * 0.08 - parallax.rotation.x) * 0.05;

  // al soltar sigue girando con inercia; al salir de la sección vuelve a la vuelta completa más cercana
  if (!drag.active && drag.enabled) {
    spin.rotation.y += drag.velocity;
    drag.velocity *= 0.95;
  } else if (!drag.enabled) {
    const home = Math.round(spin.rotation.y / TURN) * TURN;
    spin.rotation.y += (home - spin.rotation.y) * 0.08;
    drag.velocity = 0;
  }

  // partículas: aceleran con el scroll rápido y se desplazan algo más que el portátil con el ratón (profundidad)
  const targetBoost = 1 + Math.min(Math.abs(tl.scrollTrigger.getVelocity()) / 300, 8);
  scrollBoost += (targetBoost - scrollBoost) * 0.08;
  particles.update(dt, t, scrollBoost);
  particles.points.position.x += (pointer.x * 0.4 - particles.points.position.x) * 0.03;

  model.position.x = portrait ? 0 : stage.x;
  camera.position.copy(camPos).multiplyScalar(portrait ? 1.8 : 1);
  lookTarget.copy(camTarget);
  if (portrait) lookTarget.y -= 0.9; // sube el modelo; el texto va abajo
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld();
  laptop.orientLogo(camera);

  renderer.render(scene, camera);
});
