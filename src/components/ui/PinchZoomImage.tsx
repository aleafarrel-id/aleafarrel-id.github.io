import React, { useEffect, useRef, useState } from 'react';
import panzoom, { type PanZoom } from 'panzoom';

interface PinchZoomImageProps {
  children: React.ReactNode;
  className?: string;
}

export const PinchZoomImage: React.FC<PinchZoomImageProps> = ({ children, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState<boolean>(true);
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  useEffect(() => {
    if (!containerRef.current) return;

    const pz: PanZoom = panzoom(containerRef.current, {
      maxZoom: 4,
      minZoom: 1,
      bounds: true,
      boundsPadding: 0.1,
      zoomDoubleClickSpeed: 1,

      beforeWheel: function () {
        return true;
      },

      beforeMouseDown: function () {
        return true;
      },

      onTouch: function (e: TouchEvent) {
        setShowHint(false);
        e.stopPropagation();
        return false;
      }
    });

    const handleSnapToCenter = () => {
      const transform = pz.getTransform();
      if (transform.scale <= 1.05) {
        if (transform.x !== 0 || transform.y !== 0) {
          pz.smoothMoveTo(0, 0);
        }
      }
    };

    pz.on('zoom', handleSnapToCenter);
    pz.on('panend', handleSnapToCenter);

    return () => {
      pz.dispose();
    };
  }, []);

  // Simple client-side i18n
  const isId = typeof document !== 'undefined' && document.documentElement.lang === 'id';
  const hintText = isId ? "Cubit untuk memperbesar" : "Pinch to zoom";

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center gap-5 relative ${className || ''}`}
      style={{ touchAction: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div ref={containerRef}>
        {children}
      </div>

      {isTouchDevice && (
        <div 
          className={`pinch-zoom-hint shrink-0 ${showHint ? 'pinch-zoom-hint-visible' : 'pinch-zoom-hint-hidden'}`}
        >
          <svg className="pinch-zoom-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
          <span className="pinch-zoom-text">{hintText}</span>
        </div>
      )}
    </div>
  );
};
