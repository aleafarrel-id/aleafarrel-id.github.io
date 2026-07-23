import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { globalEvents, EVENTS } from '../lib/events';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

class HeroCanvasSequence {
  private readonly FRAME_COUNT = 229;
  private readonly FRAME_PATH = '/frame/';

  private frames: (HTMLImageElement | null)[];
  private currentIndex: number = 0;
  private targetIndex: number = 0;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isMobile: boolean;
  private step: number;
  private phrases: string[] = [];
  private uiPill: HTMLElement | null = null;
  private renderPending: boolean = false;
  private isJumping: boolean = false;

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

    // Determine initial scroll frame to prevent jumping on refresh
    const driver = document.getElementById('scroll-canvas-driver');
    let initialFrameIdx = 0;
    if (driver) {
      const scrollY = window.scrollY;
      const driverTop = driver.offsetTop;
      const driverHeight = driver.offsetHeight;
      const winHeight = window.innerHeight;

      if (driverHeight > winHeight) {
        const progress = Math.max(0, Math.min(1, (scrollY - driverTop) / (driverHeight - winHeight)));
        initialFrameIdx = Math.round(progress * (this.FRAME_COUNT - 1));
      }

      if (this.isMobile) {
        initialFrameIdx = Math.round(initialFrameIdx / this.step) * this.step;
      }
    }
    this.currentIndex = initialFrameIdx;
    this.targetIndex = initialFrameIdx;

    this.setupResizeObserver();
    this.resizeCanvas();
    this.parsePhrases();

    await this.loadFrames(initialFrameIdx);

    // Ensure the initial frame is drawn
    if (this.frames[this.currentIndex]) {
      this.drawFrame(this.frames[this.currentIndex]);
    }

    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    globalEvents.emit(EVENTS.PRELOADER_DONE);

    globalEvents.on(EVENTS.NAV_JUMP_START, (detail?: any) => {
      this.isJumping = true;
      if (detail && typeof detail.targetY === 'number') {
        const driver = document.getElementById('scroll-canvas-driver');
        if (driver) {
          const currentY = window.scrollY;
          const isJumpingDown = detail.targetY > currentY;

          const driverTop = driver.offsetTop;
          const driverHeight = driver.offsetHeight;
          const winHeight = window.innerHeight;
          let progress = (detail.targetY - driverTop) / (driverHeight - winHeight);
          progress = Math.max(0, Math.min(1, progress));

          let targetIdx = Math.round(progress * (this.FRAME_COUNT - 1));
          if (this.isMobile) {
            targetIdx = Math.round(targetIdx / this.step) * this.step;
          }

          this.targetIndex = targetIdx;

          if (!isJumpingDown) {
            this.currentIndex = targetIdx;

            if (this.frames[this.currentIndex] && !this.renderPending) {
              this.renderPending = true;
              requestAnimationFrame(() => {
                this.drawFrame(this.frames[this.currentIndex]);
                this.renderPending = false;
              });
            }
          }
        }
      }
    });

    globalEvents.on(EVENTS.NAV_JUMP_END, () => {
      this.isJumping = false;
      this.currentIndex = this.targetIndex;
      if (this.frames[this.currentIndex] && !this.renderPending) {
        this.renderPending = true;
        requestAnimationFrame(() => {
          this.drawFrame(this.frames[this.currentIndex]);
          this.renderPending = false;
        });
      }
    });

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

  private async loadImage(src: string, isInitial: boolean = false): Promise<HTMLImageElement> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(src, {
          priority: isInitial ? 'high' : 'low',
        } as RequestInit);

        if (!response.ok) {
          if (attempt < MAX_RETRIES - 1) {
            await new Promise<void>(r => setTimeout(r, 800 * (attempt + 1)));
            continue;
          }
          return new Image();
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        return new Promise<HTMLImageElement>((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(img);
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(new Image());
          };
          img.src = objectUrl;
        });
      } catch {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise<void>(r => setTimeout(r, 800 * (attempt + 1)));
        }
      }
    }

    return new Image();
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

  private createUIPill() {
    this.uiPill = document.createElement('div');
    Object.assign(this.uiPill.style, {
      position: 'fixed',
      bottom: this.isMobile ? 'auto' : '24px',
      top: this.isMobile ? '80px' : 'auto',
      right: '24px',
      padding: '8px 16px',
      background: 'rgba(20, 20, 20, 0.65)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '24px',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '12px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      opacity: '0',
      transform: this.isMobile ? 'translateY(-10px)' : 'translateY(10px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
      zIndex: '9999',
      pointerEvents: 'none',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
    });

    let enhancingText = "Enhancing...";
    const canvas = document.getElementById('hero-canvas');
    if (canvas) {
      enhancingText = canvas.getAttribute('data-enhance-text') || enhancingText;
    }

    this.uiPill.innerHTML = `
      <div style="width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: canvas-pill-spin 1s linear infinite;"></div>
      <span id="canvas-ui-pill-text" data-base-text="${enhancingText}">${enhancingText}</span>
    `;

    if (!document.getElementById('canvas-pill-styles')) {
      const style = document.createElement('style');
      style.id = 'canvas-pill-styles';
      style.innerHTML = `@keyframes canvas-pill-spin { 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
    document.body.appendChild(this.uiPill);
  }

  private updateUIPill(pct: number) {
    if (!this.uiPill) return;
    const textEl = this.uiPill.querySelector('#canvas-ui-pill-text');
    if (textEl) {
      const baseText = textEl.getAttribute('data-base-text') || "Enhancing...";
      textEl.textContent = `${baseText} ${pct}%`;
    }
  }

  private showUIPill() {
    if (this.uiPill) {
      this.uiPill.style.opacity = '1';
      this.uiPill.style.transform = 'translateY(0)';
    }
  }

  private hideUIPill() {
    if (this.uiPill) {
      this.uiPill.style.opacity = '0';
      this.uiPill.style.transform = this.isMobile ? 'translateY(-10px)' : 'translateY(10px)';
      setTimeout(() => {
        this.uiPill?.remove();
        globalEvents.emit(EVENTS.CANVAS_ENHANCED);
      }, 400);
    } else {
      globalEvents.emit(EVENTS.CANVAS_ENHANCED);
    }
  }

  private async loadFrames(initialIdx: number = 0): Promise<void> {
    const targetLoadCount = Math.ceil(this.FRAME_COUNT / this.step);
    let loadedCount = 0;

    const initialImg = await this.loadImage(this.frameUrl(initialIdx), true);
    this.frames[initialIdx] = initialImg;
    loadedCount++;
    this.updateProgress(loadedCount, targetLoadCount);
    this.drawFrame(this.frames[initialIdx]);

    this.createUIPill();

    setTimeout(() => {
      this.deferBackgroundLoading(initialIdx, loadedCount, targetLoadCount);
    }, 100);
  }

  private deferBackgroundLoading(initialIdx: number, loadedCount: number, targetLoadCount: number): void {
    const isCached = localStorage.getItem('hero_frames_cached') === 'true';
    if (!isCached) this.showUIPill();
    else globalEvents.emit(EVENTS.CANVAS_ENHANCED);

    const doBackgroundLoad = async () => {
      const pendingIndices: number[] = [];
      for (let i = 0; i < this.FRAME_COUNT; i += this.step) {
        if (i !== initialIdx && !this.frames[i]) pendingIndices.push(i);
      }
      const BATCH_SIZE = this.isMobile ? 4 : 8;
      for (let i = 0; i < pendingIndices.length; i += BATCH_SIZE) {
        const batch: Promise<void>[] = [];
        for (let j = 0; j < BATCH_SIZE && (i + j) < pendingIndices.length; j++) {
          const idx = pendingIndices[i + j];
          batch.push(
            this.loadImage(this.frameUrl(idx), false).then(img => {
              this.frames[idx] = img;
              loadedCount++;

              if (idx === this.targetIndex && this.currentIndex !== this.targetIndex) {
                this.currentIndex = this.targetIndex;
                if (!this.renderPending) {
                  this.renderPending = true;
                  requestAnimationFrame(() => {
                    this.drawFrame(this.frames[this.currentIndex]);
                    this.renderPending = false;
                  });
                }
              }

              if (!isCached) {
                const totalPct = Math.min(100, Math.round((loadedCount / targetLoadCount) * 100));
                this.updateUIPill(totalPct);
                this.updateProgress(loadedCount, targetLoadCount);
              }
            })
          );
        }
        await Promise.all(batch);

        await new Promise(resolve => setTimeout(resolve, isCached ? 2 : (this.isMobile ? 50 : 25)));
      }

      if (!isCached) {
        this.hideUIPill();
        localStorage.setItem('hero_frames_cached', 'true');
      }
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => doBackgroundLoad(), { timeout: 2000 });
    } else {
      setTimeout(doBackgroundLoad, 500);
    }
  }

  private setupScrollTrigger(): void {
    const driver = document.getElementById('scroll-canvas-driver');
    if (!driver) return;

    ScrollTrigger.create({
      trigger: driver,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        if (this.isJumping) return;

        const idx = Math.round(self.progress * (this.FRAME_COUNT - 1));
        let clamped = Math.max(0, Math.min(idx, this.FRAME_COUNT - 1));

        if (this.isMobile) {
          clamped = Math.round(clamped / this.step) * this.step;
        }

        this.targetIndex = clamped;

        if (clamped !== this.currentIndex) {
          let renderIdx = clamped;
          if (!this.frames[renderIdx]) {
            let offset = 1;
            while (renderIdx - offset >= 0 || renderIdx + offset < this.FRAME_COUNT) {
              if (renderIdx - offset >= 0 && this.frames[renderIdx - offset]) {
                renderIdx = renderIdx - offset;
                break;
              }
              if (renderIdx + offset < this.FRAME_COUNT && this.frames[renderIdx + offset]) {
                renderIdx = renderIdx + offset;
                break;
              }
              offset++;
            }
          }

          if (renderIdx !== this.currentIndex && this.frames[renderIdx]) {
            this.currentIndex = renderIdx;

            if (!this.renderPending) {
              this.renderPending = true;
              requestAnimationFrame(() => {
                this.drawFrame(this.frames[this.currentIndex]);
                this.renderPending = false;
              });
            }
          }
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
