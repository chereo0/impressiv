import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { PROJECTS, STATIONS, STILLS } from "./content";

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
  /** Fractional station index: 0 = entrance … 5 = stage. */
  setStation: (s: number) => void;
  setActive: (active: boolean) => void;
  dispose: () => void;
}

const YELLOW = new THREE.Color("#ffb500");
const WHITE = new THREE.Color("#fff4e0");
const BLUE = new THREE.Color("#3d6bff");
const MAGENTA = new THREE.Color("#ff3b8d");

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
  uniform vec4 fitA;   // xy scale, zw offset
  uniform vec4 fitB;
  uniform float mixB;
  uniform vec2 cells;
  uniform float brightness;
  uniform float hover;
  varying vec2 vUv;
  void main() {
    vec2 cell = floor(vUv * cells);
    vec2 cuv = (cell + 0.5) / cells;
    vec2 f = fract(vUv * cells) - 0.5;
    float diode = smoothstep(0.52, 0.18, length(f));
    vec3 a = texture2D(mapA, cuv * fitA.xy + fitA.zw).rgb;
    vec3 b = texture2D(mapB, cuv * fitB.xy + fitB.zw).rgb;
    vec3 col = mix(a, b, mixB) * brightness * (1.0 + hover * 0.6);
    col *= mix(0.28, 1.15, diode);
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

/** Volumetric-looking light beam: bright at the lamp, fading with distance and at the edges. */
const BEAM_FRAG = /* glsl */ `
  uniform vec3 color;
  uniform float intensity;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vViewV;
  void main() {
    float along = pow(vUv.y, 1.6);
    float edge = pow(abs(dot(vNormalV, vViewV)), 1.4);
    float a = along * edge * intensity;
    gl_FragColor = vec4(color * a, a);
  }
`;

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

/** A straight square box truss of the given length along +X, centred on the origin. */
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
  const step = size;
  const n = Math.floor(length / step);
  const dir = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const x0 = -length / 2 + i * step;
    for (let k = 0; k < 4; k++) {
      const a = corners[k];
      const b = corners[(k + 1) % 4];
      const p0 = new THREE.Vector3(x0, a[0], a[1]);
      const p1 = new THREE.Vector3(x0 + step, b[0], b[1]);
      dir.subVectors(p1, p0);
      const len = dir.length();
      mid.addVectors(p0, p1).multiplyScalar(0.5);
      const g = new THREE.CylinderGeometry(r * 0.6, r * 0.6, len, 5, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.normalize()));
      g.translate(mid.x, mid.y, mid.z);
      parts.push(g);
    }
  }
  return mergeGeometries(parts)!;
}

function personGeometry() {
  const body = new THREE.CapsuleGeometry(0.21, 0.78, 3, 8);
  body.translate(0, 0.62, 0);
  const head = new THREE.SphereGeometry(0.13, 10, 8);
  head.translate(0, 1.38, 0);
  return mergeGeometries([body, head])!;
}

/* ------------------------------------------------------------- the venue */

interface MovingHead {
  pivot: THREE.Group;
  beam: THREE.Mesh;
  uniforms: { color: { value: THREE.Color }; intensity: { value: number } };
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
  scene.fog = new THREE.FogExp2("#05060a", small ? 0.03 : 0.026);

  const camera = new THREE.PerspectiveCamera(small ? 62 : 50, 1, 0.1, 140);

  // post-processing: bloom makes the LEDs and beams glow (desktop only)
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  if (!small) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.85, 0.55, 0.32);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
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
      const img = t.image as HTMLImageElement;
      const entry = { tex: t, aspect: img.width / img.height };
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

  const owned: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(x: T) => {
    owned.push(x);
    return x;
  };

  /* ---------- materials ---------- */
  const wallMat = own(new THREE.MeshStandardMaterial({ color: "#0c0c10", roughness: 0.92 }));
  const floorMat = own(new THREE.MeshStandardMaterial({ color: "#0b0b0e", roughness: 0.42, metalness: 0.45 }));
  const stageMat = own(new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.3, metalness: 0.5 }));
  const metalMat = own(new THREE.MeshStandardMaterial({ color: "#8a8d92", roughness: 0.35, metalness: 0.85 }));
  const blackMat = own(new THREE.MeshStandardMaterial({ color: "#070708", roughness: 0.6, metalness: 0.2 }));
  const crowdMat = own(new THREE.MeshStandardMaterial({ color: "#121216", roughness: 0.85 }));
  const yellowGlow = own(new THREE.MeshBasicMaterial({ color: YELLOW }));

  /* ---------- lights ---------- */
  scene.add(new THREE.HemisphereLight("#2a3048", "#050505", 0.5));
  const stageWash = new THREE.PointLight("#5b7cff", 70, 30, 1.6);
  stageWash.position.set(0, 7, -14);
  const warm = new THREE.PointLight("#ffb347", 50, 28, 1.6);
  warm.position.set(0, 3, -12);
  const entranceLight = new THREE.PointLight("#ffd27a", 40, 18, 1.6);
  entranceLight.position.set(0, 7, 18);
  scene.add(stageWash, warm, entranceLight);

  /* ---------- hall ---------- */
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(own(geo), mat);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };
  const floor = add(new THREE.PlaneGeometry(60, 90), floorMat, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2;
  add(new THREE.BoxGeometry(0.5, 16, 40), wallMat, -18.25, 8, -5); // left wall
  add(new THREE.BoxGeometry(0.5, 16, 40), wallMat, 18.25, 8, -5); // right wall
  add(new THREE.BoxGeometry(37, 16, 0.5), wallMat, 0, 8, -25.25); // back wall
  add(new THREE.BoxGeometry(13, 16, 0.5), wallMat, -11.5, 8, 14.25); // front wall, left of door
  add(new THREE.BoxGeometry(13, 16, 0.5), wallMat, 11.5, 8, 14.25); // front wall, right
  add(new THREE.BoxGeometry(10, 6.5, 0.5), wallMat, 0, 12.75, 14.25); // above the door

  // entrance: arch frame, lit sign, carpet
  add(new THREE.BoxGeometry(0.6, 9.5, 0.9), metalMat, -5.2, 4.75, 14.4);
  add(new THREE.BoxGeometry(0.6, 9.5, 0.9), metalMat, 5.2, 4.75, 14.4);
  add(new THREE.BoxGeometry(11, 0.6, 0.9), metalMat, 0, 9.8, 14.4);
  const sign = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 210px ${cssFont("--font-montserrat", "sans-serif")}`;
    ctx.fillText("IMPRESS", w / 2 - 95, h / 2 - 30);
    ctx.fillStyle = "#ffb500";
    ctx.fillText("IV", w / 2 + 380, h / 2 - 30);
    ctx.font = `400 64px ${cssFont("--font-lato", "sans-serif")}`;
    ctx.fillStyle = "#ffb500";
    ctx.fillText("W E   D O   I T   L I V E", w / 2, h / 2 + 150);
  }, 1600, 640);
  own(sign);
  const signMesh = add(new THREE.PlaneGeometry(8.5, 3.4), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false }), 0, 12.3, 14.55);
  own(signMesh.material as THREE.Material);
  const carpet = add(new THREE.PlaneGeometry(4, 22), own(new THREE.MeshStandardMaterial({ color: "#16161a", roughness: 0.9 })), 0, 0.01, 25);
  carpet.rotation.x = -Math.PI / 2;
  for (const side of [-1, 1]) {
    const strip = add(new THREE.PlaneGeometry(0.06, 22), yellowGlow, side * 2.05, 0.02, 25);
    strip.rotation.x = -Math.PI / 2;
  }

  /* ---------- stage ---------- */
  add(new THREE.BoxGeometry(22, 1.2, 9.5), stageMat, 0, 0.6, -20);
  add(new THREE.BoxGeometry(22, 0.05, 0.05), yellowGlow, 0, 1.2, -15.25); // lit stage lip

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
    };
    const mat = own(new THREE.ShaderMaterial({ uniforms, vertexShader: LED_VERT, fragmentShader: LED_FRAG }));
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(w, h)), mat);
    const panel: LedPanel = { mesh, uniforms, aspect: w / h };
    ledPanels.push(panel);
    return panel;
  };

  // main LED wall: the showreel, then the IMPRESSIV ident for the finale
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

  const towers: LedPanel[] = [];
  for (const side of [-1, 1]) {
    const tower = makeLed(3.2, 7, 48, null);
    tower.mesh.position.set(side * 10.6, 4.7, -21.2);
    tower.mesh.rotation.y = -side * 0.38;
    scene.add(tower.mesh);
    const frame = add(new THREE.BoxGeometry(3.5, 7.3, 0.3), blackMat, side * 10.66, 4.7, -21.35);
    frame.rotation.y = -side * 0.38;
    towers.push(tower);
  }

  // line-array speakers hanging beside the stage
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const box = add(new THREE.BoxGeometry(1.3, 0.42, 0.8), blackMat, side * 13.4, 10 - i * 0.44, -15.5);
      box.rotation.x = 0.06 * i;
    }
  }

  // truss: front and back spans + two towers
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

  /* ---------- moving heads ---------- */
  const heads: MovingHead[] = [];
  const beamGeo = own(new THREE.ConeGeometry(1.5, 22, 28, 1, true));
  beamGeo.translate(0, -11, 0);
  const headGeo = own(new THREE.BoxGeometry(0.42, 0.5, 0.42));
  const lensGeo = own(new THREE.CircleGeometry(0.16, 16));
  const headCount = small ? 6 : 10;
  for (let i = 0; i < headCount; i++) {
    const x = -11 + (22 / (headCount - 1)) * i;
    const pos = new THREE.Vector3(x, 11.5, i % 2 ? -15.6 : -22.2);
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    const body = new THREE.Mesh(headGeo, blackMat);
    pivot.add(body);
    const lens = new THREE.Mesh(lensGeo, yellowGlow);
    lens.rotation.x = Math.PI / 2;
    lens.position.y = -0.26;
    pivot.add(lens);
    const uniforms = { color: { value: YELLOW.clone() }, intensity: { value: small ? 0.5 : 0.38 } };
    const beam = new THREE.Mesh(
      beamGeo,
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
      ),
    );
    pivot.add(beam);
    scene.add(pivot);
    heads.push({ pivot, beam, uniforms, phase: i * 0.9, speed: 0.35 + (i % 3) * 0.1, pos });
  }

  // uplights either side of the entrance
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 5.2, 0.2, 15.2);
    pivot.rotation.z = Math.PI + side * 0.08;
    const uniforms = { color: { value: YELLOW.clone() }, intensity: { value: 0.32 } };
    const beam = new THREE.Mesh(
      beamGeo,
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
      ),
    );
    beam.scale.set(0.5, 0.6, 0.5);
    pivot.add(beam);
    scene.add(pivot);
  }

  /* ---------- crowd ---------- */
  const people: { x: number; z: number; s: number; phase: number; ry: number }[] = [];
  const crowdTarget = small ? 220 : 460;
  let guard = 0;
  while (people.length < crowdTarget && guard++ < 5000) {
    const x = (Math.random() - 0.5) * 27;
    const z = -14 + Math.random() * 17;
    if (x > 0.8 && x < 3.4 && z > -6) continue; // aisle the camera walks down
    people.push({ x, z, s: 0.88 + Math.random() * 0.22, phase: Math.random() * Math.PI * 2, ry: (Math.random() - 0.5) * 0.5 });
  }
  const crowd = new THREE.InstancedMesh(own(personGeometry()), crowdMat, people.length);
  scene.add(crowd);
  const dummy = new THREE.Object3D();

  // phone screens held up in the crowd
  const phoneCount = Math.floor(people.length * 0.12);
  const phonePositions = new Float32Array(phoneCount * 3);
  const phoneOwners: number[] = [];
  for (let i = 0; i < phoneCount; i++) phoneOwners.push(Math.floor(Math.random() * people.length));
  const phoneGeo = own(new THREE.BufferGeometry());
  phoneGeo.setAttribute("position", new THREE.BufferAttribute(phonePositions, 3));
  const phones = new THREE.Points(
    phoneGeo,
    own(new THREE.PointsMaterial({ color: "#dfe8ff", size: 0.09, sizeAttenuation: true })),
  );
  scene.add(phones);

  /* ---------- LED cube ---------- */
  const cube = new THREE.Group();
  cube.position.set(8, 6.5, -2);
  const cubeFaces: LedPanel[] = [];
  for (let i = 0; i < 4; i++) {
    const face = makeLed(2.6, 2.6, 56, null);
    const a = (i * Math.PI) / 2;
    face.mesh.position.set(Math.sin(a) * 1.3, 0, Math.cos(a) * 1.3);
    face.mesh.rotation.y = a;
    cube.add(face.mesh);
    cubeFaces.push(face);
  }
  const capGeo = own(new THREE.BoxGeometry(2.62, 0.06, 2.62));
  for (const y of [-1.31, 1.31]) {
    const cap = new THREE.Mesh(capGeo, blackMat);
    cap.position.y = y;
    cube.add(cap);
  }
  scene.add(cube);
  for (const dx of [-1.1, 1.1]) add(new THREE.CylinderGeometry(0.015, 0.015, 8, 4), metalMat, 8 + dx, 11.8, -2);

  /* ---------- project screens on the left wall ---------- */
  const projectScreens: LedPanel[] = [];
  PROJECTS.forEach((project, i) => {
    const panel = makeLed(5.4, 3.04, 150, null);
    const z = 6 - i * 6;
    panel.mesh.position.set(-17.75, 5.3, z);
    panel.mesh.rotation.y = Math.PI / 2;
    panel.mesh.userData.project = i;
    panel.uniforms.brightness.value = 1.1;
    scene.add(panel.mesh);
    add(new THREE.BoxGeometry(0.25, 3.4, 5.8), blackMat, -17.9, 5.3, z);
    add(new THREE.BoxGeometry(0.08, 0.04, 5.6), yellowGlow, -17.7, 3.6, z);
    getTexture(project.image, (tex, aspect) => {
      panel.uniforms.mapA.value = tex;
      panel.uniforms.mapB.value = tex;
      fitCover(panel.uniforms.fitA.value, aspect, panel.aspect);
      fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
    });
    projectScreens.push(panel);
  });

  /* ---------- stills on towers + cube ---------- */
  const stillSlots = [...towers, ...cubeFaces];
  stillSlots.forEach((panel, i) => {
    const src = STILLS[i % STILLS.length];
    getTexture(src, (tex, aspect) => {
      panel.uniforms.mapA.value = tex;
      fitCover(panel.uniforms.fitA.value, aspect, panel.aspect);
      panel.uniforms.mapB.value = tex;
      fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
    });
  });
  // one cube face plays the reel
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

  /* ---------- haze / dust ---------- */
  const dustCount = small ? 500 : 1400;
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

  // nothing to wait for in the loader (e.g. all cached) → still report ready
  if (!pending.size) queueMicrotask(onReady);

  /* ---------- camera path ---------- */
  const posCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.pos)), false, "centripetal");
  const lookCurve = new THREE.CatmullRomCurve3(STATIONS.map((s) => new THREE.Vector3(...s.look)), false, "centripetal");
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
  const down = new THREE.Vector3(0, -1, 0);
  const clock = new THREE.Clock();
  let frame = 0;
  let hovered: number | null = null;
  let lastSwap = 0;
  let swapIndex = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    bloom?.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 66 : small ? 62 : 50;
    camera.updateProjectionMatrix();
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    if (!active) return;
    const t = clock.getElapsedTime();
    const motion = reducedMotion ? 0.25 : 1;

    // ease the camera towards the scroll position so wheel steps glide
    smoothStation += (station - smoothStation) * (reducedMotion ? 1 : 0.08);
    const u = clamp01(smoothStation / segments);
    posCurve.getPoint(u, camera.position);
    lookCurve.getPoint(u, tmpLook);
    camera.position.x += pointer.x * 0.35 * motion;
    camera.position.y += pointer.y * 0.18 * motion;
    camera.lookAt(tmpLook);

    // finale: the LED wall switches to the call to action and the beams converge on stage
    const finaleMix = smooth(4.2, 4.9, smoothStation);
    mainLed.uniforms.mixB.value = finaleMix;

    for (const h of heads) {
      const sweep = t * h.speed * motion + h.phase;
      tmpTarget.set(Math.sin(sweep) * 11, 0, -5 + Math.cos(sweep * 0.8) * 9);
      const focus = new THREE.Vector3(Math.sin(t * 0.5 + h.phase) * 1.5, 1.2, -16);
      tmpTarget.lerp(focus, finaleMix);
      tmpDir.subVectors(tmpTarget, h.pos).normalize();
      h.pivot.quaternion.setFromUnitVectors(down, tmpDir);
      const c = h.uniforms.color.value;
      const k = (Math.sin(t * 0.3 + h.phase) + 1) / 2;
      c.copy(YELLOW).lerp(h.phase % 2 > 1 ? BLUE : WHITE, k * (1 - finaleMix));
      if (finaleMix < 0.5 && Math.sin(t * 0.21 + h.phase * 2) > 0.92) c.lerp(MAGENTA, 0.6);
    }

    // crowd sways; jumps a little at the finale
    const energy = 0.03 + finaleMix * 0.09;
    people.forEach((p, i) => {
      const bob = Math.max(0, Math.sin(t * (2.1 + finaleMix * 1.4) + p.phase)) * energy * motion;
      dummy.position.set(p.x, bob, p.z);
      dummy.rotation.set(0, p.ry, 0);
      dummy.scale.setScalar(p.s);
      dummy.updateMatrix();
      crowd.setMatrixAt(i, dummy.matrix);
    });
    crowd.instanceMatrix.needsUpdate = true;
    phoneOwners.forEach((owner, i) => {
      const p = people[owner];
      const up = Math.sin(t * 0.7 + p.phase) > -0.2 ? 1 : 0;
      phonePositions[i * 3] = p.x + 0.12;
      phonePositions[i * 3 + 1] = up ? 1.75 * p.s + 0.25 : -5;
      phonePositions[i * 3 + 2] = p.z;
    });
    phoneGeo.attributes.position.needsUpdate = true;

    cube.rotation.y = t * 0.25 * motion;
    dust.rotation.y = t * 0.01;
    stageWash.color.setHSL(0.62 - finaleMix * 0.5, 0.7, 0.55);

    // rotate stills on the towers and cube every few seconds (crossfade)
    if (t - lastSwap > 4.5) {
      lastSwap = t;
      swapIndex++;
      stillSlots.forEach((panel, i) => {
        if (panel === cubeFaces[0]) return;
        const src = STILLS[(i + swapIndex) % STILLS.length];
        getTexture(src, (tex, aspect) => {
          panel.uniforms.mapA.value = panel.uniforms.mapB.value;
          panel.uniforms.fitA.value.copy(panel.uniforms.fitB.value);
          panel.uniforms.mapB.value = tex;
          fitCover(panel.uniforms.fitB.value, aspect, panel.aspect);
          panel.uniforms.mixB.value = 0;
        });
      });
    }
    for (const panel of stillSlots) {
      if (panel === cubeFaces[0]) continue;
      panel.uniforms.mixB.value = Math.min(1, panel.uniforms.mixB.value + 0.03);
    }

    // hover the project screens
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
      p.uniforms.hover.value += ((hovered === i ? 1 : 0) - p.uniforms.hover.value) * 0.15;
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
