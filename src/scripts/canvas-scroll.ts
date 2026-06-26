import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.config({ ignoreMobileResize: true });

const FRAME_COUNT = 229;
const FRAME_PATH = '/frame/';
const BATCH_SIZE = 20;

let frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
let currentIndex = 0;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function frameUrl(n: number): string {
  const padded = String(n).padStart(3, '0');
  return `${FRAME_PATH}hero-${padded}.webp`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img);
    img.src = src;
  });
}

function drawFrame(img: HTMLImageElement | null): void {
  if (!img || !img.naturalWidth || !canvas || !ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih);
  const sx = (cw - iw * scale) / 2;
  const sy = (ch - ih * scale) * 0.15;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, iw * scale, ih * scale);
}

function resizeCanvas(): void {
  if (!canvas) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const maxDpr = isMobile ? 1.25 : 2;
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  if (frames[currentIndex]) {
    drawFrame(frames[currentIndex]);
  }
}

async function initCanvasScroll(): Promise<void> {
  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  const step = isMobile ? 3 : 1;

  canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
  ctx = canvas?.getContext('2d') ?? null;

  const preloader = document.getElementById('preloader');
  const loaderBar = document.getElementById('loader-bar') as HTMLElement | null;
  const loaderAria = document.getElementById('loader-bar-aria');
  const loaderPct = document.getElementById('loader-percent');

  if (!canvas || !ctx) {
    preloader?.classList.add('hidden');
    document.dispatchEvent(new CustomEvent('preloader-done'));
    return;
  }

  if (canvas) {
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(resizeCanvas);
    });
    resizeObserver.observe(canvas);
  }
  resizeCanvas();

  const phraseEl = document.getElementById('loader-phrase');
  let phrases: string[] = [];
  try {
    const raw = preloader?.getAttribute('data-phrases');
    if (raw) phrases = JSON.parse(raw);
  } catch (e) { }

  let currentPhraseIndex = 0;

  function updateProgress(loaded: number, targetLoadCount: number): void {
    const pct = Math.min(100, Math.round((loaded / targetLoadCount) * 100));

    let activePhrase = "";
    if (phrases.length > 0) {
      const phraseIndex = Math.min(
        Math.floor((loaded / targetLoadCount) * phrases.length),
        phrases.length - 1
      );
      activePhrase = phrases[phraseIndex];
    }

    window.dispatchEvent(new CustomEvent('loader-progress', { detail: { pct, phrase: activePhrase } }));

    if (loaderBar) loaderBar.style.width = `${pct}%`;
    if (loaderPct) loaderPct.textContent = `${pct}%`;
    if (loaderAria) loaderAria.setAttribute('aria-valuenow', String(pct));

    if (phrases.length > 0 && phraseEl) {
      const phraseIndex = Math.min(
        Math.floor((loaded / targetLoadCount) * phrases.length),
        phrases.length - 1
      );

      if (phraseIndex !== currentPhraseIndex) {
        currentPhraseIndex = phraseIndex;
        phraseEl.classList.add('fade-out');
        setTimeout(() => {
          phraseEl.textContent = phrases[currentPhraseIndex];
          phraseEl.classList.remove('fade-out');
        }, 300);
      }
    }
  }

  let loadedCount = 0;
  const targetLoadCount = Math.ceil(FRAME_COUNT / step);

  for (let start = 0; start < FRAME_COUNT; start += BATCH_SIZE * step) {
    const end = Math.min(start + BATCH_SIZE * step - 1, FRAME_COUNT - 1);
    const batch: Promise<void>[] = [];

    for (let i = start; i <= end; i += step) {
      const idx = i;
      batch.push(
        loadImage(frameUrl(i)).then(img => {
          frames[idx] = img;
          loadedCount++;
          updateProgress(loadedCount, targetLoadCount);

          if (idx === 0) drawFrame(frames[0]);
        })
      );
    }

    await Promise.all(batch);
  }

  if (frames[0]) drawFrame(frames[0]);

  await new Promise<void>(r => setTimeout(r, 600));
  document.dispatchEvent(new CustomEvent('preloader-done'));

  const driver = document.getElementById('scroll-canvas-driver');
  if (!driver) return;

  ScrollTrigger.create({
    trigger: driver,
    start: 'top top',
    end: 'bottom bottom',
    scrub: isMobile ? 1 : 0.4,
    onUpdate(self) {
      const idx = Math.round(self.progress * (FRAME_COUNT - 1));
      let clamped = Math.max(0, Math.min(idx, FRAME_COUNT - 1));
      
      // Snap to the nearest loaded frame if skipping
      if (isMobile) {
        clamped = Math.round(clamped / step) * step;
      }

      if (clamped !== currentIndex && frames[clamped]) {
        currentIndex = clamped;
        requestAnimationFrame(() => drawFrame(frames[currentIndex]));
      }
    },
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvasScroll);
} else {
  initCanvasScroll();
}
