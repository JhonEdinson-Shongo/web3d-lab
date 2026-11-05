import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createLaptop, OPEN_ANGLE } from './laptop.js';
import { createParticles } from './background.js';

// La escena 3D completa. No toca el DOM: así puede correr en un worker (scene.worker.js).
// `view` es lo que animan el scroll y el ratón desde main.js; aquí solo se lee en cada frame.
const COLOR_FADE = 0.8; // segundos que tarda el aluminio en cambiar de color

export function createScene(canvas, { width, height, dpr, particleCount, view: initialView }) {
  let view = initialView;

  // ---------- 1. Renderer, escena y cámara ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();

  // Entorno para los reflejos de los materiales metálicos (PBR)
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
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

  // Polvo de luz alrededor del portátil
  const particles = createParticles(particleCount);
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

  // ---------- 4. Resize ----------
  function resize({ width, height, dpr }) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(dpr, 2));
    renderer.setSize(width, height, false);
    portrait = camera.aspect < 1;
  }
  resize({ width, height, dpr });

  // ---------- 5. Loop de render ----------
  const TURN = Math.PI * 2;
  const timer = new THREE.Timer();
  const colorFade = { from: new THREE.Color(), to: new THREE.Color(), start: null };
  let scrollBoost = 1; // multiplicador de velocidad de las partículas según la velocidad del scroll
  let dragVelocity = 0;

  renderer.setAnimationLoop((timestamp) => {
    timer.update(timestamp);
    const t = timer.getElapsed();
    const dt = Math.min(timer.getDelta(), 0.05); // al volver a la pestaña el salto de tiempo es enorme

    // flotación + parallax con interpolación suave (lerp)
    parallax.position.y = 0.45 + Math.sin(t * 1.2) * 0.04;
    parallax.rotation.y += (view.pointer.x * 0.15 - parallax.rotation.y) * 0.05;
    parallax.rotation.x += (view.pointer.y * 0.08 - parallax.rotation.x) * 0.05;

    // al soltar sigue girando con inercia; al salir de la sección vuelve a la vuelta completa más cercana
    if (!view.drag.active && view.drag.enabled) {
      spin.rotation.y += dragVelocity;
      dragVelocity *= 0.95;
    } else if (!view.drag.enabled) {
      const home = Math.round(spin.rotation.y / TURN) * TURN;
      spin.rotation.y += (home - spin.rotation.y) * 0.08;
      dragVelocity = 0;
    }

    // partículas: aceleran con el scroll rápido y se desplazan algo más que el portátil con el ratón (profundidad)
    const targetBoost = 1 + Math.min(Math.abs(view.scrollVelocity) / 300, 8);
    scrollBoost += (targetBoost - scrollBoost) * 0.08;
    particles.update(dt, t, scrollBoost);
    particles.points.position.x += (view.pointer.x * 0.4 - particles.points.position.x) * 0.03;

    // lo que anima el scroll
    model.rotation.set(view.model.x, view.model.y, 0);
    laptop.lidPivot.rotation.x = view.lid.open * OPEN_ANGLE;
    laptop.screenMat.color.setScalar(view.screen.glow);
    laptop.setBacklight(view.screen.glow); // el teclado se ilumina junto con la pantalla

    // cambio de color del aluminio (misma curva que power2.out de GSAP)
    if (colorFade.start !== null) {
      const p = Math.min((t - colorFade.start) / COLOR_FADE, 1);
      laptop.aluminium.color.lerpColors(colorFade.from, colorFade.to, 1 - (1 - p) ** 3);
      if (p === 1) colorFade.start = null;
    }

    model.position.x = portrait ? 0 : view.stage.x;
    camera.position.copy(view.camPos).multiplyScalar(portrait ? 1.8 : 1);
    lookTarget.copy(view.camTarget);
    if (portrait) lookTarget.y -= 0.9; // sube el modelo; el texto va abajo
    camera.lookAt(lookTarget);
    camera.updateMatrixWorld();
    laptop.orientLogo(camera);

    renderer.render(scene, camera);
  });

  return {
    resize,
    update(next) {
      view = next;
    },
    setColor(color) {
      colorFade.from.copy(laptop.aluminium.color);
      colorFade.to.set(color);
      colorFade.start = timer.getElapsed();
    },
    setAccent: particles.setAccent,
    // gira el portátil mientras se arrastra; lo último que se giró es la inercia al soltar
    spinBy(delta) {
      spin.rotation.y += delta;
      dragVelocity = delta;
    },
  };
}
