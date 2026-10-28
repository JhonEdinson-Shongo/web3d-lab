# web3d-lab

Laboratorio para aprender a hacer webs 3D: un portátil animado con el scroll, hecho con **Three.js + GSAP + Vite**.

## Arrancar

```bash
npm install     # solo la primera vez
npm run dev     # abre la URL que aparece (normalmente http://localhost:5173)
```

Cada vez que guardas un archivo, el navegador se actualiza solo.

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Los textos. Cada `<section class="panel">` es una "pantalla" del scroll. |
| `src/style.css` | El diseño de los textos y el canvas fijo de fondo. |
| `src/laptop.js` | El portátil, construido con código: cajas redondeadas, teclas y la tapa con su bisagra. |
| `src/main.js` | Escena, cámara, luces, la animación con scroll (GSAP) y el selector de color. |

## Conceptos clave (en `src/main.js`)

1. **Renderer + escena + cámara**: la base de cualquier proyecto Three.js.
2. **`scene.environment`**: un entorno de luz que se refleja en los metales. Sin esto, el aluminio se ve negro.
3. **Jerarquía de grupos**: `parallax > model > laptop`. Cada nivel se anima por separado sin pisarse con los demás.
4. **Línea de tiempo con `scrub`**: el progreso del scroll (de 0 a 1) "reproduce" la animación. Cada `.to(..., N)` empieza en la sección N.
5. **Loop de render**: corre unas 60 veces por segundo. Aquí van la flotación, el parallax del ratón y la cámara.

## Ejercicios (de fácil a difícil)

1. Cambia el texto y los colores de la pantalla en `createScreenTexture()`.
2. Agrega un quinto color al selector.
3. Haz que la tapa se abra más (`OPEN_ANGLE`) o que el modelo dé dos vueltas al final.
4. Agrega una nueva sección en `index.html` y su paso en la línea de tiempo.
5. Pon un video como pantalla: busca `THREE.VideoTexture`.
6. Agrega **Lenis** (`npm i lenis`) para que el scroll sea suave.
7. **El gran salto:** reemplaza el portátil por un modelo tuyo hecho en Blender (ver abajo).

## Usar un modelo .glb (de Blender o Sketchfab)

1. En Blender: `File → Export → glTF 2.0`, formato **glb**.
2. Guárdalo en `public/models/mi-modelo.glb`.
3. En `src/main.js`:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

new GLTFLoader().load('/models/mi-modelo.glb', (gltf) => {
  model.remove(laptop.group);
  model.add(gltf.scene);
  // Para animar una parte (por ejemplo la tapa), búscala por el nombre que le diste en Blender:
  // const lid = gltf.scene.getObjectByName('Tapa');
});
```

Tip: en Blender, pon el *origen* de la tapa en la bisagra. Así, rotarla en Three.js la abre correctamente.

Para revisar y comprimir modelos usa https://gltf.report. Si el modelo es de Sketchfab, **revisa su licencia** antes de usarlo en un proyecto real.

## Publicar

```bash
npm run build   # genera la carpeta dist/
```

Sube `dist/` a Netlify, Vercel, GitHub Pages o tu hosting.
