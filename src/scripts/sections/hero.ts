import { gsap } from "gsap";

function animateHeroIn() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.to("#hero-greeting", { opacity: 1, y: 0, duration: 0.7, delay: 0.1 })
    .to("#hero-name", { opacity: 1, y: 0, duration: 0.8 }, "-=0.4")
    .to("#hero-title", { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
    .to("#hero-subtitle", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
    .to("#hero-ctas", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
    .fromTo("#hero-scroll-hint", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, "-=0.2");
}

window.addEventListener("preloader-done", animateHeroIn, { once: true });
document.addEventListener("preloader-done", animateHeroIn, { once: true });

import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

function initHeroScrollFade() {
  const heroContent = document.getElementById("hero-content-wrapper");
  const heroOverlay = document.getElementById("hero-fade-overlay");
  const scrollHint = document.getElementById("hero-scroll-hint");

  if (!heroContent || !heroOverlay) return;

  const mm = gsap.matchMedia();

  mm.add("(max-width: 1440px)", () => {
    gsap.to([heroContent, heroOverlay], {
      autoAlpha: 0,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: 250,
        scrub: 0.5,
      },
    });

    // Fade out scroll hint
    if (scrollHint) {
      gsap.to(scrollHint, {
        autoAlpha: 0,
        ease: "none",
        scrollTrigger: {
          trigger: document.body,
          start: "10px top",
          end: 250,
          scrub: 0.5,
        },
      });
    }
  });
}

initHeroScrollFade();

(function initCtaEnhancement() {
  const btn = document.getElementById("hero-cta-primary") as HTMLAnchorElement | null;
  if (!btn) return;

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function smoothScrollTo(targetY: number, duration: number): void {
    const startY = window.scrollY;
    const distance = targetY - startY;
    const startTime = performance.now();

    function step(now: number): void {
      const progress = Math.min((now - startTime) / duration, 1);
      window.scrollTo(0, startY + distance * easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  btn.addEventListener(
    "click",
    (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();

      const href = btn.getAttribute("href") ?? "";
      const hash = href.includes("#") ? "#" + href.split("#")[1] : "";
      if (!hash) return;

      const target = document.getElementById(hash.slice(1));
      if (!target) return;

      const targetY = target.getBoundingClientRect().top + window.scrollY - 80;
      smoothScrollTo(targetY, 4000);
    },
    { capture: true }
  );

  if (window.matchMedia("(pointer: coarse)").matches) {
    let pulsed = false;

    function pulseCtaBtn() {
      if (pulsed) return;
      pulsed = true;

      setTimeout(() => {
        btn!.classList.add("cta-touch-ready");
      }, 1800);
    }

    window.addEventListener("canvas-enhanced", pulseCtaBtn, { once: true });

    const failsafeId = setTimeout(pulseCtaBtn, 10000);
    window.addEventListener("canvas-enhanced", () => clearTimeout(failsafeId), { once: true });
  }
})();
