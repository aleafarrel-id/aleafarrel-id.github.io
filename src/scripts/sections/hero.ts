import { gsap } from "gsap";

function animateHeroIn() {
  const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
  tl.to("#hero-greeting", { opacity: 1, y: 0, duration: 0.7, delay: 0.1 })
    .to("#hero-name", { opacity: 1, y: 0, duration: 0.8 }, "-=0.4")
    .to("#hero-title", { opacity: 1, y: 0, duration: 0.6 }, "-=0.5")
    .to("#hero-subtitle", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4")
    .to("#hero-ctas", { opacity: 1, y: 0, duration: 0.6 }, "-=0.4");
}

// We still listen on window natively to intercept loader events if loader uses window/document
window.addEventListener("preloader-done", animateHeroIn, { once: true });
document.addEventListener("preloader-done", animateHeroIn, { once: true }); // Fallback since loader.tsx might use document

function initHeroScrollFade() {
  const heroContent = document.getElementById("hero-content-wrapper");
  const heroOverlay = document.getElementById("hero-fade-overlay");
  const scrollHint = document.getElementById("hero-scroll-hint");

  if (!heroContent || !heroOverlay) return;

  function updateHeroFade() {
    if (!heroContent || !heroOverlay) return;
    if (window.innerWidth <= 1440) {
      const scrollY = window.scrollY;
      const opacity = Math.max(1 - scrollY / 250, 0);

      heroContent.style.opacity = opacity.toString();
      heroContent.style.pointerEvents = opacity === 0 ? "none" : "auto";

      heroOverlay.style.opacity = opacity.toString();

      if (scrollHint) {
        if (scrollY > 10) {
          scrollHint.style.opacity = opacity.toString();
        } else {
          scrollHint.style.opacity = "";
        }
      }
    } else {
      heroContent.style.opacity = "1";
      heroContent.style.pointerEvents = "auto";
      heroOverlay.style.opacity = "";
      if (scrollHint) scrollHint.style.opacity = "";
    }
  }

  window.addEventListener("scroll", updateHeroFade, { passive: true });
  window.addEventListener("resize", updateHeroFade, { passive: true });
  updateHeroFade();
}

initHeroScrollFade();
