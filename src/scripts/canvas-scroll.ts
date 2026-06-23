/**
 * canvas-scroll.ts
 * ─────────────────────────────────────────────────────────────
 * Preloads all hero WebP frames into memory, then maps the
 * user's scroll position to the correct frame — rendered on a
 * full-screen <canvas> using requestAnimationFrame for 60fps.
 *
 * Fix: frames[] and currentIndex declared at module scope
 * so resizeCanvas() can safely access them on first call.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── CONFIG ────────────────────────────────────────────────────
const FRAME_COUNT = 229;
const FRAME_PATH = '/frame/';
const BATCH_SIZE = 20;

// ─── MODULE-SCOPE STATE (declared before any function uses them) ─
let frames: (HTMLImageElement | null)[] = new Array(FRAME_COUNT).fill(null);
let currentIndex = 0;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// ─── HELPERS ───────────────────────────────────────────────────
function frameUrl(n: number): string {
  const padded = String(n).padStart(3, '0');
  return `${FRAME_PATH}hero-${padded}.webp`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(img); // Don't break loading on missing frames
    img.src = src;
  });
}

// ─── DRAW (safe: checks frames[i] before drawing) ──────────────
function drawFrame(img: HTMLImageElement | null): void {
  if (!img || !img.naturalWidth || !canvas || !ctx) return;

  const cw = canvas.width;
  const ch = canvas.height;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // "cover" scaling — fills canvas, horizontally centered
  const scale = Math.max(cw / iw, ch / ih);
  const sx = (cw - iw * scale) / 2;
  // Geser sedikit ke atas (15% dari sisa ruang) agar tidak terlalu ke bawah, tapi kepala tetap utuh
  const sy = (ch - ih * scale) * 0.15;

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, sx, sy, iw * scale, ih * scale);
}

// ─── RESIZE (safe: frames[] already exists at module scope) ────
function resizeCanvas(): void {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  // Redraw current frame if available
  if (frames[currentIndex]) {
    drawFrame(frames[currentIndex]);
  }
}

// ─── MAIN ──────────────────────────────────────────────────────
async function initCanvasScroll(): Promise<void> {
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

  // ── Attach resize listener AFTER canvas is assigned ──────────
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // ── Setup phrases ──────────────────────────────────────────
  const phraseEl = document.getElementById('loader-phrase');
  let phrases: string[] = [];
  try {
    const raw = preloader?.getAttribute('data-phrases');
    if (raw) phrases = JSON.parse(raw);
  } catch (e) {}
  
  let currentPhraseIndex = 0;

  // ── Progress update ────────────────────────────────────────
  function updateProgress(loaded: number): void {
    const pct = Math.round((loaded / FRAME_COUNT) * 100);
    if (loaderBar) loaderBar.style.width = `${pct}%`;
    if (loaderPct) loaderPct.textContent = `${pct}%`;
    if (loaderAria) loaderAria.setAttribute('aria-valuenow', String(pct));

    if (phrases.length > 0 && phraseEl) {
      const phraseIndex = Math.min(
        Math.floor((loaded / FRAME_COUNT) * phrases.length),
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

  // ── Preload all frames in parallel batches ─────────────────
  let loadedCount = 0;

  for (let start = 0; start < FRAME_COUNT; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, FRAME_COUNT - 1);
    const batch: Promise<void>[] = [];

    for (let i = start; i <= end; i++) {
      const idx = i; // 0-based index into frames[] matches file numbers (0 to 228)
      batch.push(
        loadImage(frameUrl(i)).then(img => {
          frames[idx] = img;
          loadedCount++;
          updateProgress(loadedCount);

          // Draw very first frame as soon as it arrives
          if (idx === 0) drawFrame(frames[0]);
        })
      );
    }

    await Promise.all(batch);
  }

  // ── Draw first frame ───────────────────────────────────────
  if (frames[0]) drawFrame(frames[0]);

  // ── Brief pause so 100% is visible, then hide preloader ───
  await new Promise<void>(r => setTimeout(r, 600));
  preloader?.classList.add('hidden');
  document.dispatchEvent(new CustomEvent('preloader-done'));

  // ── GSAP ScrollTrigger ─────────────────────────────────────
  const driver = document.getElementById('scroll-canvas-driver');
  if (!driver) return;

  ScrollTrigger.create({
    trigger: driver,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.4,
    onUpdate(self) {
      const idx = Math.round(self.progress * (FRAME_COUNT - 1));
      const clamped = Math.max(0, Math.min(idx, FRAME_COUNT - 1));

      if (clamped !== currentIndex) {
        currentIndex = clamped;
        requestAnimationFrame(() => drawFrame(frames[currentIndex]));
      }
    },
  });
}

// ─── INIT ──────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvasScroll);
} else {
  initCanvasScroll();
}
