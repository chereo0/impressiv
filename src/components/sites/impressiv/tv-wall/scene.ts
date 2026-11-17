import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/examples/jsm/objects/Reflector.js";
import { CHANNELS, HERO_INDEX, IDENT_WORDS, IMAGE_POOL, ROWS, VIDEO_SRC, type Channel } from "./channels";

export interface TvWallOptions {
  canvas: HTMLCanvasElement;
  video: HTMLVideoElement;
  reducedMotion: boolean;
  onHover: (channel: Channel | null) => void;
  onSelect: (channel: Channel) => void;
}

export interface TvWallHandle {
  /** Scroll progress through the wall section, 0..1. */
  setProgress: (p: number) => void;
  setMono: (mono: boolean) => void;
  setActive: (active: boolean) => void;
  /** Starts the power-on sequence (called when the boot screen ends). */
  powerOn: () => void;
  dispose: () => void;
}

const SCREEN_ASPECT = 4 / 3;
const CELL_W = 1.18;
const CELL_H = 0.96;
const FOV = 35;

const CASE_COLORS = ["#3a281b", "#c8bea6", "#161616", "#55585b", "#6e4f33", "#8f8a7d", "#222a2e"];

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D map;
  uniform float hasMap;
  uniform vec2 uvScale;
  uniform vec2 uvOffset;
  uniform float power;
  uniform float time;
  uniform float mono;
  uniform float hover;
  uniform float noiseMix;
  uniform float seed;
  uniform float bars;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  vec3 colourBars(vec2 uv) {
    float i = floor(uv.x * 7.0);
    vec3 c = vec3(0.75);
    if (i == 1.0) c = vec3(0.75, 0.75, 0.0);
    else if (i == 2.0) c = vec3(0.0, 0.75, 0.75);
    else if (i == 3.0) c = vec3(0.0, 0.75, 0.0);
    else if (i == 4.0) c = vec3(0.75, 0.0, 0.75);
    else if (i == 5.0) c = vec3(0.75, 0.0, 0.0);
    else if (i == 6.0) c = vec3(0.0, 0.0, 0.75);
    if (uv.y < 0.22) c = vec3(floor(uv.x * 5.0) / 6.0);
    return c;
  }

  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float r2 = dot(uv, uv);
    uv *= 1.0 + 0.07 * r2;               // barrel bend
    vec2 suv = uv * 0.5 + 0.5;
    if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    vec3 col = vec3(0.02);
    if (hasMap > 0.5) col = texture2D(map, suv * uvScale + uvOffset).rgb;
    if (bars > 0.5) col = colourBars(suv);

    float n = hash(floor(suv * vec2(220.0, 165.0)) + vec2(fract(time * 9.1) * 91.0, fract(time * 5.3) * 37.0) + seed);
    col = mix(col, vec3(n * 0.9), noiseMix);

    col *= 0.82 + 0.18 * sin(suv.y * 520.0);                        // scanlines
    float g = mod(gl_FragCoord.x, 3.0);                                 // aperture grille
    col *= vec3(g < 1.0 ? 1.0 : 0.82, (g >= 1.0 && g < 2.0) ? 1.0 : 0.82, g >= 2.0 ? 1.0 : 0.82);
    col *= 1.0 - 0.45 * r2;                                            // vignette
    col *= 1.0 + 0.35 * hover;

    if (mono > 0.5) col = vec3(dot(col, vec3(0.299, 0.587, 0.114)));

    // power-on: a bright line opens vertically, then the picture settles
    float openY = max(power * 1.4 - 0.4, 0.004) * 0.5;
    float openX = min(power * 3.0, 1.0) * 0.5;
    float vis = step(abs(suv.y - 0.5), openY) * step(abs(suv.x - 0.5), openX);
    col = (col + vec3(1.0 - power) * 0.9) * vis * step(0.001, power);

    gl_FragColor = vec4(col, 1.0);
  }
`;

interface TvSet {
  channel: Channel;
  group: THREE.Group;
  screen: THREE.Mesh;
  uniforms: Record<string, THREE.IUniform>;
  row: number;
  baseMap: THREE.Texture | null;
  baseAspect: number;
  powerStart: number;
  burstUntil: number;
  nextSwap: number;
  screenW: number;
  screenH: number;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const range = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

function cssFont(variable: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || fallback;
}

function makeCardTexture(channel: Channel): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext("2d")!;
  const heebo = cssFont("--font-heebo", "sans-serif");
  const mono = cssFont("--font-vt323", "monospace");
  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, "#1b1b1b");
  grad.addColorStop(1, "#0c0c0c");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `34px ${mono}`;
  ctx.fillText(`CH ${String(channel.number).padStart(2, "0")}`, 34, 58);
  ctx.fillStyle = "#e0262b";
  ctx.beginPath();
  ctx.arc(470, 46, 9, 0, Math.PI * 2);
  ctx.fill();
  const title = channel.title ?? channel.label.toUpperCase();
  let size = 92;
  ctx.font = `700 ${size}px ${heebo}`;
  while (ctx.measureText(title).width > 440 && size > 30) {
    size -= 4;
    ctx.font = `700 ${size}px ${heebo}`;
  }
  ctx.fillStyle = "#fcb415";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 256, 200);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `30px ${mono}`;
  ctx.fillText("IMPRESSIV · ON AIR", 34, 346);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function makeWordTexture(word: string, background: string, color: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext("2d")!;
  const heebo = cssFont("--font-heebo", "sans-serif");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 512, 384);
  let size = 220;
  ctx.font = `700 ${size}px ${heebo}`;
  while (ctx.measureText(word).width > 450 && size > 40) {
    size -= 6;
    ctx.font = `700 ${size}px ${heebo}`;
  }
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(word, 256, 205);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function makeNoSignalTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 384;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#1730c9";
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = "#fff";
  ctx.font = `44px ${cssFont("--font-vt323", "monospace")}`;
  ctx.textAlign = "center";
  ctx.fillText("NO SIGNAL", 256, 205);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Bulged CRT glass: a plane pushed forward towards its centre. */
function makeScreenGeometry(w: number, h: number) {
  const geo = new THREE.PlaneGeometry(w, h, 18, 14);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) / (w / 2);
    const y = pos.getY(i) / (h / 2);
    pos.setZ(i, (1 - (x * x + y * y) / 2) * 0.035);
  }
  geo.computeVertexNormals();
  return geo;
}

function setCover(u: Record<string, THREE.IUniform>, texAspect: number) {
  const scale = u.uvScale.value as THREE.Vector2;
  const offset = u.uvOffset.value as THREE.Vector2;
  if (texAspect > SCREEN_ASPECT) {
    scale.set(SCREEN_ASPECT / texAspect, 1);
  } else {
    scale.set(1, texAspect / SCREEN_ASPECT);
  }
  offset.set((1 - scale.x) / 2, (1 - scale.y) / 2);
}

export function createTvWall(opts: TvWallOptions): TvWallHandle {
  const { canvas, video, reducedMotion, onHover, onSelect } = opts;
  const isSmall = window.innerWidth < 768;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isSmall, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.25 : 1.6));
  renderer.setClearColor(0x050505, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050505, 9, 30);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 80);

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const key = new THREE.SpotLight(0xffe2b0, 60, 30, Math.PI / 5, 0.7, 1.4);
  key.position.set(0, 11, 7);
  key.target.position.set(0, 2.2, 0);
  scene.add(key, key.target);
  const glow = new THREE.PointLight(0x7fa8ff, 8, 12, 1.8);
  glow.position.set(0, 2.4, 2.4);
  scene.add(glow);
  const rim = new THREE.PointLight(0xffb500, 6, 14, 1.8);
  rim.position.set(-5, 1.5, -2);
  scene.add(rim);

  // ---------- floor ----------
  let reflector: Reflector | null = null;
  if (!isSmall) {
    reflector = new Reflector(new THREE.PlaneGeometry(60, 60), {
      textureWidth: Math.round(window.innerWidth * 0.5),
      textureHeight: Math.round(window.innerHeight * 0.5),
      color: 0x8a8a8a,
      clipBias: 0.003,
    });
    reflector.rotation.x = -Math.PI / 2;
    scene.add(reflector);
  }
  const concrete = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85,
      metalness: 0,
      transparent: !isSmall,
      opacity: isSmall ? 1 : 0.86,
    }),
  );
  concrete.rotation.x = -Math.PI / 2;
  concrete.position.y = 0.002;
  scene.add(concrete);

  // ---------- shared resources ----------
  const shared = { time: { value: 0 }, mono: { value: 0 } };
  const loader = new THREE.TextureLoader();
  type CacheEntry = { tex: THREE.Texture; aspect: number; waiters: ((t: THREE.Texture, a: number) => void)[] };
  const imageCache = new Map<string, CacheEntry>();
  const loadImage = (src: string, onReady: (tex: THREE.Texture, aspect: number) => void) => {
    const hit = imageCache.get(src);
    if (hit) {
      if (hit.aspect) onReady(hit.tex, hit.aspect);
      else hit.waiters.push(onReady);
      return;
    }
    const entry: CacheEntry = { tex: null as unknown as THREE.Texture, aspect: 0, waiters: [onReady] };
    imageCache.set(src, entry);
    entry.tex = loader.load(src, (t) => {
      const img = t.image as HTMLImageElement;
      entry.aspect = img.width / img.height;
      entry.waiters.forEach((w) => w(t, entry.aspect));
      entry.waiters = [];
    });
    entry.tex.colorSpace = THREE.NoColorSpace;
  };

  const videoTex = new THREE.VideoTexture(video);
  videoTex.colorSpace = THREE.NoColorSpace;
  let videoAspect = 16 / 9;

  const noSignal = makeNoSignalTexture();
  const identTextures = IDENT_WORDS.map((w, i) =>
    makeWordTexture(w, i % 2 ? "#ffb500" : "#0b0b0b", i % 2 ? "#0b0b0b" : "#ffb500"),
  );
  const ownedTextures: THREE.Texture[] = [noSignal, ...identTextures];

  const caseGeoCache = new Map<string, THREE.BufferGeometry>();
  const caseMaterials = CASE_COLORS.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.08 }),
  );
  const bezelMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.4 });
  const knobMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.3, metalness: 0.6 });
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0xff3b2f });

  // ---------- build the pyramid ----------
  const sets: TvSet[] = [];
  const rand = (() => {
    let s = 7;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  })();

  let idx = 0;
  ROWS.forEach((count, row) => {
    for (let col = 0; col < count; col++) {
      const channel = CHANNELS[idx];
      const scale = idx === HERO_INDEX ? 1 : 0.84 + rand() * 0.18;
      const hasSide = rand() > 0.45;
      const w = CELL_W * 0.94 * scale * (hasSide ? 1 : 0.86);
      const h = CELL_H * 0.92 * scale;
      const d = 0.75 * scale;
      const geoKey = `${w.toFixed(2)}-${h.toFixed(2)}-${d.toFixed(2)}`;
      let caseGeo = caseGeoCache.get(geoKey);
      if (!caseGeo) {
        caseGeo = new RoundedBoxGeometry(w, h, d, 3, 0.06);
        caseGeoCache.set(geoKey, caseGeo);
      }
      const group = new THREE.Group();
      const body = new THREE.Mesh(caseGeo, caseMaterials[Math.floor(rand() * caseMaterials.length)]);
      group.add(body);

      const screenAreaW = hasSide ? w * 0.72 : w * 0.86;
      const sh = Math.min(h * 0.8, screenAreaW / SCREEN_ASPECT);
      const sw = sh * SCREEN_ASPECT;
      const sx = hasSide ? -w / 2 + w * 0.06 + sw / 2 : 0;

      const bezel = new THREE.Mesh(new THREE.PlaneGeometry(sw * 1.08, sh * 1.1), bezelMaterial);
      bezel.position.set(sx, 0, d / 2 + 0.002);
      group.add(bezel);

      const uniforms: Record<string, THREE.IUniform> = {
        map: { value: null },
        hasMap: { value: 0 },
        uvScale: { value: new THREE.Vector2(1, 1) },
        uvOffset: { value: new THREE.Vector2(0, 0) },
        power: { value: 0 },
        time: shared.time,
        mono: shared.mono,
        hover: { value: 0 },
        noiseMix: { value: 0 },
        seed: { value: rand() * 100 },
        bars: { value: channel.kind === "bars" ? 1 : 0 },
      };
      const screen = new THREE.Mesh(
        makeScreenGeometry(sw, sh),
        new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG }),
      );
      screen.position.set(sx, 0, d / 2 + 0.004);
      screen.userData.index = idx;
      group.add(screen);

      if (hasSide) {
        const panelX = sx + sw / 2 + (w / 2 - (sx + sw / 2)) / 2;
        for (let k = 0; k < 2; k++) {
          const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16), knobMaterial);
          knob.rotation.x = Math.PI / 2;
          knob.position.set(panelX, h * 0.22 - k * 0.17, d / 2 + 0.02);
          group.add(knob);
        }
        const led = new THREE.Mesh(new THREE.CircleGeometry(0.012, 10), ledMaterial);
        led.position.set(panelX, -h * 0.3, d / 2 + 0.003);
        group.add(led);
      }

      if (row === ROWS.length - 1) {
        for (const side of [-1, 1]) {
          const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), knobMaterial);
          rod.position.set(side * 0.18, h / 2 + 0.38, 0);
          rod.rotation.z = side * -0.45;
          group.add(rod);
        }
      }

      const x = (col - (count - 1) / 2) * CELL_W + (rand() - 0.5) * 0.08;
      const y = row * CELL_H + h / 2;
      const z = idx === HERO_INDEX ? 0.12 : (rand() - 0.5) * 0.22 - row * 0.04;
      group.position.set(x, y, z);
      group.rotation.y = idx === HERO_INDEX ? 0 : (rand() - 0.5) * 0.16;
      scene.add(group);

      const set: TvSet = {
        channel,
        group,
        screen,
        uniforms,
        row,
        baseMap: null,
        baseAspect: 1,
        powerStart: Infinity,
        burstUntil: 0,
        nextSwap: 4 + rand() * 8,
        screenW: sw,
        screenH: sh,
      };

      switch (channel.kind) {
        case "video":
          set.baseMap = videoTex;
          set.baseAspect = videoAspect;
          break;
        case "image":
          loadImage(channel.src!, (tex, aspect) => {
            set.baseMap = tex;
            set.baseAspect = aspect;
            applyBase(set);
          });
          break;
        case "card": {
          const t = makeCardTexture(channel);
          ownedTextures.push(t);
          set.baseMap = t;
          set.baseAspect = SCREEN_ASPECT;
          break;
        }
        case "nosignal":
          set.baseMap = noSignal;
          set.baseAspect = SCREEN_ASPECT;
          break;
        case "snow":
          uniforms.noiseMix.value = 1;
          break;
      }
      applyBase(set);
      sets.push(set);
      idx++;
    }
  });

  function applyBase(set: TvSet) {
    const u = set.uniforms;
    u.map.value = set.baseMap;
    u.hasMap.value = set.baseMap ? 1 : 0;
    setCover(u, set.channel.kind === "video" ? videoAspect : set.baseAspect);
  }

  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth) videoAspect = video.videoWidth / video.videoHeight;
    sets.filter((s) => s.channel.kind === "video").forEach(applyBase);
  });

  const wallHeight = ROWS.length * CELL_H;
  const wallWidth = ROWS[0] * CELL_W;
  const hero = sets[HERO_INDEX];
  const screens = sets.map((s) => s.screen);

  // ---------- state ----------
  let progress = 0;
  let identOn = false;
  let active = true;
  let poweredAt = -1;
  let hovered: TvSet | null = null;
  const pointer = new THREE.Vector2(10, 10);
  const parallax = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const clock = new THREE.Clock();
  let frame = 0;

  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const heroCenter = new THREE.Vector3();
  const heroNormal = new THREE.Vector3();

  function resize() {
    const parent = canvas.parentElement!;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    reflector?.getRenderTarget().setSize(Math.round(w * 0.5), Math.round(h * 0.5));
  }

  function cameraFor(p: number, t: number) {
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fitW = (wallWidth * (camera.aspect < 1 ? 1.02 : 1.35)) / 2 / (tan * camera.aspect);
    const fitH = (wallHeight * 1.62) / 2 / tan;
    const dist = Math.max(fitW, fitH);
    const lookY = wallHeight * (camera.aspect < 1 ? 0.38 : 0.44);

    // A: wide establishing shot → B: closer, slightly off-axis
    const a = range(p, 0, 0.5);
    const ea = easeInOut(a);
    const ax = 0;
    const bx = -wallWidth * 0.1;
    tmpPos.set(
      THREE.MathUtils.lerp(ax, bx, ea),
      THREE.MathUtils.lerp(lookY + 0.25, lookY - 0.15, ea),
      THREE.MathUtils.lerp(dist, dist * 0.7, ea),
    );
    tmpLook.set(0, lookY, 0);

    // B → into the hero screen
    const b = easeInOut(range(p, 0.5, 0.9));
    hero.screen.getWorldPosition(heroCenter);
    heroNormal.set(0, 0, 1).applyQuaternion(hero.group.quaternion);
    const coverH = hero.screenH / (2 * tan);
    const coverW = hero.screenW / (2 * tan * camera.aspect);
    const end = Math.min(coverH, coverW) * 0.97;
    const endPos = heroCenter.clone().addScaledVector(heroNormal, end + 0.035);
    tmpPos.lerp(endPos, b);
    tmpLook.lerp(heroCenter, b);

    if (!reducedMotion) {
      const free = 1 - b;
      tmpPos.x += (parallax.x * 0.6 + Math.sin(t * 0.13) * 0.15) * free;
      tmpPos.y += (parallax.y * 0.3 + Math.sin(t * 0.17) * 0.06) * free;
    }
    camera.position.copy(tmpPos);
    camera.lookAt(tmpLook);
    return b;
  }

  function burst(set: TvSet, now: number, length = 0.22) {
    set.burstUntil = now + length;
  }

  function tick() {
    frame = requestAnimationFrame(tick);
    if (!active) return;
    const t = clock.getElapsedTime();
    shared.time.value = t;

    // power-on, one by one
    for (const s of sets) {
      if (s.channel.kind === "dead") continue;
      const p = poweredAt < 0 ? 0 : clamp01((t - s.powerStart) / 0.4);
      s.uniforms.power.value = p;
    }

    // ident sync: one word per row
    const wantIdent = progress > 0.28 && progress < 0.46;
    if (wantIdent !== identOn) {
      identOn = wantIdent;
      for (const s of sets) {
        if (s.channel.kind === "dead") continue;
        burst(s, t, 0.18 + Math.random() * 0.12);
        if (identOn) {
          const word = identTextures[ROWS.length - 1 - s.row];
          s.uniforms.map.value = word;
          s.uniforms.hasMap.value = 1;
          s.uniforms.bars.value = 0;
          setCover(s.uniforms, SCREEN_ASPECT);
        } else {
          s.uniforms.bars.value = s.channel.kind === "bars" ? 1 : 0;
          applyBase(s);
        }
      }
    }

    // the stills flick between pictures every few seconds
    if (!identOn && !reducedMotion && poweredAt >= 0) {
      for (const s of sets) {
        if (s.channel.kind !== "image" || s === hovered) continue;
        if (t > s.nextSwap) {
          s.nextSwap = t + 5 + Math.random() * 7;
          burst(s, t);
          const src = IMAGE_POOL[Math.floor(Math.random() * IMAGE_POOL.length)];
          const target = Math.random() > 0.5 ? src : s.channel.src!;
          loadImage(target, (tex, aspect) => {
            if (identOn) return;
            s.uniforms.map.value = tex;
            s.uniforms.hasMap.value = 1;
            setCover(s.uniforms, aspect);
          });
        }
      }
    }

    for (const s of sets) {
      const snow = s.channel.kind === "snow" ? 1 : 0;
      const bursting = t < s.burstUntil ? 1 : 0;
      s.uniforms.noiseMix.value = Math.max(snow * (identOn ? 0 : 1), bursting * 0.85);
      const target = s === hovered ? 1 : 0;
      s.uniforms.hover.value += (target - s.uniforms.hover.value) * 0.15;
    }

    const fly = cameraFor(progress, t);

    // hover picking (only on the wall, not mid-flight)
    if (fly < 0.15 && pointer.x <= 1) {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(screens, false)[0];
      const next = hit ? sets[hit.object.userData.index as number] : null;
      if (next !== hovered) {
        if (next && next.channel.kind === "image" && next.channel.src) {
          loadImage(next.channel.src, (tex, aspect) => {
            if (hovered !== next || identOn) return;
            next.uniforms.map.value = tex;
            setCover(next.uniforms, aspect);
          });
        }
        if (next) burst(next, t, 0.12);
        hovered = next;
        canvas.style.cursor = next?.channel.href ? "pointer" : "default";
        onHover(next ? next.channel : null);
      }
    } else if (hovered) {
      hovered = null;
      canvas.style.cursor = "default";
      onHover(null);
    }

    renderer.render(scene, camera);
  }

  // ---------- input ----------
  const onPointerMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    parallax.set(pointer.x, pointer.y);
  };
  const onPointerLeave = () => pointer.set(10, 10);
  const onClick = (e: MouseEvent) => {
    onPointerMove(e as PointerEvent);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(screens, false)[0];
    if (!hit) return;
    const set = sets[hit.object.userData.index as number];
    // first tap on touch only previews
    if (e instanceof PointerEvent && e.pointerType === "touch" && hovered !== set) return;
    onSelect(set.channel);
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("click", onClick);

  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement!);
  resize();
  tick();

  return {
    setProgress(p) {
      progress = p;
    },
    setMono(m) {
      shared.mono.value = m ? 1 : 0;
    },
    setActive(a) {
      active = a;
      if (a) video.play().catch(() => undefined);
      else video.pause();
    },
    powerOn() {
      if (poweredAt >= 0) return;
      const t = clock.getElapsedTime();
      poweredAt = t;
      const order = sets.map((_, i) => i).sort(() => Math.random() - 0.5);
      order.forEach((setIndex, k) => {
        sets[setIndex].powerStart = t + (reducedMotion ? 0 : k * 0.085);
      });
      hero.powerStart = t; // the hero set comes on first
    },
    dispose() {
      cancelAnimationFrame(frame);
      ro.disconnect();
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("click", onClick);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
      ownedTextures.forEach((t) => t.dispose());
      imageCache.forEach(({ tex }) => tex.dispose());
      videoTex.dispose();
      reflector?.dispose();
      renderer.dispose();
    },
  };
}

export { VIDEO_SRC };
