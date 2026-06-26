import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { globalEvents, EVENTS } from '../lib/events';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export class HeroCanvasSequence {
  private readonly FRAME_COUNT = 229;
  private readonly FRAME_PATH = '/frame/';
  private readonly BATCH_SIZE = 20;

  private frames: (HTMLImageElement | null)[];
  private currentIndex: number = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isMobile: boolean;
  private step: number;
  private phrases: string[] = [];

  constructor() {
    this.frames = new Array(this.FRAME_COUNT).fill(null);
    this.isMobile = typeof window !== 'undefined' && window.matchMedia("(max-width: 768px)").matches;
    this.step = this.isMobile ? 3 : 1;
  }

  public async init(): Promise<void> {
    this.canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
    this.ctx = this.canvas?.getContext('2d') ?? null;

    if (!this.canvas || !this.ctx) {
      globalEvents.emit(EVENTS.PRELOADER_DONE);
      return;
    }

    this.setupResizeObserver();
    this.resizeCanvas();
    this.parsePhrases();

    await this.loadFrames();

    // Ensure the first frame is drawn
    if (this.frames[0]) {
      this.drawFrame(this.frames[0]);
    }

    await new Promise<void>(resolve => setTimeout(resolve, 600));
    globalEvents.emit(EVENTS.PRELOADER_DONE);

    this.setupScrollTrigger();
  }

  private setupResizeObserver(): void {
    if (!this.canvas) return;
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => this.resizeCanvas());
    });
    resizeObserver.observe(this.canvas);
  }

  private frameUrl(n: number): string {
    const padded = String(n).padStart(3, '0');
    return `${this.FRAME_PATH}hero-${padded}.webp`;
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
      img.src = src;
    });
  }

  private drawFrame(img: HTMLImageElement | null): void {
    if (!img || !img.naturalWidth || !this.canvas || !this.ctx) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    const scale = Math.max(cw / iw, ch / ih);
    const sx = (cw - iw * scale) / 2;
    const sy = (ch - ih * scale) * 0.15;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, sx, sy, iw * scale, ih * scale);
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;

    const maxDpr = this.isMobile ? 1.25 : 2;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    if (this.frames[this.currentIndex]) {
      this.drawFrame(this.frames[this.currentIndex]);
    }
  }

  private parsePhrases(): void {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    try {
      const raw = preloader.getAttribute('data-phrases');
      if (raw) this.phrases = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse phrases", e);
    }
  }

  private updateProgress(loaded: number, targetLoadCount: number): void {
    const pct = Math.min(100, Math.round((loaded / targetLoadCount) * 100));
    let activePhrase = "";

    if (this.phrases.length > 0) {
      const phraseIndex = Math.min(
        Math.floor((loaded / targetLoadCount) * this.phrases.length),
        this.phrases.length - 1
      );
      activePhrase = this.phrases[phraseIndex];
    }

    globalEvents.emit(EVENTS.LOADER_PROGRESS, { pct, phrase: activePhrase });
  }

  private async loadFrames(): Promise<void> {
    let loadedCount = 0;
    const targetLoadCount = Math.ceil(this.FRAME_COUNT / this.step);

    for (let start = 0; start < this.FRAME_COUNT; start += this.BATCH_SIZE * this.step) {
      const end = Math.min(start + this.BATCH_SIZE * this.step - 1, this.FRAME_COUNT - 1);
      const batch: Promise<void>[] = [];

      for (let i = start; i <= end; i += this.step) {
        const idx = i;
        batch.push(
          this.loadImage(this.frameUrl(i)).then(img => {
            this.frames[idx] = img;
            loadedCount++;
            this.updateProgress(loadedCount, targetLoadCount);

            if (idx === 0) this.drawFrame(this.frames[0]);
          })
        );
      }

      await Promise.all(batch);
    }
  }

  private setupScrollTrigger(): void {
    const driver = document.getElementById('scroll-canvas-driver');
    if (!driver) return;

    ScrollTrigger.create({
      trigger: driver,
      start: 'top top',
      end: 'bottom bottom',
      scrub: this.isMobile ? 1 : 0.4,
      onUpdate: (self) => {
        const idx = Math.round(self.progress * (this.FRAME_COUNT - 1));
        let clamped = Math.max(0, Math.min(idx, this.FRAME_COUNT - 1));
        
        // Snap to the nearest loaded frame if skipping
        if (this.isMobile) {
          clamped = Math.round(clamped / this.step) * this.step;
        }

        if (clamped !== this.currentIndex && this.frames[clamped]) {
          this.currentIndex = clamped;
          requestAnimationFrame(() => this.drawFrame(this.frames[this.currentIndex]));
        }
      },
    });
  }
}

// Auto initialize if required
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HeroCanvasSequence().init());
  } else {
    new HeroCanvasSequence().init();
  }
}
