import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FINALE, PROJECTS, SCREEN_SLOTS, SCREEN_Y, STATIONS, STILLS, WALL_X, WORK_START } from "./content";

export interface VenueOptions {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  small: boolean;
  reducedMotion: boolean;
  onProgress: (pct: number) => void;
  onReady: () => void;
  onHoverProject: (index: number | null) => void;
  onSelectProject: (index: number) => void;
}

export interface VenueHandle {
  /** Fractional station index into STATIONS. */
  setStation: (s: number) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}

const YELLOW = new THREE.Color("#ffb500");
const WHITE = new THREE.Color("#fff4e0");
const BLUE = new THREE.Color("#3d6bff");
const MAGENTA = new THREE.Color("#ff3b8d");
const CYAN = new THREE.Color("#3ff2ff");
const FINALE_RIM = new THREE.Color("#ff8a3d");

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, t: number) => {
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
};

function cssFont(variable: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim() || fallback;
}

/* ---------------------------------------------------------------- shaders */

const LED_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** An LED panel: the picture is sampled per LED and drawn as round diodes. */
const LED_FRAG = /* glsl */ `
  uniform sampler2D mapA;
  uniform sampler2D mapB;
  uniform vec4 fitA;
  uniform vec4 fitB;
  uniform float mixB;
  uniform vec2 cells;
  uniform float brightness;
  uniform float hover;
  uniform float time;
  varying vec2 vUv;
  void main() {
    vec2 cell = floor(vUv * cells);
    vec2 cuv = (cell + 0.5) / cells;
    vec2 f = fract(vUv * cells) - 0.5;
    float diode = smoothstep(0.52, 0.18, length(f));
    vec3 a = texture2D(mapA, cuv * fitA.xy + fitA.zw).rgb;
    vec3 b = texture2D(mapB, cuv * fitB.xy + fitB.zw).rgb;
    vec3 col = mix(a, b, mixB) * brightness * (1.0 + hover * 0.3);
    // a slow refresh band rolling down the panel
    col *= 0.94 + 0.06 * smoothstep(0.0, 0.08, abs(fract(vUv.y + time * 0.12) - 0.5));
    col *= mix(0.26, 1.15, diode);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const BEAM_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalV = normalize(normalMatrix * normal);
    vViewV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const BEAM_FRAG = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewV;
  void main() {
    float along = pow(vUv.y, 1.5);
    float edge = pow(abs(dot(vNormalV, vViewV)), 1.3);
    // drifting haze inside the beam
    float haze = 0.75 + 0.25 * sin(vUv.y * 18.0 - time * 1.7 + vUv.x * 30.0);
    float a = along * edge * intensity * haze;
    gl_FragColor = vec4(color * a, a);
  }
`;

/** Film grain + vignette, applied after tone mapping. */
const GRAIN_SHADER = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    time: { value: 0 },
    amount: { value: 0.045 },
    vignette: { value: 0.42 },
  },
  vertexShader: LED_VERT,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float amount;
    uniform float vignette;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float n = hash(vUv * 1000.0 + fract(time) * 100.0) - 0.5;
      c.rgb += n * amount;
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, d);
      gl_FragColor = c;
    }
  `,
};

/* ------------------------------------------------------------- textures */

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 1024, h = 512) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function radialTexture() {
  return canvasTexture(
    (ctx, w, h) => {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.35, "rgba(255,255,255,0.45)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    },
    128,
    128,
  );
}

function fitCover(target: THREE.Vector4, texAspect: number, planeAspect: number) {
  if (texAspect > planeAspect) {
    const s = planeAspect / texAspect;
    target.set(s, 1, (1 - s) / 2, 0);
  } else {
    const s = texAspect / planeAspect;
    target.set(1, s, 0, (1 - s) / 2);
  }
}

/* ------------------------------------------------------------- geometry */

function trussGeometry(length: number, size = 0.42, r = 0.03) {
  const parts: THREE.BufferGeometry[] = [];
  const h = size / 2;
  const corners = [
    [h, h],
    [h, -h],
    [-h, -h],
    [-h, h],
  ];
  for (const [y, z] of corners) {
    const g = new THREE.CylinderGeometry(r, r, length, 6, 1);
    g.rotateZ(Math.PI / 2);
    g.translate(0, y, z);
    parts.push(g);
  }
  const n = Math.floor(length / size);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const x0 = -length / 2 + i * size;
    for (let k = 0; k < 4; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 4];
      const p0 = new THREE.Vector3(x0, a[0], a[1]);
      const p1 = new THREE.Vector3(x0 + size, b[0], b[1]);
      const dir = p1.clone().sub(p0);
      const len = dir.length();
      const mid = p0.clone().add(p1).multiplyScalar(0.5);
      const g = new THREE.CylinderGeometry(r * 0.6, r * 0.6, len, 5, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
      g.translate(mid.x, mid.y, mid.z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

function personGeometry(armsUp: boolean) {
  const body = new THREE.CapsuleGeometry(0.21, 0.78, 3, 8);
  body.translate(0, 0.62, 0);
  const head = new THREE.SphereGeometry(0.13, 10, 8);
  head.translate(0, 1.38, 0);
  const parts = [body, head];
  if (armsUp) {
    for (const side of [-1, 1]) {
      const arm = new THREE.CapsuleGeometry(0.055, 0.62, 2, 6);
      arm.rotateZ(side * -0.38);
      arm.translate(side * 0.3, 1.55, 0);
      parts.push(arm);
    }
  }
  return mergeGeometries(parts)!;
}

/* ------------------------------------------------------------- the venue */

interface MovingHead {
  pivot: THREE.Group;
  uniforms: { color: { value: THREE.Color }; intensity: { value: number }; time: { value: number } };
  pool: THREE.Mesh;
  phase: number;
  speed: number;
  pos: THREE.Vector3;
}

interface LedPanel {
  mesh: THREE.Mesh;
  uniforms: {
    mapA: { value: THREE.Texture | null };
    mapB: { value: THREE.Texture | null };
    fitA: { value: THREE.Vector4 };
    fitB: { value: THREE.Vector4 };
    mixB: { value: number };
    cells: { value: THREE.Vector2 };
    brightness: { value: number };
    hover: { value: number };
    time: { value: number };
  };
  aspect: number;
}

export function createVenue(opts: VenueOptions): VenueHandle {
  const { canvas, video, small, reducedMotion, onProgress, onReady, onHoverProject, onSelectProject } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040406");
  scene.fog = new THREE.FogExp2("#05060a", small ? 0.028 : 0.024);

  // soft reflections on metal and the glossy floor
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.18;

  const baseFov = small ? 62 : 50;
  const camera = new THREE.PerspectiveCamera(baseFov, 1, 0.1, 140);

  const sharedTime = { value: 0 };

  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  let grain: ShaderPass | null = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.8, 0.55, 0.42);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    grain = new ShaderPass(GRAIN_SHADER);
    composer.addPass(grain);
  }

  /* ---------- loading ---------- */
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(Math.round((loaded / total) * 100));
  manager.onLoad = () => onReady();
  const loader = new THREE.TextureLoader(manager);
  const textures = new Map<string, { tex: THREE.Texture; aspect: number }>();
  const pending = new Map<string, ((t: THREE.Texture, a: number) => void)[]>();
  const getTexture = (src: string, cb: (t: THREE.Texture, a: number) => void) => {
    const hit = textures.get(src);
    if (hit) return cb(hit.tex, hit.aspect);
    const waiters = pending.get(src);
    if (waiters) return void waiters.push(cb);
    pending.set(src, [cb]);
    const tex = loader.load(src, (t) => {
      const image = t.image as HTMLImageElement;
      const entry = { tex: t, aspect: image.width / image.height };
      textures.set(src, entry);
      pending.get(src)!.forEach((w) => w(t, entry.aspect));
      pending.delete(src);
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
  };

  const videoTex = new THREE.VideoTexture(video);
  videoTex.colorSpace = THREE.SRGBColorSpace;
  let videoAspect = 16 / 9;

  const owned: { dispose: () => void }[] = [envTex, pmrem];
  const own = <T extends { dispose: () => void }>(x: T) => {
    owned.push(x);
    return x;
  };

  /* ---------- materials ---------- */
  const wallMat = own(new THREE.MeshStandardMaterial({ color: "#0c0c10", roughness: 0.92 }));
  const stageMat = own(new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.25, metalness: 0.6 }));
  const metalMat = own(new THREE.MeshStandardMaterial({ color: "#9a9da2", roughness: 0.3, metalness: 0.9 }));
  const blackMat = own(new THREE.MeshStandardMaterial({ color: "#070708", roughness: 0.55, metalness: 0.3 }));
  const yellowGlow = own(new THREE.MeshBasicMaterial({ color: YELLOW }));
  const glowTex = own(radialTexture());

  // crowd: dark bodies with a rim of stage light around the silhouettes
  const rimColor = { value: new THREE.Color("#6f8dff") };
  const rimStrength = { value: 1.2 };
  const crowdMat = own(new THREE.MeshStandardMaterial({ color: "#0d0d11", roughness: 0.8 }));
  crowdMat.onBeforeCompile = (shader) => {
    shader.uniforms.rimColor = rimColor;
    shader.uniforms.rimStrength = rimStrength;
    shader.fragmentShader =
      "uniform vec3 rimColor;\nuniform float rimStrength;\n" +
      shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 2.6);
         totalEmissiveRadiance += rimColor * rim * rimStrength;`,
      );
  };

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight("#2a3048", "#050505", 0.45));
  const stageWash = new THREE.PointLight("#5b7cff", 80, 32, 1.6);
  stageWash.position.set(0, 7, -14);
  const warm = new THREE.PointLight("#ffb347", 55, 28, 1.6);
  warm.position.set(0, 3, -12);
  const entranceLight = new THREE.PointLight("#ffd27a", 40, 18, 1.6);
  entranceLight.position.set(0, 7, 18);
  const galleryLight = new THREE.PointLight("#fff1d6", 0, 26, 1.6);
  galleryLight.position.set(0, 9, 0);
  scene.add(stageWash, warm, entranceLight, galleryLight);

  /* ---------- hall ---------- */
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(own(geo), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // glossy polished floor (picks up the environment and the light pools)
  const floor = add(
    new THREE.PlaneGeometry(60, 90),
    own(new THREE.MeshStandardMaterial({ color: "#0a0a0d", roughness: 0.28, metalness: 0.55 })),
    0,
    0,
    0,
  );
  floor.rotation.x = -Math.PI / 2;

  add(new THREE.BoxGeometry(0.5, 16, 40), wallMat, -18.25, 8, -5);
  add(new THREE.BoxGeometry(0.5, 16, 40), wallMat, 18.25, 8, -5);
  add(new THREE.BoxGeometry(37, 16, 0.5), wallMat, 0, 8, -25.25);
  // front wall with a big doorway (the camera flies through it)
  add(new THREE.BoxGeometry(11, 16, 0.5), wallMat, -12.5, 8, 14.25);
  add(new THREE.BoxGeometry(11, 16, 0.5), wallMat, 12.5, 8, 14.25);
  add(new THREE.BoxGeometry(14, 3.4, 0.5), wallMat, 0, 14.3, 14.25);

  // entrance arch
  add(new THREE.BoxGeometry(0.6, 12.6, 0.9), metalMat, -7.2, 6.3, 14.4);
  add(new THREE.BoxGeometry(0.6, 12.6, 0.9), metalMat, 7.2, 6.3, 14.4);
  add(new THREE.BoxGeometry(15, 0.6, 0.9), metalMat, 0, 12.6, 14.4);
  const sign = own(
    canvasTexture(
      (ctx, w, h) => {
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, w, h);
        ctx.textBaseline = "middle";
        ctx.font = `700 210px ${cssFont("--font-montserrat", "sans-serif")}`;
        const a = ctx.measureText("IMPRESS").width;
        const b = ctx.measureText("IV").width;
        const x = (w - a - b) / 2;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("IMPRESS", x, h / 2 - 30);
        ctx.fillStyle = "#ffb500";
        ctx.fillText("IV", x + a, h / 2 - 30);
        ctx.textAlign = "center";
        ctx.font = `400 64px ${cssFont("--font-lato", "sans-serif")}`;
        ctx.fillText("W E   D O   I T   L I V E", w / 2, h / 2 + 150);
      },
      1600,
      640,
    ),
  );
  add(new THREE.PlaneGeometry(7, 2.8), own(new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })), 0, 14.4, 14.55);
  const carpet = add(new THREE.PlaneGeometry(4, 22), own(new THREE.MeshStandardMaterial({ color: "#16161a", roughness: 0.9 })), 0, 0.01, 25);
  carpet.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const strip = add(new THREE.PlaneGeometry(0.06, 22), yellowGlow, side * 2.05, 0.02, 25);
    strip.rotation.x = -Math.PI / 2;
  }

  /* ---------- LED panels ---------- */
  const ledPanels: LedPanel[] = [];
  const makeLed = (w: number, h: number, cellsX: number, map: THREE.Texture | null) => {
    const uniforms: LedPanel["uniforms"] = {
      mapA: { value: map },
      mapB: { value: map },
      fitA: { value: new THREE.Vector4(1, 1, 0, 0) },
      fitB: { value: new THREE.Vector4(1, 1, 0, 0) },
      mixB: { value: 0 },
      cells: { value: new THREE.Vector2(cellsX, Math.round((cellsX * h) / w)) },
      brightness: { value: 1.25 },
      hover: { value: 0 },
      time: sharedTime,
    };
    const mat = own(new THREE.ShaderMaterial({ uniforms, vertexShader: LED_VERT, fragmentShader: LED_FRAG }));
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), mat);
    const panel: LedPanel = { mesh, uniforms, aspect: w / h };
    ledPanels.push(panel);
    return panel;
  };

  /* ---------- stage ---------- */
  add(new THREE.BoxGeometry(22, 1.2, 9.5), stageMat, 0, 0.6, -20);
  add(new THREE.BoxGeometry(22, 0.05, 0.05), yellowGlow, 0, 1.2, -15.25);

  const finale = own(
    canvasTexture((ctx, w, h) => {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      ctx.font = `700 150px ${cssFont("--font-montserrat", "sans-serif")}`;
      const a = ctx.measureText("IMPRESS").width;
      const b = ctx.measureText("IV").width;
      const x = (w - a - b) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillText("IMPRESS", x, h / 2 - 40);
      ctx.fillStyle = "#ffb500";
      ctx.fillText("IV", x + a, h / 2 - 40);
      ctx.textAlign = "center";
      ctx.font = `400 46px ${cssFont("--font-lato", "sans-serif")}`;
      ctx.fillText("W E   D O   I T   L I V E", w / 2, h / 2 + 90);
    }),
  );
  const mainLed = makeLed(16, 8, 240, videoTex);
  mainLed.mesh.position.set(0, 6.2, -23.6);
  mainLed.uniforms.mapB.value = finale;
  fitCover(mainLed.uniforms.fitB.value, 2, 2);
  scene.add(mainLed.mesh);
  add(new THREE.BoxGeometry(16.6, 8.6, 0.4), blackMat, 0, 6.2, -23.85);

  // a faint, fading reflection of the LED wall on the floor in front of the stage
  const floorReflection = add(
    new THREE.PlaneGeometry(16, 9),
    own(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: videoTex }, fit: mainLed.uniforms.fitA, strength: { value: 0.22 } },
        vertexShader: LED_VERT,
        fragmentShader: /* glsl */ `
          uniform sampler2D map;
          uniform vec4 fit;
          uniform float strength;
          varying vec2 vUv;
          void main() {
            vec2 uv = vec2(vUv.x, 1.0 - vUv.y) * fit.xy + fit.zw;
            vec3 c = texture2D(map, uv).rgb;
            float fade = pow(vUv.y, 2.2) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
            gl_FragColor = vec4(c * fade * strength, 1.0);
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
    0,
    0.02,
    -10.6,
  );
  floorReflection.rotation.x = -Math.PI / 2;

  const towers: LedPanel[] = [];
  for (const side of [-1, 1]) {
    const tower = makeLed(3.2, 7, 48, null);
    tower.uniforms.brightness.value = 0.95;
    tower.mesh.position.set(side * 10.6, 4.7, -21.2);
    tower.mesh.rotation.y = -side * 0.38;
    scene.add(tower.mesh);
    const frame = add(new THREE.BoxGeometry(3.5, 7.3, 0.3), blackMat, side * 10.66, 4.7, -21.35);
    frame.rotation.y = -side * 0.38;
    towers.push(tower);
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const box = add(new THREE.BoxGeometry(1.3, 0.42, 0.8), blackMat, side * 13.4, 10 - i * 0.44, -15.5);
      box.rotation.x = 0.06 * i;
    }
  }

  const spanGeo = own(trussGeometry(26));
  const towerGeo = own(trussGeometry(12));
  for (const z of [-15.6, -22.2]) {
    const span = new THREE.Mesh(spanGeo, metalMat);
    span.position.set(0, 12, z);
    scene.add(span);
  }
  for (const side of [-1, 1]) {
    for (const z of [-15.6, -22.2]) {
      const t = new THREE.Mesh(towerGeo, metalMat);
      t.rotation.z = Math.PI / 2;
      t.position.set(side * 13, 6, z);
      scene.add(t);
    }
  }

  /* ---------- moving heads + light pools ---------- */
  const beamMaterial = (uniforms: MovingHead["uniforms"]) =>
    own(
      new THREE.ShaderMaterial({
        uniforms,
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
  const heads: MovingHead[] = [];
  const beamGeo = own(new THREE.ConeGeometry(1.5, 22, 32, 1, true));
  beamGeo.translate(0, -11, 0);
  const headGeo = own(new THREE.BoxGeometry(0.42, 0.5, 0.42));
  const lensGeo = own(new THREE.CircleGeometry(0.16, 16));
  const poolGeo = own(new THREE.PlaneGeometry(3.6, 3.6));
  const headCount = small ? 6 : 12;
  for (let i = 0; i < headCount; i++) {
    const x = -11 + (22 / (headCount - 1)) * i;
    const pos = new THREE.Vector3(x, 11.5, i % 2 ? -15.6 : -22.2);
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    pivot.add(new THREE.Mesh(headGeo, blackMat));
    const lens = new THREE.Mesh(lensGeo, yellowGlow);
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.26;
    pivot.add(lens);
    const uniforms = { color: { value: YELLOW.clone() }, intensity: { value: small ? 0.5 : 0.36 }, time: sharedTime };
    pivot.add(new THREE.Mesh(beamGeo, beamMaterial(uniforms)));
    scene.add(pivot);
    const pool = new THREE.Mesh(
      poolGeo,
      own(
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: YELLOW,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.03;
    scene.add(pool);
    heads.push({ pivot, uniforms, pool, phase: i * 0.9, speed: 0.32 + (i % 3) * 0.09, pos });
  }

  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 7.2, 0.2, 15.2);
    pivot.rotation.z = Math.PI + side * 0.08;
    const beam = new THREE.Mesh(beamGeo, beamMaterial({ color: { value: YELLOW.clone() }, intensity: { value: 0.32 }, time: sharedTime }));
    beam.scale.set(0.5, 0.6, 0.5);
    pivot.add(beam);
    scene.add(pivot);
  }

  /* ---------- lasers ---------- */
  const laserGroup = new THREE.Group();
  laserGroup.position.set(0, 1.6, -19.8);
  scene.add(laserGroup);
  const laserGeo = own(new THREE.BoxGeometry(0.025, 0.025, 46));
  laserGeo.translate(0, 0, 23);
  const laserMat = own(
    new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const lasers: THREE.Mesh[] = [];
  const laserCount = small ? 8 : 14;
  for (let i = 0; i < laserCount; i++) {
    const l = new THREE.Mesh(laserGeo, laserMat);
    laserGroup.add(l);
    lasers.push(l);
  }

  /* ---------- crowd ---------- */
  type Person = { x: number; z: number; s: number; phase: number; ry: number };
  const standing: Person[] = [];
  const cheering: Person[] = [];
  const crowdTarget = small ? 220 : 520;
  let guard = 0;
  while (standing.length + cheering.length < crowdTarget && guard++ < 6000) {
    const x = (Math.random() - 0.5) * 27;
    const z = -14 + Math.random() * 17;
    if (x > 0.8 && x < 3.4 && z > -6) continue; // aisle for the camera
    const p = { x, z, s: 0.88 + Math.random() * 0.22, phase: Math.random() * Math.PI * 2, ry: (Math.random() - 0.5) * 0.5 };
    (Math.random() < 0.28 ? cheering : standing).push(p);
  }
  const crowdA = new THREE.InstancedMesh(own(personGeometry(false)), crowdMat, standing.length);
  const crowdB = new THREE.InstancedMesh(own(personGeometry(true)), crowdMat, cheering.length);
  scene.add(crowdA, crowdB);
  const dummy = new THREE.Object3D();

  const everyone = [...standing, ...cheering];
  const phoneCount = Math.floor(everyone.length * 0.12);
  const phonePositions = new Float32Array(phoneCount * 3);
  const phoneOwners = Array.from({ length: phoneCount }, () => Math.floor(Math.random() * everyone.length));
  const phoneGeo = own(new THREE.BufferGeometry());
  phoneGeo.setAttribute("position", new THREE.BufferAttribute(phonePositions, 3));
  scene.add(new THREE.Points(phoneGeo, own(new THREE.PointsMaterial({ color: "#dfe8ff", size: 0.09 }))));

  /* ---------- LED cube over the crowd ---------- */
  const cube = new THREE.Group();
  cube.position.set(0, 8.6, -4);
  const cubeFaces: LedPanel[] = [];
  const cubeSize = 3.2;
  for (let i = 0; i < 4; i++) {
    const face = makeLed(cubeSize, cubeSize, 64, null);
    face.uniforms.brightness.value = 0.85;
    const a = (i * Math.PI) / 2;
    face.mesh.position.set(Math.sin(a) * (cubeSize / 2), 0, Math.cos(a) * (cubeSize / 2));
    face.mesh.rotation.y = a;
    cube.add(face.mesh);
    cubeFaces.push(face);
  }
  const capGeo = own(new THREE.BoxGeometry(cubeSize + 0.04, 0.08, cubeSize + 0.04));
  for (const y of [-cubeSize / 2, cubeSize / 2]) {
    const cap = new THREE.Mesh(capGeo, blackMat);
    cap.position.y = y;
    cube.add(cap);
  }
  const ring = new THREE.Mesh(own(new THREE.TorusGeometry(2.6, 0.03, 8, 64)), yellowGlow);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -cubeSize / 2 - 0.25;
  cube.add(ring);
  scene.add(cube);
  for (const dx of [-1.2, 1.2]) add(new THREE.CylinderGeometry(0.015, 0.015, 6, 4), metalMat, dx, 13.2, -4);

  /* ---------- project screens along both walls ---------- */
  const projectScreens: LedPanel[] = [];
  const screenW = 3.9;
  const screenH = 2.2;
  PROJECTS.forEach((project, i) => {
    const { side, z } = SCREEN_SLOTS[i];
    const panel = makeLed(screenW, screenH, 140, null);
    panel.mesh.position.set(side * (WALL_X - 0.05), SCREEN_Y, z);
    panel.mesh.rotation.y = -side * (Math.PI / 2);
    panel.mesh.userData.project = i;
    panel.mesh.userData.baseX = panel.mesh.position.x;
    panel.uniforms.brightness.value = 0.82;
    scene.add(panel.mesh);
    const frame = add(new THREE.BoxGeometry(0.25, screenH + 0.3, screenW + 0.3), blackMat, side * (WALL_X + 0.1), SCREEN_Y, z);
    frame.userData.side = side;
    add(new THREE.BoxGeometry(0.06, 0.04, screenW), yellowGlow, side * (WALL_X - 0.08), SCREEN_Y - screenH / 2 - 0.3, z);
    // a wash of light on the wall above each screen
    const wash = add(
      new THREE.PlaneGeometry(4.4, 2.6),
      own(
        new THREE.MeshBasicMaterial({
          map: glowTex,
          color: "#ffd99a",
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
      side * (WALL_X - 0.02),
      SCREEN_Y + 1.9,
      z,
    );
    wash.rotation.y = -side * (Math.PI / 2);
    getTexture(project.image, (tex, aspect) => {
      panel.uniforms.mapA.value = tex;
      panel.uniforms.mapB.value = tex;
      fitCover(panel.uniforms.fitA.value, aspect, panel.aspect);
      fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
    });
    projectScreens.push(panel);
  });

  /* ---------- stills on towers + cube ---------- */
  const stillSlots = [...towers, ...cubeFaces.slice(1)];
  stillSlots.forEach((panel, i) => {
    getTexture(STILLS[i % STILLS.length], (tex, aspect) => {
      panel.uniforms.mapA.value = tex;
      panel.uniforms.mapB.value = tex;
      fitCover(panel.uniforms.fitA.value, aspect, panel.aspect);
      fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
    });
  });
  cubeFaces[0].uniforms.mapA.value = videoTex;
  cubeFaces[0].uniforms.mapB.value = videoTex;

  const applyVideoFit = () => {
    fitCover(mainLed.uniforms.fitA.value, videoAspect, mainLed.aspect);
    fitCover(cubeFaces[0].uniforms.fitA.value, videoAspect, 1);
    fitCover(cubeFaces[0].uniforms.fitB.value, videoAspect, 1);
  };
  applyVideoFit();
  const onMeta = () => {
    if (video.videoWidth) videoAspect = video.videoWidth / video.videoHeight;
    applyVideoFit();
  };
  video.addEventListener("loadedmetadata", onMeta);

  /* ---------- confetti for the finale ---------- */
  const confettiCount = small ? 220 : 600;
  const confetti = new THREE.InstancedMesh(
    own(new THREE.PlaneGeometry(0.07, 0.12)),
    own(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false })),
    confettiCount,
  );
  const confettiState = Array.from({ length: confettiCount }, () => ({
    x: (Math.random() - 0.5) * 22,
    y: Math.random() * 13,
    z: -17 + Math.random() * 16,
    v: 0.6 + Math.random() * 0.9,
    spin: Math.random() * 6,
    phase: Math.random() * 6,
  }));
  const palette = [YELLOW, WHITE, new THREE.Color("#ffd36b"), new THREE.Color("#ffffff")];
  confettiState.forEach((_, i) => confetti.setColorAt(i, palette[i % palette.length]));
  scene.add(confetti);

  /* ---------- haze ---------- */
  const dustCount = small ? 500 : 1500;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 34;
    dustPos[i * 3 + 1] = Math.random() * 13;
    dustPos[i * 3 + 2] = -24 + Math.random() * 38;
  }
  const dustGeo = own(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    own(
      new THREE.PointsMaterial({
        color: "#ffe9b8",
        size: 0.035,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  scene.add(dust);

  if (!pending.size) queueMicrotask(onReady);

  /* ---------- camera path ---------- */
  const posCurve = new THREE.CatmullRomCurve3(
    STATIONS.map((s) => new THREE.Vector3(...s.pos)),
    false,
    "centripetal",
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    STATIONS.map((s) => new THREE.Vector3(...s.look)),
    false,
    "centripetal",
  );
  const segments = STATIONS.length - 1;

  let station = 0;
  let smoothStation = 0;
  let active = true;
  const pointer = new THREE.Vector2(0, 0);
  const pointerNdc = new THREE.Vector2(10, 10);
  const raycaster = new THREE.Raycaster();
  const tmpLook = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const lastCam = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);
  const clock = new THREE.Clock();
  let frame = 0;
  let hovered: number | null = null;
  let lastSwap = 0;
  let swapIndex = 0;
  let fovKick = 0;
  let prevT = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
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
    const dt = Math.min(0.05, t - prevT);
    prevT = t;
    sharedTime.value = t;
    if (grain) grain.uniforms.time.value = t;
    const motion = reducedMotion ? 0.25 : 1;

    // camera: follow the scroll along the path, with a little handheld life
    smoothStation += (station - smoothStation) * (reducedMotion ? 1 : 0.09);
    const u = clamp01(smoothStation / segments);
    posCurve.getPoint(u, camera.position);
    lookCurve.getPoint(u, tmpLook);
    camera.position.x += (pointer.x * 0.35 + Math.sin(t * 0.9) * 0.04) * motion;
    camera.position.y += (pointer.y * 0.18 + Math.sin(t * 1.3 + 1) * 0.03) * motion;
    camera.lookAt(tmpLook);

    // speed zoom: widen the lens while the camera is travelling
    const speed = dt > 0 ? camera.position.distanceTo(lastCam) / dt : 0;
    lastCam.copy(camera.position);
    fovKick += (Math.min(9, speed * 0.55) * motion - fovKick) * 0.08;
    const aspectFov = camera.aspect < 0.8 ? 66 : baseFov;
    camera.fov = aspectFov + fovKick;
    camera.updateProjectionMatrix();

    const finaleMix = smooth(FINALE - 0.8, FINALE - 0.1, smoothStation);
    const workMix = smooth(WORK_START - 0.6, WORK_START, smoothStation) * (1 - smooth(WORK_START + PROJECTS.length - 1, WORK_START + PROJECTS.length - 0.3, smoothStation));
    const laserMix = Math.max(clamp01(1 - Math.abs(smoothStation - 1) * 1.2), finaleMix);
    mainLed.uniforms.mixB.value = finaleMix;
    galleryLight.intensity = workMix * 22;

    // moving heads sweep the room; they converge on stage for the finale
    heads.forEach((h, i) => {
      const sweep = t * h.speed * motion + h.phase;
      tmpTarget.set(Math.sin(sweep) * 11, 0, -5 + Math.cos(sweep * 0.8) * 9);
      focus.set(Math.sin(t * 0.5 + h.phase) * 1.5, 1.2, -16);
      tmpTarget.lerp(focus, finaleMix);
      tmpDir.subVectors(tmpTarget, h.pos).normalize();
      h.pivot.quaternion.setFromUnitVectors(down, tmpDir);
      const c = h.uniforms.color.value;
      const k = (Math.sin(t * 0.3 + h.phase) + 1) / 2;
      c.copy(YELLOW).lerp(i % 2 ? BLUE : WHITE, k * (1 - finaleMix));
      if (finaleMix < 0.5 && Math.sin(t * 0.21 + h.phase * 2) > 0.92) c.lerp(MAGENTA, 0.6);
      h.uniforms.intensity.value = (small ? 0.5 : 0.36) * (1 - workMix * 0.55);
      // light pool where the beam meets the floor
      const along = -h.pos.y / tmpDir.y;
      h.pool.position.set(h.pos.x + tmpDir.x * along, 0.03, h.pos.z + tmpDir.z * along);
      const mat = h.pool.material as THREE.MeshBasicMaterial;
      mat.color.copy(c);
      mat.opacity = 0.5 * (1 - workMix * 0.5);
    });

    // lasers fan out over the crowd
    laserMat.opacity = laserMix * (0.85 - finaleMix * 0.45);
    laserMat.color.copy(CYAN).lerp(YELLOW, finaleMix);
    lasers.forEach((l, i) => {
      const spread = (i / (lasers.length - 1) - 0.5) * 1.6;
      l.rotation.y = spread + Math.sin(t * 0.8 * motion + i) * 0.25;
      l.rotation.x = -0.12 - (Math.sin(t * 0.6 * motion + i * 0.5) + 1) * 0.12;
    });
    laserGroup.visible = laserMix > 0.01;

    // crowd sways; the finale gets them jumping
    const energy = 0.03 + finaleMix * 0.12;
    rimColor.value.copy(BLUE).lerp(FINALE_RIM, finaleMix);
    rimStrength.value = 1.2 - finaleMix * 0.55;
    const place = (mesh: THREE.InstancedMesh, list: Person[], jumpBoost: number) => {
      list.forEach((p, i) => {
        const bob = Math.max(0, Math.sin(t * (2.1 + finaleMix * 1.6) + p.phase)) * energy * jumpBoost * motion;
        dummy.position.set(p.x, bob, p.z);
        dummy.rotation.set(0, p.ry + Math.sin(t * 0.7 + p.phase) * 0.08 * motion, 0);
        dummy.scale.setScalar(p.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(crowdA, standing, 1);
    place(crowdB, cheering, 1.6);
    phoneOwners.forEach((owner, i) => {
      const p = everyone[owner];
      const up = Math.sin(t * 0.7 + p.phase) > -0.2;
      phonePositions[i * 3] = p.x + 0.12;
      phonePositions[i * 3 + 1] = up ? 1.75 * p.s + 0.25 : -5;
      phonePositions[i * 3 + 2] = p.z;
    });
    phoneGeo.attributes.position.needsUpdate = true;

    // confetti rains during the finale
    confetti.visible = finaleMix > 0.02;
    if (confetti.visible) {
      confettiState.forEach((c, i) => {
        c.y -= c.v * dt * motion;
        if (c.y < 0) {
          c.y = 12 + Math.random() * 2;
          c.x = (Math.random() - 0.5) * 22;
        }
        dummy.position.set(c.x + Math.sin(t * 1.5 + c.phase) * 0.3, c.y, c.z);
        dummy.rotation.set(t * c.spin, t * c.spin * 0.7, c.phase);
        dummy.scale.setScalar(finaleMix);
        dummy.updateMatrix();
        confetti.setMatrixAt(i, dummy.matrix);
      });
      confetti.instanceMatrix.needsUpdate = true;
    }

    cube.rotation.y = t * 0.22 * motion;
    ring.rotation.z = t * 0.6;
    dust.rotation.y = t * 0.01;
    stageWash.color.setHSL(0.62 - finaleMix * 0.5, 0.7, 0.55);

    // rotate stills on the towers and cube every few seconds (crossfade)
    if (t - lastSwap > 4.5) {
      lastSwap = t;
      swapIndex++;
      stillSlots.forEach((panel, i) => {
        getTexture(STILLS[(i + swapIndex) % STILLS.length], (tex, aspect) => {
          panel.uniforms.mapA.value = panel.uniforms.mapB.value;
          panel.uniforms.fitA.value.copy(panel.uniforms.fitB.value);
          panel.uniforms.mapB.value = tex;
          fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
          panel.uniforms.mixB.value = 0;
        });
      });
    }
    for (const panel of stillSlots) panel.uniforms.mixB.value = Math.min(1, panel.uniforms.mixB.value + 0.03);

    // project screens: the one the camera is visiting lights up and leans out from the wall
    const visiting = Math.round(smoothStation - WORK_START);
    if (pointerNdc.x <= 1) {
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObjects(
        projectScreens.map((p) => p.mesh),
        false,
      )[0];
      const next = hit ? (hit.object.userData.project as number) : null;
      if (next !== hovered) {
        hovered = next;
        canvas.style.cursor = next === null ? "" : "pointer";
        onHoverProject(next);
      }
    }
    projectScreens.forEach((p, i) => {
      const on = hovered === i || (workMix > 0.5 && visiting === i) ? 1 : 0;
      p.uniforms.hover.value += (on - p.uniforms.hover.value) * 0.1;
      const side = SCREEN_SLOTS[i].side;
      p.mesh.position.x = (p.mesh.userData.baseX as number) - side * p.uniforms.hover.value * 0.35;
    });

    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  /* ---------- input ---------- */
  const onPointerMove = (e: PointerEvent) => {
    pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerNdc.copy(pointer);
  };
  const onPointerLeave = () => pointerNdc.set(10, 10);
  const onClick = () => {
    if (hovered !== null) onSelectProject(hovered);
  };
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);
  window.addEventListener("resize", resize);
  resize();
  tick();

  return {
    setStation(s) {
      station = s;
    },
    setActive(a) {
      active = a;
      if (a) video.play().catch(() => undefined);
      else video.pause();
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
      video.removeEventListener("loadedmetadata", onMeta);
      owned.forEach((o) => o.dispose());
      textures.forEach(({ tex }) => tex.dispose());
      videoTex.dispose();
      composer?.dispose();
      renderer.dispose();
    },
  };
}
