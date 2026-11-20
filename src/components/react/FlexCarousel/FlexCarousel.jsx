import { useCallback, useEffect, useRef, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { Renderer, Program, Mesh, Triangle, Plane, Texture, RenderTarget } from 'ogl';
import { Lens } from '../../ui/lens';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { PinchZoomImage } from '../../ui/PinchZoomImage';
import { globalEvents, EVENTS } from '../../../lib/events';

import './FlexCarousel.css';

const DEFAULT_ITEMS = [];

const GalleryModal = memo(({ previewItem, isClosing, handleClose }) => {
  const [hovering, setHovering] = useState(false);
  const closeButtonRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 100);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [handleClose]);

  const safeHandleClose = useCallback(() => {
    if (Date.now() - mountTimeRef.current > 300) {
      handleClose();
    }
  }, [handleClose]);

  if (!previewItem) return null;

  return (
    <div
      className={`gallery-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={safeHandleClose}
      onTouchEnd={e => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          safeHandleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={previewItem.title || previewItem.alt || 'Gallery image preview'}
    >
      <button
        ref={closeButtonRef}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-6 focus-visible:right-6 focus-visible:w-14 focus-visible:h-14 focus-visible:bg-red-500 focus-visible:text-white focus-visible:rounded-full focus-visible:flex focus-visible:items-center focus-visible:justify-center focus-visible:z-50 focus-visible:text-2xl"
        onClick={handleClose}
        onTouchEnd={e => {
          e.preventDefault();
          handleClose();
        }}
        aria-label="Close gallery preview"
      >
        &times;
      </button>
      <div
        className={`gallery-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
      >
        <PinchZoomImage>
          <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
            <ImageWithSkeleton
              src={previewItem.src}
              alt={previewItem.alt || previewItem.title || 'Gallery detailed preview'}
              className="gallery-modal-image"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </Lens>
        </PinchZoomImage>
      </div>
    </div>
  );
});

GalleryModal.displayName = 'GalleryModal';

const BEND_PRESETS = {
  liquid: {
    lensWidth: 0.74,
    lensHeight: 1.18,
    tilt: 62,
    roundness: 1,
    bend: 0.34,
    reach: 0.38,
    curl: 'twist',
    dispersion: 0.45,
    liquid: 0,
    followCursor: false
  },
  ribbon: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.34,
    reach: 0.34,
    curl: 'twist',
    dispersion: 0.4,
    liquid: 0,
    followCursor: false
  },
  vortex: {
    lensWidth: 0.7,
    lensHeight: 0.95,
    tilt: 30,
    roundness: 1,
    bend: 0.46,
    reach: 0.3,
    curl: 'twist',
    dispersion: 0.5,
    liquid: 0,
    followCursor: false
  },
  arch: {
    lensWidth: 0.8,
    lensHeight: 0.8,
    tilt: 0,
    roundness: 1,
    bend: 0.3,
    reach: 0.36,
    curl: 'rise',
    dispersion: 0.4,
    liquid: 0,
    followCursor: false
  }
};

const FIT_ASPECT = { portrait: 0.75, square: 1, landscape: 4 / 3 };
const TAPS = 12;
const PIXEL_BUDGET = 4.5e6;
const MAX_TEXTURE_SIZE = 1024;
const INTRO_DURATION = { rise: 2.1, bloom: 1.6, spin: 2.2, deal: 1.5, fade: 0.35 };

const wrap = (value, size) => ((((value + size / 2) % size) + size) % size) - size / 2;
const clamp01 = value => Math.min(Math.max(value, 0), 1);
const easeOut = value => 1 - Math.pow(1 - clamp01(value), 3);
const easeOutQuint = value => 1 - Math.pow(1 - clamp01(value), 5);
const easeInOut = value => {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const cardVertex = `#version 300 es
in vec3 position;
in vec2 uv;
uniform vec4 uRect;
uniform vec2 uResolution;
out vec2 vUv;
out vec2 vLocal;
void main() {
  vUv = uv;
  vLocal = vec2(position.x, -position.y) * uRect.zw;
  vec2 px = uRect.xy + vLocal;
  gl_Position = vec4(px.x / uResolution.x * 2.0 - 1.0, 1.0 - px.y / uResolution.y * 2.0, 0.0, 1.0);
}
`;

const cardFragment = `#version 300 es
precision highp float;
uniform sampler2D tMap;
uniform vec2 uSize;
uniform vec2 uImage;
uniform float uRadius;
uniform float uAlpha;
uniform float uReady;
uniform float uShift;
uniform float uDpr;
uniform vec3 uPlaceholder;
in vec2 vUv;
in vec2 vLocal;
out vec4 fragColor;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main() {
  float sd = roundedBox(vLocal, uSize * 0.5, min(uRadius, min(uSize.x, uSize.y) * 0.5));
  float mask = clamp(0.5 - sd * uDpr, 0.0, 1.0);
  vec2 local = vLocal / uSize + 0.5;
  float cardAspect = uSize.x / uSize.y;
  float imageAspect = uImage.x / max(uImage.y, 1.0);
  vec2 scale = imageAspect > cardAspect ? vec2(cardAspect / imageAspect, 1.0) : vec2(1.0, imageAspect / cardAspect);
  scale /= 1.08;
  vec2 uv = vec2(local.x, 1.0 - local.y);
  uv = (uv - 0.5) * scale + 0.5;
  uv.x += uShift * (1.0 - scale.x) * 0.5;
  vec3 image = texture(tMap, uv).rgb;
  vec3 color = mix(uPlaceholder, image, uReady);
  float alpha = mask * uAlpha;
  fragColor = vec4(color * alpha, alpha);
}
`;

const lensVertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const lensFragment = `#version 300 es
precision highp float;
uniform sampler2D tScene;
uniform vec2 uResolution;
uniform float uDpr;
uniform vec2 uCenter;
uniform vec2 uHalf;
uniform float uAngle;
uniform float uExponent;
uniform float uInner;
uniform float uOuter;
uniform float uFlow;
uniform float uCurl;
uniform float uDispersion;
uniform float uStrength;
uniform float uSceneAlpha;
uniform vec2 uSide;
out vec4 fragColor;

void main() {
  vec2 frag = gl_FragCoord.xy / uDpr;
  vec2 uv = frag / uResolution;
  vec2 rel = frag - vec2(uCenter.x, uResolution.y - uCenter.y);
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);
  vec2 k = max(abs(local) / uHalf, vec2(1e-5));
  float nd = pow(pow(k.x, uExponent) + pow(k.y, uExponent), 1.0 / uExponent);
  vec2 grad = pow(k, vec2(uExponent - 1.0)) * sign(local) / uHalf * pow(nd, 1.0 - uExponent);
  float glen = max(length(grad), 1e-6);
  float edge = (nd - 1.0) / glen;
  vec2 outward = grad / glen;
  vec2 normal = vec2(ca * outward.x - sa * outward.y, sa * outward.x + ca * outward.y);
  vec2 along = vec2(-normal.y, normal.x);

  float t = clamp((edge + uInner) / (uInner + uOuter), 0.0, 1.0);
  float ramp = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  float slope = 16.0 * t * t * (1.0 - t) * (1.0 - t);
  float reachX = rel.x / (uResolution.x * 0.5);
  float side = smoothstep(uSide.x, uSide.y, abs(reachX)) * (uCurl == 0.0 ? sign(reachX) : uCurl);
  float lift = ramp * side * uFlow * uStrength;
  vec2 swirl = along * along.y * side * slope * uFlow * uStrength * 0.35;
  vec2 drift = vec2(0.0, -lift) - swirl;
  vec2 shifted = uv + drift / uResolution;

  vec2 texels = uResolution * uDpr;
  vec2 gx = dFdx(shifted);
  vec2 gy = dFdy(shifted);
  gx *= min(1.0, 3.0 / max(length(gx * texels), 1e-4));
  gy *= min(1.0, 3.0 / max(length(gy * texels), 1e-4));

  vec4 color = textureGrad(tScene, shifted, gx, gy);
  vec2 spread = vec2(0.0, side * slope * uFlow * uStrength) / uResolution * uDispersion;
  float spreadPx = length(spread * texels);
  if (color.a > 0.002 && spreadPx > 0.25) {
    vec3 base = color.rgb / color.a;
    vec3 sumColor = vec3(0.0);
    vec3 sumWeight = vec3(0.0);
    for (int i = 0; i < ${TAPS}; i++) {
      float s = (float(i) + 0.5) / float(${TAPS});
      vec4 c = textureGrad(tScene, shifted + spread * (s - 0.5), gx, gy);
      vec3 w = max(1.0 - abs(vec3(s) - vec3(0.15, 0.5, 0.85)) * 2.6, 0.0) * c.a;
      sumColor += c.rgb * (w / max(c.a, 0.002));
      sumWeight += w;
    }
    vec3 split = mix(base, sumColor / max(sumWeight, vec3(1e-4)), clamp(sumWeight * 2.0, 0.0, 1.0));
    color.rgb = mix(color.rgb, clamp(split, 0.0, 1.0) * color.a, smoothstep(0.25, 1.5, spreadPx));
  }

  fragColor = color * uSceneAlpha;
}
`;

const REEL_DIGITS = '0123456789'.split('').map(n => <span key={n}>{n}</span>);

const Digits = ({ value }) => (
  <span className="flex-carousel__digits">
    {String(value)
      .padStart(2, '0')
      .split('')
      .map((digit, index) => (
        <span key={index} className="flex-carousel__digit">
          <span className="flex-carousel__reel" style={{ transform: `translateY(${-Number(digit) * 10}%)` }}>
            {REEL_DIGITS}
          </span>
        </span>
      ))}
  </span>
);

const FlexCarousel = ({
  items = DEFAULT_ITEMS,
  preset = 'liquid',
  intro = 'rise',
  cardHeight = 0.5,
  gap = 12,
  radius = 0,
  fit = 'natural',
  lensWidth,
  lensHeight,
  tilt,
  roundness,
  bend,
  reach,
  curl,
  dispersion,
  liquid,
  followCursor,
  squeeze = 0.2,
  focusOnClick = true,
  autoplay = false,
  interval = 4,
  captions = true,
  captureWheel = false,
  onChange,
  onSelect,
  className = '',
  style
}) => {
  const containerRef = useRef(null);
  const settingsRef = useRef(null);
  const itemsRef = useRef(items);
  const engineRef = useRef(null);
  const callbacksRef = useRef({ onChange, onSelect });
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const closeTimeoutRef = useRef(null);

  const base = BEND_PRESETS[preset] || BEND_PRESETS.liquid;
  const pick = (value, key) => (value === undefined || value === null ? base[key] : value);

  const list = items && items.length ? items : DEFAULT_ITEMS;
  const itemsKey = list.map(item => item.src).join('|');

  useEffect(() => {
    setIsClient(true);
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      document.body.style.overflow = '';
      globalEvents.emit(EVENTS.LENIS_START);
    };
  }, []);

  const openPreview = useCallback(item => {
    if (!item) return;
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsClosing(false);
    setPreviewItem(item);
    document.body.style.overflow = 'hidden';
    globalEvents.emit(EVENTS.LENIS_STOP);
  }, []);

  const handleClosePreview = useCallback(e => {
    if (e) e.preventDefault();
    setIsClosing(true);
    document.body.style.overflow = '';
    globalEvents.emit(EVENTS.LENIS_START);
    closeTimeoutRef.current = setTimeout(() => {
      setPreviewItem(null);
      setIsClosing(false);
    }, 300);
  }, []);

  useEffect(() => {
    itemsRef.current = list;
    callbacksRef.current = { onChange, onSelect, openPreview };
    settingsRef.current = {
      intro,
      cardHeight,
      gap,
      radius,
      fit,
      lensWidth: pick(lensWidth, 'lensWidth'),
      lensHeight: pick(lensHeight, 'lensHeight'),
      tilt: pick(tilt, 'tilt'),
      roundness: pick(roundness, 'roundness'),
      bend: pick(bend, 'bend'),
      reach: pick(reach, 'reach'),
      curl: pick(curl, 'curl'),
      dispersion: pick(dispersion, 'dispersion'),
      liquid: pick(liquid, 'liquid'),
      followCursor: pick(followCursor, 'followCursor'),
      squeeze,
      focusOnClick,
      autoplay,
      interval,
      captureWheel
    };
    engineRef.current?.wake();
  });

  useEffect(() => {
    engineRef.current?.setItems(itemsRef.current);
  }, [itemsKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 2),
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false
    });
    const gl = renderer.gl;
    if (!renderer.isWebgl2) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return undefined;
    }
    gl.clearColor(0, 0, 0, 0);
    const canvas = gl.canvas;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.setAttribute('aria-hidden', 'true');
    container.prepend(canvas);

    const cardProgram = new Program(gl, {
      vertex: cardVertex,
      fragment: cardFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tMap: { value: new Texture(gl) },
        uRect: { value: [0, 0, 1, 1] },
        uResolution: { value: [1, 1] },
        uSize: { value: [1, 1] },
        uImage: { value: [1, 1] },
        uRadius: { value: 16 },
        uAlpha: { value: 1 },
        uReady: { value: 0 },
        uShift: { value: 0 },
        uDpr: { value: 1 },
        uPlaceholder: { value: [0.5, 0.5, 0.5] }
      }
    });
    cardProgram.setBlendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const cardMesh = new Mesh(gl, { geometry: new Plane(gl), program: cardProgram });

    const target = new RenderTarget(gl, {
      width: 2,
      height: 2,
      depth: false,
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    });

    const lensUniforms = {
      tScene: { value: target.texture },
      uResolution: { value: [1, 1] },
      uDpr: { value: 1 },
      uCenter: { value: [0, 0] },
      uHalf: { value: [1, 1] },
      uAngle: { value: 0 },
      uExponent: { value: 2 },
      uInner: { value: 60 },
      uOuter: { value: 80 },
      uFlow: { value: 0 },
      uCurl: { value: 0 },
      uDispersion: { value: 0 },
      uStrength: { value: 0 },
      uSceneAlpha: { value: 0 },
      uSide: { value: [0.02, 0.3] }
    };
    const lensMesh = new Mesh(gl, {
      geometry: new Triangle(gl),
      program: new Program(gl, {
        vertex: lensVertex,
        fragment: lensFragment,
        uniforms: lensUniforms,
        depthTest: false,
        depthWrite: false
      })
    });

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const anisotropy = renderer.getExtension('EXT_texture_filter_anisotropic') ? 8 : 0;

    let slots = [];
    let width = 1;
    let height = 1;
    let pos = 0;
    let vel = 0;
    let goal = 0;
    let mode = 'spring';
    let wheelAt = 0;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    let alive = true;
    let dirty = true;
    let activeIndex = -1;
    let interactedAt = -Infinity;
    let autoplayAt = performance.now();
    let hasFocus = false;
    let deform = 0;
    let deformVel = 0;
    let layout = null;
    let resnap = false;
    let hover = '';
    let halfPct = '';
    let energy = 0;
    let lastPos = 0;
    let pendingSelect = -1;
    let uploadQueue = [];
    const lens = { x: 0, y: 0, vx: 0, vy: 0, ready: false };
    const pointer = {
      x: 0,
      y: 0,
      over: false,
      down: false,
      id: -1,
      startX: 0,
      startY: 0,
      startPos: 0,
      dragging: false,
      touch: false,
      samples: []
    };
    const introState = { kind: 'none', t: 0, running: false, done: false, readyAt: 0 };
    let instances = [];

    const findHit = (x, y) => {
      for (let i = instances.length - 1; i >= 0; i--) {
        const inst = instances[i];
        if (x >= inst.x0 && x <= inst.x1 && y >= inst.y0 && y <= inst.y1) return inst;
      }
      return null;
    };

    const createSlot = (item, index, onSettled) => {
      const texture = new Texture(gl, {
        generateMipmaps: true,
        minFilter: gl.LINEAR_MIPMAP_LINEAR,
        magFilter: gl.LINEAR,
        anisotropy
      });
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      const slot = {
        item,
        index,
        texture,
        bitmap: null,
        aspect: 1,
        loaded: false,
        failed: false,
        ready: 0,
        color: [0.14, 0.14, 0.16],
        image: [1, 1],
        load: () => {
          image.onload = () => {
            if (!alive || !slots.includes(slot)) return;
            const finalize = () => {
              if (!alive || !slots.includes(slot)) return;
              const nw = image.naturalWidth || 1;
              const nh = image.naturalHeight || 1;
              slot.image = [nw, nh];
              slot.aspect = nw / nh;
              const maxDim = Math.max(nw, nh);
              if (maxDim > MAX_TEXTURE_SIZE) {
                const scale = MAX_TEXTURE_SIZE / maxDim;
                const tw = Math.max(1, Math.round(nw * scale));
                const th = Math.max(1, Math.round(nh * scale));
                const offscreen = document.createElement('canvas');
                offscreen.width = tw;
                offscreen.height = th;
                const ctx = offscreen.getContext('2d');
                if (ctx) {
                  ctx.drawImage(image, 0, 0, tw, th);
                  slot.bitmap = offscreen;
                } else {
                  slot.bitmap = image;
                }
              } else {
                slot.bitmap = image;
              }
              uploadQueue.push(slot);
              dirty = true;
              start();
              onSettled();
            };
            if (image.decode) {
              image.decode().then(finalize, finalize);
            } else {
              finalize();
            }
          };
          image.onerror = () => {
            if (!alive || !slots.includes(slot)) return;
            slot.failed = true;
            dirty = true;
            start();
            onSettled();
          };
          image.src = item.src;
        },
        dispose: () => {
          image.onload = null;
          image.onerror = null;
          slot.bitmap = null;
          gl.deleteTexture(texture.texture);
        }
      };
      return slot;
    };

    const setItems = next => {
      slots.forEach(slot => slot.dispose());
      uploadQueue = [];
      const total = next.length;
      const priorityOrder = [];
      if (total > 0) {
        priorityOrder.push(0);
        for (let stepOffset = 1; priorityOrder.length < total; stepOffset++) {
          const right = stepOffset % total;
          if (!priorityOrder.includes(right)) priorityOrder.push(right);
          const left = (total - (stepOffset % total)) % total;
          if (!priorityOrder.includes(left)) priorityOrder.push(left);
        }
      }
      let cursor = 0;
      const pump = () => {
        if (!alive || cursor >= priorityOrder.length) return;
        const nextIdx = priorityOrder[cursor++];
        if (slots[nextIdx]) slots[nextIdx].load();
      };
      slots = next.map((item, idx) => createSlot(item, idx, pump));
      const initialConcurrency = Math.min(3, priorityOrder.length);
      for (let c = 0; c < initialConcurrency; c++) pump();
      activeIndex = -1;
      layout = null;
      resnap = true;
      pendingSelect = -1;
      introState.running = false;
      introState.done = false;
      introState.t = 0;
      introState.readyAt = performance.now();
      setIsReady(false);
      setRevealed(false);
      dirty = true;
      start();
    };

    const metrics = s => {
      const isMobile = width < 768;
      const cardH = Math.max(24, isMobile ? Math.min(s.cardHeight * height, width * 0.52) : s.cardHeight * height);
      const fixed = FIT_ASPECT[s.fit];
      const widths = slots.map(slot => (fixed || slot.aspect) * cardH);
      const centers = [];
      let cursor = 0;
      for (let i = 0; i < widths.length; i++) {
        centers.push(cursor + widths[i] / 2);
        cursor += widths[i] + s.gap;
      }
      return { cardH, widths, centers, gap: s.gap, loop: Math.max(cursor, 1) };
    };

    const nearest = (m, at) => {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < m.centers.length; i++) {
        const dist = Math.abs(wrap(m.centers[i] - at, m.loop));
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      return best;
    };

    const snapPoint = (m, at) => {
      const i = nearest(m, at);
      return at + wrap(m.centers[i] - at, m.loop);
    };

    const remap = (from, to, at) => {
      const i = nearest(from, at);
      const offset = wrap(at - from.centers[i], from.loop);
      const cycles = Math.round((at - offset - from.centers[i]) / from.loop);
      return cycles * to.loop + to.centers[i] + offset * (to.widths[i] / from.widths[i]);
    };

    const step = (m, delta) => {
      let at = snapPoint(m, goal);
      let index = nearest(m, at);
      const n = m.centers.length;
      for (let k = 0; k < Math.abs(delta); k++) {
        const next = (index + (delta > 0 ? 1 : n - 1)) % n;
        const distance =
          delta > 0
            ? m.widths[index] / 2 + m.gap + m.widths[next] / 2
            : -(m.widths[next] / 2 + m.gap + m.widths[index] / 2);
        at += distance;
        index = next;
      }
      goal = at;
      mode = 'spring';
      dirty = true;
      start();
    };

    const goTo = (m, index) => {
      const i = ((index % m.centers.length) + m.centers.length) % m.centers.length;
      goal = goal + wrap(m.centers[i] - goal, m.loop);
      mode = 'spring';
      dirty = true;
      start();
    };

    const skipIntro = () => {
      if (introState.running) introState.t = 1;
    };

    const introEffects = () => {
      const t = introState.running ? introState.t : introState.done ? 1 : 0;
      const e = { sceneAlpha: 1, strength: 1, card: null };
      if (!introState.done && !introState.running) {
        e.sceneAlpha = 0;
        e.strength = 0;
        return e;
      }
      if (t >= 1) return e;
      const kind = introState.kind;
      if (kind === 'rise') {
        e.strength = easeInOut((t - 0.3) / 0.65);
        e.card = rel => {
          const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.34;
          const local = clamp01((t - delay) / 0.6);
          return {
            alpha: clamp01(local * 4),
            x: 0,
            y: (1 - easeOutQuint(local)) * height * 0.62,
            scale: 0.5 + 0.5 * easeInOut((local - 0.18) / 0.82)
          };
        };
      } else if (kind === 'bloom') {
        e.strength = easeInOut((t - 0.2) / 0.8);
        e.card = rel => {
          const delay = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.25;
          const local = easeOut((t - delay) / 0.55);
          return { alpha: local, x: 0, y: 0, scale: 0.92 + 0.08 * local };
        };
      } else if (kind === 'spin') {
        e.sceneAlpha = easeOut(t / 0.25);
        e.strength = easeOut((t - 0.55) / 0.45);
      } else if (kind === 'deal') {
        e.strength = easeOut((t - 0.45) / 0.5);
        e.card = rel => {
          const spread = Math.min(Math.abs(rel) / (width * 0.6), 1) * 0.3;
          const local = easeOut((t - 0.12 - spread) / 0.5);
          return { alpha: easeOut((t - spread) / 0.12), x: -rel * (1 - local), y: 0, scale: 1 };
        };
      } else {
        e.sceneAlpha = easeOut(t);
        e.strength = easeOut(t);
      }
      return e;
    };

    const beginIntro = (s, m) => {
      const kind = reducedMotion && s.intro !== 'none' ? 'fade' : s.intro;
      introState.kind = INTRO_DURATION[kind] ? kind : 'none';
      introState.running = introState.kind !== 'none';
      introState.done = !introState.running;
      introState.t = 0;
      setIsReady(true);
      if (introState.done) setRevealed(true);
      if (introState.kind === 'spin') {
        const distance = m.loop * 1.6 + width;
        pos = goal + distance;
        vel = -distance * 3;
        mode = 'spring';
      }
    };

    let resizePending = false;
    const applyResize = () => {
      width = Math.max(1, container.clientWidth);
      height = Math.max(1, container.clientHeight);
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(PIXEL_BUDGET / (width * height)));
      renderer.setSize(width, height);
      target.setSize(Math.max(2, Math.round(width * renderer.dpr)), Math.max(2, Math.round(height * renderer.dpr)));
      lensUniforms.tScene.value = target.texture;
      dirty = true;
    };

    const resize = () => {
      resizePending = true;
      start();
    };

    const frame = now => {
      raf = 0;
      if (resizePending) {
        resizePending = false;
        applyResize();
      }
      if (!alive) return;
      const s = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      if (!s || !slots.length) {
        if (visible) raf = requestAnimationFrame(frame);
        return;
      }

      const n = slots.length;
      let animating = false;

      if (uploadQueue.length > 0) {
        const nextUpload = uploadQueue.shift();
        if (nextUpload && nextUpload.bitmap && slots.includes(nextUpload)) {
          nextUpload.texture.image = nextUpload.bitmap;
          nextUpload.texture.update();
          nextUpload.bitmap = null;
          nextUpload.loaded = true;
          nextUpload.ready = 1;
          dirty = true;
        }
        if (uploadQueue.length > 0) animating = true;
      }

      const m = metrics(s);
      if (resnap) {
        goal = snapPoint(m, goal);
        pos = goal;
        vel = 0;
        resnap = false;
      } else if (layout && layout.loop !== m.loop) {
        pos = remap(layout, m, pos);
        goal = remap(layout, m, goal);
        pointer.startPos = pos + (pointer.x - pointer.startX);
        animating = true;
      }
      layout = m;

      if (!introState.running && !introState.done) {
        const allSettled = uploadQueue.length === 0 && slots.every(slot => slot.loaded || slot.failed);
        if ((!allSettled && now - introState.readyAt <= 4000) || !visible) {
          if (uploadQueue.length > 0) raf = requestAnimationFrame(frame);
          return;
        }
        goal = snapPoint(m, goal);
        pos = goal;
        beginIntro(s, m);
        dirty = true;
      }
      if (introState.running) {
        introState.t = Math.min(1, introState.t + dt / (INTRO_DURATION[introState.kind] || 1));
        if (introState.t >= 1) {
          introState.running = false;
          introState.done = true;
          setRevealed(true);
        }
        animating = true;
      }

      if (mode === 'wheel' && now - wheelAt > 150) {
        goal = snapPoint(m, goal);
        mode = 'spring';
      }
      if (!pointer.dragging) {
        const spinning = introState.running && introState.kind === 'spin';
        const stiffness = spinning ? 9 : mode === 'wheel' ? 80 : 55;
        const damping = 2 * Math.sqrt(stiffness);
        const steps = Math.ceil(dt / (1 / 240));
        const h = dt / steps;
        for (let i = 0; i < steps; i++) {
          const acc = stiffness * (goal - pos) - damping * vel;
          vel += acc * h;
          pos += vel * h;
        }
        if (Math.abs(goal - pos) < 0.05 && Math.abs(vel) < 0.5) {
          pos = goal;
          vel = 0;
        } else {
          animating = true;
        }
      } else {
        animating = true;
      }

      if (Math.abs(pos) > m.loop * 8) {
        const shift = Math.round(pos / m.loop) * m.loop;
        pos -= shift;
        goal -= shift;
        pointer.startPos -= shift;
      }

      const current = nearest(m, pos);
      if (current !== activeIndex) {
        activeIndex = current;
        setActive(current);
        callbacksRef.current.onChange?.(current, itemsRef.current[current]);
      }

      if (pendingSelect >= 0 && mode === 'spring' && Math.abs(goal - pos) < 1.5 && Math.abs(vel) < 30) {
        const targetIndex = pendingSelect;
        pendingSelect = -1;
        if (current === targetIndex) {
          callbacksRef.current.onSelect?.(current, itemsRef.current[current]);
          callbacksRef.current.openPreview?.(itemsRef.current[current]);
        }
      }

      if (
        s.autoplay &&
        !reducedMotion &&
        introState.done &&
        !pointer.over &&
        !pointer.down &&
        !hasFocus &&
        mode === 'spring' &&
        Math.abs(goal - pos) < 1 &&
        now - interactedAt > 3000 &&
        now - autoplayAt > s.interval * 1000
      ) {
        autoplayAt = now;
        step(m, 1);
      }
      if (s.autoplay && !reducedMotion) animating = true;

      const travel = Math.abs(pos - lastPos) / dt;
      lastPos = pos;
      const energyTarget = reducedMotion ? 0 : Math.min(travel / 2600, 1);
      energy += (energyTarget - energy) * (1 - Math.exp(-dt / (energyTarget > energy ? 0.07 : 0.35)));
      if (energy > 0.001) animating = true;
      const liquidAmount = reducedMotion ? 0 : s.liquid;
      const push = Math.max(-1, Math.min(1, vel / 2200));
      const deformStiffness = 120;
      const deformDamping = 2 * Math.sqrt(deformStiffness) * 0.32;
      deformVel += (deformStiffness * (push - deform) - deformDamping * deformVel) * dt;
      deform += deformVel * dt;
      if (Math.abs(deform) > 0.0005 || Math.abs(deformVel) > 0.005) animating = true;

      const nextHalf = ((m.cardH / Math.max(height, 1)) * 50).toFixed(2);
      if (nextHalf !== halfPct) {
        halfPct = nextHalf;
        container.style.setProperty('--flex-carousel-half', `${halfPct}%`);
      }

      const effects = introEffects();

      const homeX = width / 2;
      const homeY = height / 2;
      const follow = s.followCursor && pointer.over && !pointer.dragging && !pointer.touch;
      const aimX = follow ? pointer.x : homeX;
      const aimY = follow ? pointer.y : homeY;
      if (!lens.ready) {
        lens.x = homeX;
        lens.y = homeY;
        lens.ready = true;
      }
      const lensK = 110;
      const lensC = 2 * Math.sqrt(lensK) * 0.8;
      lens.vx += (lensK * (aimX - lens.x) - lensC * lens.vx) * dt;
      lens.vy += (lensK * (aimY - lens.y) - lensC * lens.vy) * dt;
      lens.x += lens.vx * dt;
      lens.y += lens.vy * dt;
      if (Math.abs(aimX - lens.x) + Math.abs(aimY - lens.y) > 0.2 || Math.abs(lens.vx) + Math.abs(lens.vy) > 0.5)
        animating = true;

      const isMobile = width < 768;
      const cardH = m.cardH;
      const lensBasis = isMobile ? width * 1.35 : width;
      let halfW = (s.lensWidth * lensBasis) / 2;
      let halfH = (s.lensHeight * lensBasis) / 2;
      const squash = Math.abs(deform) * liquidAmount;
      halfW *= 1 + squash * 0.16;
      halfH *= 1 - squash * 0.08;
      const lensX = lens.x - deform * 14 * liquidAmount;

      for (let i = 0; i < n; i++) {
        const slot = slots[i];
        if (slot.loaded && slot.ready < 1) {
          slot.ready = Math.min(1, slot.ready + dt / 0.45);
          animating = true;
        }
      }

      const waiting = !introState.done;
      if (dirty || animating || pointer.dragging) {
        dirty = false;
        instances = [];
        const dpr = renderer.dpr;
        cardProgram.uniforms.uResolution.value = [width, height];
        cardProgram.uniforms.uDpr.value = dpr;
        cardProgram.uniforms.uRadius.value = s.radius;
        const shrink = 1 - clamp01(s.squeeze) * energy;
        const draws = [];
        for (let i = 0; i < n; i++) {
          const w = m.widths[i];
          const baseRel = wrap(m.centers[i] - pos, m.loop);
          for (let k = -3; k <= 3; k++) {
            const rel = baseRel + k * m.loop;
            if (Math.abs(rel) - w / 2 > width + 40) continue;
            const fx = effects.card ? effects.card(rel) : null;
            const x = homeX + rel + (fx ? fx.x : 0);
            const scale = shrink * (fx ? fx.scale : 1);
            const alpha = fx ? fx.alpha : 1;
            const cw = w * scale;
            if (alpha <= 0.001 || x + cw / 2 < -40 || x - cw / 2 > width + 40) continue;
            draws.push({ i, rel, x, y: homeY + (fx ? fx.y : 0), cw, ch: cardH * scale, alpha });
          }
        }
        draws.sort((a, b) => Math.abs(b.rel) - Math.abs(a.rel));
        let first = true;
        for (const draw of draws) {
          const slot = slots[draw.i];
          cardProgram.uniforms.tMap.value = slot.texture;
          cardProgram.uniforms.uRect.value = [draw.x, draw.y, draw.cw + 2, draw.ch + 2];
          cardProgram.uniforms.uSize.value = [draw.cw, draw.ch];
          cardProgram.uniforms.uImage.value = slot.image;
          cardProgram.uniforms.uAlpha.value = draw.alpha;
          cardProgram.uniforms.uReady.value = slot.ready;
          cardProgram.uniforms.uShift.value = reducedMotion ? 0 : Math.max(-1, Math.min(1, draw.rel / (width * 0.75)));
          cardProgram.uniforms.uPlaceholder.value = slot.color;
          renderer.render({ scene: cardMesh, target, clear: first });
          first = false;
          instances.push({
            index: draw.i,
            x0: draw.x - draw.cw / 2,
            x1: draw.x + draw.cw / 2,
            y0: draw.y - draw.ch / 2,
            y1: draw.y + draw.ch / 2
          });
        }
        if (first) {
          renderer.bindFramebuffer(target);
          gl.viewport(0, 0, target.width, target.height);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
        renderer.bindFramebuffer();
        target.texture.bind();

        lensUniforms.uResolution.value = [width, height];
        lensUniforms.uDpr.value = dpr;
        lensUniforms.uCenter.value = [lensX, lens.y];
        lensUniforms.uHalf.value = [Math.max(halfW, 1), Math.max(halfH, 1)];
        lensUniforms.uAngle.value = (s.tilt * Math.PI) / 180;
        lensUniforms.uExponent.value = 2 + Math.pow(1 - clamp01(s.roundness), 1.5) * 10;
        const spanW = Math.max(halfW, 1);
        const spanH = Math.max(halfH, 1);
        const inner = Math.max(4, s.reach * (spanW + spanH) * (isMobile ? 0.32 : 0.5));
        lensUniforms.uInner.value = inner;
        lensUniforms.uOuter.value = inner * 1.6;
        lensUniforms.uFlow.value = s.bend * (spanW + spanH) * (isMobile ? 0.32 : 0.45);
        lensUniforms.uSide.value = isMobile ? [0.48, 0.88] : [0.02, 0.3];
        lensUniforms.uCurl.value = s.curl === 'rise' ? 1 : s.curl === 'fall' ? -1 : 0;
        lensUniforms.uDispersion.value = s.dispersion * 0.12 * (1 + Math.abs(deform) * liquidAmount * 1.2);
        lensUniforms.uStrength.value = effects.strength;
        lensUniforms.uSceneAlpha.value = effects.sceneAlpha;
        renderer.render({ scene: lensMesh });
      }

      let nextHover = '';
      if (pointer.over && !pointer.dragging && introState.done && s.focusOnClick) {
        if (findHit(pointer.x, pointer.y)) nextHover = 'open';
      }
      if (nextHover !== hover) {
        hover = nextHover;
        if (hover) container.setAttribute('data-hover', hover);
        else container.removeAttribute('data-hover');
      }

      if (visible && (animating || waiting || dirty || pointer.down)) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || (!visible && uploadQueue.length === 0) || !alive) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    const localPoint = e => {
      const rect = container.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onPointerDown = e => {
      if (e.button !== undefined && e.button > 0) return;
      skipIntro();
      pendingSelect = -1;
      const [x, y] = localPoint(e);
      pointer.down = true;
      pointer.id = e.pointerId;
      pointer.touch = e.pointerType === 'touch';
      pointer.startX = x;
      pointer.startY = y;
      pointer.x = x;
      pointer.y = y;
      pointer.startPos = pos;
      pointer.dragging = false;
      pointer.samples = [{ x, t: performance.now() }];
      interactedAt = performance.now();
      if (Math.abs(vel) > 40) {
        goal = pos;
        vel = 0;
      }
      dirty = true;
      start();
    };

    const onPointerMove = e => {
      const [x, y] = localPoint(e);
      pointer.x = x;
      pointer.y = y;
      pointer.over = true;
      if (pointer.down && e.pointerId === pointer.id) {
        const dx = x - pointer.startX;
        const dy = y - pointer.startY;
        const slop = pointer.touch ? 10 : 5;
        if (!pointer.dragging) {
          if (pointer.touch && Math.abs(dy) > slop && Math.abs(dy) >= Math.abs(dx)) {
            pointer.down = false;
            return;
          }
          if (Math.abs(dx) > slop && (!pointer.touch || Math.abs(dx) > Math.abs(dy) * 1.2)) {
            pointer.dragging = true;
            pointer.startX = x;
            pointer.startPos = pos;
            pendingSelect = -1;
            try {
              container.setPointerCapture(e.pointerId);
            } catch {
              pointer.dragging = true;
            }
            container.setAttribute('data-dragging', '');
          }
        }
        if (pointer.dragging) {
          pos = pointer.startPos - (x - pointer.startX);
          goal = pos;
          vel = 0;
          const now = performance.now();
          pointer.samples.push({ x, t: now });
          while (pointer.samples.length > 2 && now - pointer.samples[0].t > 100) pointer.samples.shift();
        }
      }
      dirty = true;
      start();
    };

    const onPointerUp = e => {
      if (!pointer.down || e.pointerId !== pointer.id) return;
      pointer.down = false;
      container.removeAttribute('data-dragging');
      const s = settingsRef.current;
      if (!s) return;
      const m = metrics(s);
      interactedAt = performance.now();
      if (pointer.dragging) {
        pointer.dragging = false;
        const now = performance.now();
        const first = pointer.samples[0];
        const lastSample = pointer.samples[pointer.samples.length - 1];
        let velocity = 0;
        if (first && lastSample && lastSample.t > first.t && now - lastSample.t < 70) {
          velocity = -((lastSample.x - first.x) / (lastSample.t - first.t)) * 1000;
        }
        vel = velocity;
        const landing = snapPoint(m, pos + velocity * 0.32);
        goal = landing;
        if (Math.abs(velocity) > 400 && Math.abs(landing - pos) < 1) step(m, velocity > 0 ? 1 : -1);
        mode = 'spring';
        start();
        return;
      }
      const [x, y] = localPoint(e);
      const hit = findHit(x, y);
      if (!hit) return;
      if (hit.index === activeIndex && Math.abs(goal - pos) < 16) {
        callbacksRef.current.onSelect?.(hit.index, itemsRef.current[hit.index]);
        if (s.focusOnClick) callbacksRef.current.openPreview?.(itemsRef.current[hit.index]);
      } else {
        const rel = (hit.x0 + hit.x1) / 2 - width / 2;
        goal = snapPoint(m, pos + rel);
        mode = 'spring';
        if (s.focusOnClick) pendingSelect = hit.index;
        start();
      }
    };

    const onPointerLeave = () => {
      pointer.over = false;
      dirty = true;
      start();
    };

    const onPointerCancel = () => {
      pointer.down = false;
      pointer.dragging = false;
      container.removeAttribute('data-dragging');
      const s = settingsRef.current;
      if (!s) return;
      goal = snapPoint(metrics(s), pos);
      mode = 'spring';
      start();
    };

    const onWheel = e => {
      const s = settingsRef.current;
      if (!s || e.ctrlKey) return;
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.shiftKey && Math.abs(dx) < Math.abs(dy)) {
        dx = dy;
        dy = 0;
      }
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height : 1;
      const horizontal = Math.abs(dx) > Math.abs(dy);
      if (!horizontal && !s.captureWheel) return;
      e.preventDefault();
      skipIntro();
      pendingSelect = -1;
      interactedAt = performance.now();
      const delta = Math.max(-120, Math.min(120, (horizontal ? dx : dy) * unit));
      goal += delta * 1.25;
      mode = 'wheel';
      wheelAt = performance.now();
      start();
    };

    const onKeyDown = e => {
      const s = settingsRef.current;
      if (!s) return;
      const m = metrics(s);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        skipIntro();
        pendingSelect = -1;
        interactedAt = performance.now();
        step(m, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        skipIntro();
        pendingSelect = -1;
        interactedAt = performance.now();
        step(m, -1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        pendingSelect = -1;
        goTo(m, 0);
      } else if (e.key === 'End') {
        e.preventDefault();
        pendingSelect = -1;
        goTo(m, slots.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeIndex < 0) return;
        callbacksRef.current.onSelect?.(activeIndex, itemsRef.current[activeIndex]);
        if (s.focusOnClick) callbacksRef.current.openPreview?.(itemsRef.current[activeIndex]);
      }
    };

    const onFocus = () => {
      hasFocus = true;
    };
    const onBlur = () => {
      hasFocus = false;
    };
    const onVisibility = () => {
      if (!document.hidden) start();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerup', onPointerUp);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointercancel', onPointerCancel);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('keydown', onKeyDown);
    container.addEventListener('focus', onFocus);
    container.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) dirty = true;
      start();
    });
    intersectionObserver.observe(container);

    engineRef.current = {
      wake: () => {
        dirty = true;
        start();
      },
      setItems
    };

    resize();
    setItems(itemsRef.current);

    return () => {
      alive = false;
      visible = false;
      engineRef.current = null;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointercancel', onPointerCancel);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('keydown', onKeyDown);
      container.removeEventListener('focus', onFocus);
      container.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      slots.forEach(slot => slot.dispose());
      slots = [];
      uploadQueue = [];
      if (target.texture?.texture) gl.deleteTexture(target.texture.texture);
      if (target.buffer) gl.deleteFramebuffer(target.buffer);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };
  }, []);

  const current = list[active] || list[0];
  const label = current ? current.title || current.alt || `Image ${active + 1}` : '';
  const loaderLabel = typeof document !== 'undefined' && document.documentElement.lang === 'id' ? 'Memuat' : 'Loading';

  return (
    <>
      <div
        ref={containerRef}
        className={`flex-carousel ${className}`.trim()}
        style={{ ...style, '--flex-carousel-half': `${Math.min(Math.max(cardHeight, 0.05), 1) * 50}%` }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Image carousel"
        tabIndex={0}
        data-lenis-prevent-horizontal=""
        data-lenis-prevent-wheel={captureWheel ? '' : undefined}
      >
        {!isReady && (
          <div className="flex-carousel__loader" aria-hidden="true">
            <svg className="flex-carousel__spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="flex-carousel__spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path
                className="flex-carousel__spinner-head"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="flex-carousel__loader-text">{loaderLabel}</span>
          </div>
        )}
        {captions && current && revealed && (
          <div className="flex-carousel__caption" aria-hidden="true">
            <span key={active} className="flex-carousel__title">
              {current.title || current.alt}
              {current.subtitle && <span className="flex-carousel__subtitle">{current.subtitle}</span>}
            </span>
            <span className="flex-carousel__count">
              <Digits value={active + 1} />
              <span className="flex-carousel__slash">/</span>
              <span>{String(list.length).padStart(2, '0')}</span>
            </span>
          </div>
        )}
        <div className="flex-carousel__live" aria-live="polite" aria-atomic="true">
          {`${label}, ${active + 1} of ${list.length}`}
        </div>
      </div>
      {isClient &&
        previewItem &&
        createPortal(
          <GalleryModal previewItem={previewItem} isClosing={isClosing} handleClose={handleClosePreview} />,
          document.body
        )}
    </>
  );
};

export default FlexCarousel;
