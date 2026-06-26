import { useLayoutEffect, useRef, useCallback } from 'react';
import './ScrollStack.css';

export const ScrollStackItem = ({ children, itemClassName = '' }) => (
  <div className={`scroll-stack-card ${itemClassName}`.trim()}>{children}</div>
);

const ScrollStack = ({
  children,
  className = '',
  itemDistance = 100,
  stackPosition = '20%',
  useWindowScroll = false,
  onStackComplete
}) => {
  const scrollerRef     = useRef(null);
  const stackCompletedRef = useRef(false);
  const animationFrameRef = useRef(null);
  const cardsRef        = useRef([]);
  const lastTransformsRef = useRef(new Map());

  const cachedOffsetsRef = useRef({
    cardTops: [], endTop: 0, containerH: 0, stackPx: 0, valid: false
  });

  const parsePercentage = useCallback((value, containerHeight) => {
    if (typeof value === 'string' && value.includes('%')) {
      return (parseFloat(value) / 100) * containerHeight;
    }
    return parseFloat(value);
  }, []);

  const recalcOffsets = useCallback(() => {
    const cards = cardsRef.current;
    if (!cards.length) return;

    let containerH, stackPx, cardTops, endTop;

    if (useWindowScroll) {
      containerH = window.innerHeight;
      stackPx    = parsePercentage(stackPosition, containerH);
      const scrollY = window.scrollY;

      cardTops = cards.map((c, i) => {
        const rect = c.getBoundingClientRect();
        const last = lastTransformsRef.current.get(i);
        const currentTy = last ? last.ty : 0;
        return rect.top + scrollY - currentTy;
      });

      const endEl = document.querySelector('.scroll-stack-end');
      endTop = endEl ? endEl.getBoundingClientRect().top + scrollY : 0;
    } else {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      containerH = scroller.clientHeight;
      stackPx    = parsePercentage(stackPosition, containerH);
      cardTops = cards.map(c => c.offsetTop);
      const endEl = scroller.querySelector('.scroll-stack-end');
      endTop = endEl ? endEl.offsetTop : 0;
    }

    cachedOffsetsRef.current = { cardTops, endTop, containerH, stackPx, valid: true };
    if (scrollerRef.current) {
      scrollerRef.current.style.setProperty('--stack-pos', `${stackPx}px`);
    }
  }, [useWindowScroll, stackPosition, parsePercentage]);

  const applyTransforms = useCallback(() => {
    const cards = cardsRef.current;
    if (!cards.length) return;

    const { cardTops, endTop, containerH, stackPx, valid } = cachedOffsetsRef.current;
    if (!valid || !containerH) return;

    const scrollTop = useWindowScroll
      ? window.scrollY
      : (scrollerRef.current?.scrollTop ?? 0);

    const pinEnd = endTop - containerH * 0.5;

    cards.forEach((card, i) => {
      if (!card) return;

      const cardTop      = cardTops[i] ?? 0;
      const pinStart     = cardTop - stackPx;
      const nextCardTop  = i < cards.length - 1 ? (cardTops[i + 1] ?? endTop) : endTop;
      const nextPinStart = nextCardTop - stackPx;
      const effectivePinEnd = Math.max(pinEnd, nextPinStart);

      let sc = 1;

      if (scrollTop >= pinStart && scrollTop <= effectivePinEnd) {
        const span = Math.max(1, nextPinStart - pinStart);
        const t    = Math.min(1, (scrollTop - pinStart) / span);
        sc = 1 - t * 0.035;
      } else if (scrollTop > effectivePinEnd) {
        sc = 0.965;
      }

      const last = lastTransformsRef.current.get(i);
      if (!last || Math.abs(last.sc - sc) > 0.0001) {
        card.style.transform = `scale(${sc})`;
        lastTransformsRef.current.set(i, { sc });
      }

      if (i === cards.length - 1) {
        const inView = scrollTop >= pinStart && scrollTop <= effectivePinEnd;
        if (inView && !stackCompletedRef.current) {
          stackCompletedRef.current = true;
          onStackComplete?.();
        } else if (!inView && stackCompletedRef.current) {
          stackCompletedRef.current = false;
        }
      }
    });
  }, [useWindowScroll, onStackComplete]);

  const onScroll = useCallback(() => {
    applyTransforms();
  }, [applyTransforms]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const cards = Array.from(
      useWindowScroll
        ? document.querySelectorAll('.scroll-stack-card')
        : scroller.querySelectorAll('.scroll-stack-card')
    );

    cardsRef.current = cards;

    cards.forEach((card, i) => {
      if (i < cards.length - 1) card.style.marginBottom = `${itemDistance}px`;
      card.style.willChange    = 'transform';
      card.style.transformOrigin = 'top center';
      card.style.transform     = 'scale(1)';
    });

    if (useWindowScroll) {
      const scheduleRecalc = () => requestAnimationFrame(() => recalcOffsets());

      scheduleRecalc();
      const timer2 = setTimeout(scheduleRecalc, 800);

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();

      let resizeTimer;
      let lastWidth = window.innerWidth;
      
      const handleResize = () => {
        const currentWidth = window.innerWidth;
        if (currentWidth === lastWidth && 'ontouchstart' in window) {
          return;
        }
        lastWidth = currentWidth;
        
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          scheduleRecalc();
          onScroll();
        }, 150);
      };
      
      window.addEventListener('resize', handleResize, { passive: true });
      window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

      return () => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', handleResize);
        window.visualViewport?.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
        clearTimeout(timer2);
        cardsRef.current = [];
        lastTransformsRef.current.clear();
        cachedOffsetsRef.current = { cardTops: [], endTop: 0, containerH: 0, stackPx: 0, valid: false };
        stackCompletedRef.current = false;
      };

    } else {
      requestAnimationFrame(() => recalcOffsets());

      import('lenis').then(({ default: Lenis }) => {
        const lenis = new Lenis({
          wrapper: scroller,
          content: scroller.querySelector('.scroll-stack-inner'),
          duration: 1.2,
          easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 2,
          lerp: 0.1,
          syncTouch: true,
          syncTouchLerp: 0.075,
        });

        lenis.on('scroll', applyTransforms);

        const raf = time => {
          lenis.raf(time);
          animationFrameRef.current = requestAnimationFrame(raf);
        };
        animationFrameRef.current = requestAnimationFrame(raf);
        scroller._lenisInstance = lenis;
      });

      return () => {
        cancelAnimationFrame(animationFrameRef.current);
        if (scroller._lenisInstance) {
          scroller._lenisInstance.destroy();
          scroller._lenisInstance = null;
        }
        cardsRef.current = [];
        lastTransformsRef.current.clear();
        cachedOffsetsRef.current = { cardTops: [], endTop: 0, containerH: 0, stackPx: 0, valid: false };
        stackCompletedRef.current = false;
      };
    }
  }, [useWindowScroll, stackPosition, itemDistance, onScroll, applyTransforms, recalcOffsets]);

  return (
    <div className={`scroll-stack-scroller ${className}`.trim()} ref={scrollerRef}>
      <div className="scroll-stack-inner">
        {children}
        <div className="scroll-stack-end" />
      </div>
    </div>
  );
};

export default ScrollStack;
