import { gsap } from "gsap";

function animateHeroIn() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.to("#hero-greeting", { opacity: 1, y: 0, duration: 0.7, delay: 0.1 })
    .to("#hero-name", { opacity: 1, y: 0, duration: 0.8 }, "-=0.4")
    .to("#hero-title", { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
    .to("#hero-subtitle", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
    .to("#hero-ctas", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
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
