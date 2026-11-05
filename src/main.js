import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createAurora } from './aurora.js';
import { THEMES } from './palettes.js';
import { startScene } from './sceneClient.js';

gsap.registerPlugin(ScrollTrigger);

// ---------- 1. Estado de la escena ----------
// Three.js corre en un worker (scene.js). Este hilo solo anima estos números con el scroll
// y el ratón, y se los pasa en cada tick: así el contenido nunca espera a la GPU.
const view = {
  model: { x: 0.3, y: -0.7 }, // rotación del portátil
  stage: { x: 1.1 }, // desplazamiento lateral para dejar espacio al texto de cada sección
  lid: { open: 0 }, // 0 = cerrada, 1 = abierta
  screen: { glow: 0 },
  camPos: { x: 0, y: 2.2, z: 7 }, // la cámara se ubica en camPos y mira a camTarget
  camTarget: { x: 0, y: 0.7, z: 0 },
  pointer: { x: 0, y: 0 },
  drag: { enabled: false, active: false },
  scrollVelocity: 0,
};

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio });

const scene = startScene(document.querySelector('#webgl'), {
  ...viewport(),
  particleCount: window.matchMedia('(max-width: 700px)').matches ? 180 : 450, // menos partículas en móvil
  view,
});

// ---------- 2. Animación con scroll ----------
const tl = gsap.timeline({
  defaults: { ease: 'power2.inOut', duration: 1 },
  scrollTrigger: {
    trigger: '#scroll',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1, // suaviza: la animación "persigue" al scroll durante 1s
  },
});

// Sección 1 → 2: se endereza, se abre y se enciende la pantalla (y con ella el teclado)
tl.to(view.model, { x: 0, y: 0 }, 0)
  .to(view.stage, { x: -1.1 }, 0)
  .to(view.lid, { open: 1 }, 0)
  .to(view.screen, { glow: 1, duration: 0.5 }, 0.5)
  // Sección 2 → 3: la cámara se acerca al teclado desde un lado
  .to(view.camPos, { x: 2.6, y: 2.4, z: 3.6 }, 1)
  .to(view.camTarget, { x: 0, y: 0.55, z: 0.2 }, 1)
  .to(view.stage, { x: 0.4 }, 1)
  // Sección 3 → 4: vista de 3/4 para lucir el material
  .to(view.camPos, { x: -3.5, y: 2.8, z: 5 }, 2)
  .to(view.camTarget, { x: -0.6, y: 0.85, z: 0 }, 2)
  .to(view.stage, { x: -1.2 }, 2)
  // Sección 4 → 5: vuelta completa y regreso al frente
  .to(view.model, { y: Math.PI * 2 }, 3)
  .to(view.camPos, { x: 0, y: 2.2, z: 7 }, 3)
  .to(view.camTarget, { x: 0, y: 0.35, z: 0 }, 3)
  .to(view.stage, { x: 0 }, 3);

// Textos: aparecen al entrar en pantalla
gsap.utils.toArray('.panel:not(.hero)').forEach((panel) => {
  gsap.from(panel.querySelector('.copy'), {
    opacity: 0,
    y: 40,
    scrollTrigger: { trigger: panel, start: 'top 80%', end: 'top 30%', scrub: true },
  });
});

// ---------- 3. Aurora: colores por sección ----------
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
  scene.setAccent(theme.accent);
  ambientButtons.forEach((btn, k) => {
    btn.classList.toggle('active', k === i);
    btn.setAttribute('aria-pressed', String(k === i));
  });
}
applyTheme(0);

// ---------- 4. Selector de color ----------
document.querySelectorAll('.swatch').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelector('.swatch.active')?.classList.remove('active');
    btn.classList.add('active');
    scene.setColor(btn.dataset.color);
    chosenColor = btn.dataset.color;
    if (theme.sections[currentSection] === null) aurora.setPalette(auroraFor(currentSection));
  });
});

// ---------- 5. Ratón (parallax sutil) ----------
window.addEventListener('pointermove', (e) => {
  view.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  view.pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
});

// ---------- 6. Arrastrar para girar (última sección) ----------
const playground = document.querySelector('#playground');
const { drag } = view;
let lastX = 0;
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
  lastX = e.clientX;
  scene.spinBy(0); // frena la inercia de la vuelta anterior
  playground.setPointerCapture(e.pointerId);
  playground.classList.add('dragging');
});
playground.addEventListener('pointermove', (e) => {
  if (!drag.active) return;
  // arrastrar todo el ancho de la pantalla = una vuelta completa
  scene.spinBy(((e.clientX - lastX) / window.innerWidth) * TURN);
  lastX = e.clientX;
});
const endDrag = () => {
  if (!drag.active) return;
  drag.active = false;
  playground.classList.remove('dragging');
  playground.classList.add('touched'); // oculta la pista "Arrastra para girar"
};
playground.addEventListener('pointerup', endDrag);
playground.addEventListener('pointercancel', endDrag);

// ---------- 7. Resize ----------
window.addEventListener('resize', () => scene.resize(viewport()));

// ---------- 8. Sincronizar con la escena ----------
// Solo se envía lo que cambió: con la página quieta este hilo no hace nada.
// GSAP guarda en cada objeto animado una referencia `_gsap` que no se puede enviar a un worker.
const withoutGsap = (key, value) => (key === '_gsap' ? undefined : value);
let sentView = '';
gsap.ticker.add(() => {
  view.scrollVelocity = tl.scrollTrigger.getVelocity();
  const next = JSON.stringify(view, withoutGsap);
  if (next === sentView) return;
  sentView = next;
  scene.update(JSON.parse(next));
});
