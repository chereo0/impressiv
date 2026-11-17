import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export interface CorridorOptions {
  canvas: HTMLCanvasElement;
  images: string[];
  total: number;
  small: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

export interface CorridorHandle {
  /** Scroll progress through the intro, 0..1. */
  setProgress: (p: number) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** LED-panel look: per-diode sampling, round diodes, a slow refresh band, power-on wipe. */
const LED_FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform vec4 fit;
  uniform vec2 cells;
  uniform float brightness;
  uniform float power;
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 cell = floor(vUv * cells);
    vec2 cuv = (cell + 0.5) / cells;
    vec2 f = fract(vUv * cells) - 0.5;
    float diode = smoothstep(0.52, 0.18, length(f));
    vec3 col = texture2D(map, cuv * fit.xy + fit.zw).rgb * brightness;
    col *= 0.93 + 0.07 * smoothstep(0.0, 0.08, abs(fract(vUv.y + time * 0.1) - 0.5));
    col *= mix(0.25, 1.15, diode);
    // power-on: a bright line opens from the middle
    float open = step(abs(vUv.y - 0.5), power * 0.5);
    col = (col + vec3(1.0 - power) * 0.6) * open;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fitCover(target: THREE.Vector4, texAspect: number, planeAspect: number) {
  if (texAspect > planeAspect) {
    const s = planeAspect / texAspect;
    target.set(s, 1, (1 - s) / 2, 0);
  } else {
    const s = texAspect / planeAspect;
    target.set(1, s, 0, (1 - s) / 2);
  }
}

function cssFont(variable: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

export function createCorridor(opts: CorridorOptions): CorridorHandle {
  const { canvas, images, total, small, reducedMotion, onReady } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040406");
  scene.fog = new THREE.FogExp2("#040406", 0.035);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.15;

  const camera = new THREE.PerspectiveCamera(small ? 70 : 55, 1, 0.1, 120);

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.75, 0.5, 0.45);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  const disposables: { dispose: () => void }[] = [env, pmrem];
  const own = <T extends { dispose: () => void }>(x: T) => {
    disposables.push(x);
    return x;
  };

  /* ---------- corridor shell ---------- */
  const perSide = Math.ceil(images.length / 2);
  const spacing = 5.2;
  const length = perSide * spacing + 16;
  const halfW = 6;
  const height = 7;

  const wallMat = own(new THREE.MeshStandardMaterial({ color: "#0b0b0e", roughness: 0.9 }));
  const floorMat = own(new THREE.MeshStandardMaterial({ color: "#09090c", roughness: 0.22, metalness: 0.6 }));
  const glow = own(new THREE.MeshBasicMaterial({ color: "#ffb500" }));
  const frameMat = own(new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.5, metalness: 0.3 }));

  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(own(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const midZ = -length / 2 + 8;
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(halfW * 2, length + 20)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = midZ;
  scene.add(floor);
  box(0.4, height, length + 20, wallMat, -halfW - 0.2, height / 2, midZ);
  box(0.4, height, length + 20, wallMat, halfW + 0.2, height / 2, midZ);
  box(halfW * 2 + 0.8, 0.4, length + 20, wallMat, 0, height + 0.2, midZ);

  // light lines: along the floor edges and the ceiling, plus rings every few metres
  for (const side of [-1, 1]) {
    box(0.06, 0.03, length + 20, glow, side * (halfW - 0.05), 0.02, midZ);
    box(0.05, 0.05, length + 20, glow, side * (halfW - 1.2), height - 0.05, midZ);
  }
  const ringMat = own(new THREE.MeshBasicMaterial({ color: "#fff3d6" }));
  for (let z = 6; z > -length + 8; z -= spacing * 2) {
    box(halfW * 2, 0.04, 0.04, ringMat, 0, height - 0.04, z);
  }

  /* ---------- LED screens ---------- */
  const loader = new THREE.TextureLoader();
  const time = { value: 0 };
  const screens: { uniforms: Record<string, THREE.IUniform>; z: number }[] = [];
  const sw = 4.3;
  const sh = 2.42;
  let loaded = 0;
  images.forEach((src, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    const z = -k * spacing - (side > 0 ? spacing / 2 : 0);
    const uniforms: Record<string, THREE.IUniform> = {
      map: { value: null },
      fit: { value: new THREE.Vector4(1, 1, 0, 0) },
      cells: { value: new THREE.Vector2(150, 84) },
      brightness: { value: 0.95 },
      power: { value: 0 },
      time,
    };
    const mesh = new THREE.Mesh(
      own(new THREE.PlaneGeometry(sw, sh)),
      own(new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: LED_FRAG })),
    );
    // angled towards the visitor walking down the corridor
    const angle = side * -(Math.PI / 2 - 0.42);
    mesh.position.set(side * (halfW - 1.0), 3, z);
    mesh.rotation.y = angle;
    scene.add(mesh);
    const frame = new THREE.Mesh(own(new THREE.BoxGeometry(sw + 0.2, sh + 0.2, 0.12)), frameMat);
    frame.position.copy(mesh.position);
    frame.rotation.y = angle;
    frame.translateZ(-0.08);
    scene.add(frame);
    const tex = loader.load(src, (t) => {
      const img = t.image as HTMLImageElement;
      fitCover(uniforms.fit.value as THREE.Vector4, img.width / img.height, sw / sh);
      uniforms.map.value = t;
      loaded++;
      if (loaded === Math.min(4, images.length)) onReady();
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    own(tex);
    screens.push({ uniforms, z });
  });
  if (!images.length) queueMicrotask(onReady);

  /* ---------- end wall: the archive sign ---------- */
  const endZ = -perSide * spacing - 6;
  const sign = document.createElement("canvas");
  sign.width = 1600;
  sign.height = 800;
  const ctx = sign.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 1600, 800);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffb500";
  ctx.font = `700 330px ${cssFont("--font-montserrat", "sans-serif")}`;
  ctx.fillText(String(total), 800, 330);
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 92px ${cssFont("--font-lato", "sans-serif")}`;
  ctx.fillText("P R O J E C T S", 800, 610);
  const signTex = own(new THREE.CanvasTexture(sign));
  signTex.colorSpace = THREE.SRGBColorSpace;
  const signUniforms: Record<string, THREE.IUniform> = {
    map: { value: signTex },
    fit: { value: new THREE.Vector4(1, 1, 0, 0) },
    cells: { value: new THREE.Vector2(200, 100) },
    brightness: { value: 1.1 },
    power: { value: 1 },
    time,
  };
  const endWall = new THREE.Mesh(
    own(new THREE.PlaneGeometry(9, 4.5)),
    own(new THREE.ShaderMaterial({ uniforms: signUniforms, vertexShader: VERT, fragmentShader: LED_FRAG })),
  );
  endWall.position.set(0, 3.3, endZ);
  scene.add(endWall);

  /* ---------- haze ---------- */
  const dustCount = small ? 300 : 900;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * halfW * 2;
    dustPos[i * 3 + 1] = Math.random() * height;
    dustPos[i * 3 + 2] = 8 - Math.random() * length;
  }
  const dustGeo = own(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  scene.add(
    new THREE.Points(
      dustGeo,
      own(
        new THREE.PointsMaterial({
          color: "#ffe9b8",
          size: 0.03,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    ),
  );
  const lamp = new THREE.PointLight("#ffd27a", 30, 16, 1.8);
  scene.add(lamp, new THREE.HemisphereLight("#2a3048", "#050505", 0.35));

  /* ---------- loop ---------- */
  let progress = 0;
  let smooth = 0;
  let active = true;
  let frame = 0;
  const pointer = new THREE.Vector2();
  const clock = new THREE.Clock();
  const startZ = 9;
  const stopZ = endZ + 6.5;

  function resize() {
    const parent = canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    bloom?.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    if (!active) return;
    const t = clock.getElapsedTime();
    time.value = t;
    smooth += (progress - smooth) * (reducedMotion ? 1 : 0.08);
    const e = easeInOut(smooth);
    const z = startZ + (stopZ - startZ) * e;
    const sway = reducedMotion ? 0 : 1;
    camera.position.set(pointer.x * 0.5 * sway + Math.sin(t * 0.6) * 0.08 * sway, 2.7 + pointer.y * 0.25 * sway, z);
    camera.lookAt(pointer.x * 0.8 * sway, 2.9, z - 12);
    camera.rotation.z += Math.sin(t * 0.4) * 0.006 * sway;
    lamp.position.set(0, 5, z - 3);

    // screens power on as the camera approaches them
    for (const s of screens) {
      const ahead = z - s.z;
      const target = ahead < 26 ? 1 : 0;
      s.uniforms.power.value += (target - s.uniforms.power.value) * 0.06;
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  const onPointer = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  };
  window.addEventListener("pointermove", onPointer, { passive: true });
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement!);
  resize();
  tick();

  return {
    setProgress(p) {
      progress = p;
    },
    setActive(a) {
      active = a;
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      disposables.forEach((d) => d.dispose());
      composer?.dispose();
      renderer.dispose();
    },
  };
}
