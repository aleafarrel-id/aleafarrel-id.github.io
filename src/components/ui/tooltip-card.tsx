"use client";
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

const tooltipStyles = `
  @keyframes tooltip-in {
    from { opacity: 0; transform: scale(0.95) translateY(6px); }
    to   { opacity: 1; transform: scale(1)    translateY(0); }
  }
  @keyframes tooltip-out {
    from { opacity: 1; transform: scale(1)    translateY(0); }
    to   { opacity: 0; transform: scale(0.95) translateY(6px); }
  }
  .tooltip-enter { animation: tooltip-in  120ms cubic-bezier(0.16, 1, 0.3, 1) both; }
  .tooltip-exit  { animation: tooltip-out  80ms ease-in both; }
`;

let styleInjected = false;
function injectStyles() {
  if (styleInjected || typeof document === "undefined") return;
  styleInjected = true;
  const el = document.createElement("style");
  el.textContent = tooltipStyles;
  document.head.appendChild(el);
}

export const Tooltip = ({
  content,
  children,
  containerClassName,
}: {
  content: string | React.ReactNode;
  children: React.ReactNode;
  containerClassName?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTouchDevice = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches,
    []
  );

  useEffect(() => {
    injectStyles();
    setMounted(true);
  }, []);

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  const calculatePosition = useCallback(
    (tapX: number, tapY: number) => {
      const vp = window.visualViewport;
      const vw = vp ? vp.width  : window.innerWidth;
      const vh = vp ? vp.height : window.innerHeight;
      const vpLeft = vp ? vp.offsetLeft : 0;
      const vpTop  = vp ? vp.offsetTop  : 0;

      const EDGE = isTouchDevice ? 20 : 12;

      const TOUCH_MAX_W = Math.min(260, vw - EDGE * 2);
      const TOUCH_MAX_H = 340;
      const DESK_MAX_W  = 380;
      const DESK_MAX_H  = 400;

      const el = contentRef.current;
      const tw = (el && el.offsetWidth  > 0) ? el.offsetWidth  : (isTouchDevice ? TOUCH_MAX_W : DESK_MAX_W);
      const th = (el && el.scrollHeight > 0) ? el.scrollHeight : (isTouchDevice ? TOUCH_MAX_H : DESK_MAX_H);

      let x = tapX + EDGE;
      let y = tapY + EDGE;

      if (x + tw > vpLeft + vw - EDGE) {
        x = tapX - tw - EDGE;
      }
      if (y + th > vpTop + vh - EDGE) {
        y = tapY - th - EDGE;
      }

      x = Math.max(vpLeft + EDGE, Math.min(x, vpLeft + vw - tw - EDGE));
      y = Math.max(vpTop  + EDGE, Math.min(y, vpTop  + vh - th - EDGE));

      return { x, y };
    },
    [isTouchDevice]
  );

  const showTooltip = useCallback(
    (x: number, y: number) => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
      const pos = calculatePosition(x, y);
      setPosition(pos);
      setIsExiting(false);
      setIsVisible(true);
    },
    [calculatePosition]
  );

  const hideTooltip = useCallback(() => {
    setIsExiting(true);
    exitTimerRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
    }, 80);
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDevice) return;
      showTooltip(e.clientX, e.clientY);
    },
    [isTouchDevice, showTooltip]
  );

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice) return;
    hideTooltip();
  }, [isTouchDevice, hideTooltip]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchDevice || !isVisible || isExiting) return;
      setPosition(calculatePosition(e.clientX, e.clientY));
    },
    [isTouchDevice, isVisible, isExiting, calculatePosition]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isTouchDevice) return;
      e.stopPropagation();

      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }

      if (isVisible && !isExiting) {
        hideTooltip();
      } else {
        showTooltip(e.clientX, e.clientY);
        autoCloseTimerRef.current = setTimeout(hideTooltip, 5000);
      }
    },
    [isTouchDevice, isVisible, isExiting, showTooltip, hideTooltip]
  );

  useEffect(() => {
    if (!isVisible || !isTouchDevice) return;

    const onPointerDown = (e: PointerEvent) => {
      if (
        contentRef.current?.contains(e.target as Node) ||
        containerRef.current?.contains(e.target as Node)
      ) return;
      hideTooltip();
    };

    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, [isVisible, isTouchDevice, hideTooltip]);

  const tooltipElWidth = isTouchDevice
    ? `${Math.min(260, typeof window !== "undefined" ? window.innerWidth - 40 : 260)}px`
    : undefined;

  const tooltipPortal =
    mounted &&
    isVisible &&
    createPortal(
      <div
        ref={contentRef}
        className={cn(
          "fixed z-[999999] overflow-hidden rounded-xl",
          isExiting ? "tooltip-exit" : "tooltip-enter",
          isTouchDevice ? "pointer-events-auto" : "pointer-events-none"
        )}
        role="tooltip"
        aria-hidden={!isVisible}
        style={{
          top:  position.y,
          left: position.x,
          background: "var(--clr-bg-raised)",
          border: "1px solid var(--shadow-light)",
          width:    tooltipElWidth ?? "max-content",
          minWidth: isTouchDevice ? "180px" : "280px",
          maxWidth: isTouchDevice ? "260px" : "380px",
          willChange: "transform, opacity",
        }}
        onClick={() => { if (isTouchDevice) hideTooltip(); }}
      >
        {content}
      </div>,
      document.body
    );

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {children}
      {tooltipPortal}
    </div>
  );
};
