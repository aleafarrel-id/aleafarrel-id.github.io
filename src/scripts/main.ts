import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { globalEvents, EVENTS } from "../lib/events";

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// --- VH Setup ---
let vh = 0;
let ticking = false;

function setVH() {
  const vp = window.visualViewport;
  const newVH = (vp ? vp.height : window.innerHeight) * 0.01;
  if (Math.abs(newVH - vh) > 0.1) {
    vh = newVH;
    document.documentElement.style.setProperty("--vh", newVH + "px");
    globalEvents.emit(EVENTS.VH_UPDATED);
  }
  ticking = false;
}

function scheduleVH() {
  if (!ticking) {
    ticking = true;
    window.requestAnimationFrame(setVH);
  }
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleVH, { passive: true });
  window.visualViewport.addEventListener("scroll", scheduleVH, { passive: true });
}
window.addEventListener("resize", scheduleVH, { passive: true });
setVH();

// --- Lenis Setup ---
let lenis: Lenis | null = null;

const raf = (time: number) => {
  lenis?.raf(time * 1000);
};

if (!prefersReducedMotion) {
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
}

function initLenis() {
  if (lenis) return;

  lenis = new Lenis({
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction: "vertical",
    gestureDirection: "vertical",
    smooth: true,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
    autoResize: true,
  } as any);

  // @ts-ignore
  window.lenis = lenis;

  if (!prefersReducedMotion) {
    lenis.on("scroll", ScrollTrigger.update);
  }
}

function destroyLenis() {
  if (!lenis) return;
  lenis.destroy();
  lenis = null;
  // @ts-ignore
  window.lenis = null;
}

function checkScreenWidthAndInitialize() {
  if (window.matchMedia("(min-width: 768px)").matches) {
    initLenis();
  } else {
    destroyLenis();
  }
}

checkScreenWidthAndInitialize();
window.addEventListener("resize", checkScreenWidthAndInitialize);

globalEvents.on(EVENTS.LENIS_STOP, () => lenis?.stop());
globalEvents.on(EVENTS.LENIS_START, () => lenis?.start());

// --- Navigation & Menu Setup ---
const nav = document.getElementById("main-nav");
window.addEventListener("scroll", () => {
  nav?.classList.toggle("scrolled", window.scrollY > 60);
}, { passive: true });

const hamburger = document.getElementById("hamburger-btn");
const mobileMenu = document.getElementById("mobile-menu");
const closeBtn = document.getElementById("mobile-menu-close");

function openMenu() {
  mobileMenu?.classList.add("open");
  hamburger?.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  closeBtn?.focus();
}

function closeMenu() {
  mobileMenu?.classList.remove("open");
  hamburger?.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  hamburger?.focus();
}

hamburger?.addEventListener("click", openMenu);
closeBtn?.addEventListener("click", closeMenu);

document.querySelectorAll(".mobile-nav-link").forEach((link) =>
  link.addEventListener("click", closeMenu)
);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// --- Smooth Scroll for Anchor Links ---
document.querySelectorAll('a[href*="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (!href) return;

    const url = new URL(href, window.location.href);
    if (url.pathname === window.location.pathname) {
      const targetId = url.hash;
      if (targetId && targetId !== '#') {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          if (lenis) {
            lenis.scrollTo(targetEl as HTMLElement, { offset: -80, duration: 1.2 });
          } else {
            const top = targetEl.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }
      }
    }
  });
});

// --- Back to Top ---
const backToTopBtn = document.getElementById("back-to-top");
backToTopBtn?.addEventListener("click", () => {
  if (lenis) {
    lenis.scrollTo(0, { duration: 1.2 });
  } else {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
});

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    backToTopBtn?.classList.add("visible");
  } else {
    backToTopBtn?.classList.remove("visible");
  }
}, { passive: true });

// --- Reveal Observer ---
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });

document.querySelectorAll(".reveal").forEach((el) => revealObs.observe(el));

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}
