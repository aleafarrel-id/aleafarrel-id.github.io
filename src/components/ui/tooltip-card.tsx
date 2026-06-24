"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";

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
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [height, setHeight] = useState<number | "auto">("auto");
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculatePosition = (mouseX: number, mouseY: number) => {
    if (!contentRef.current) return { x: mouseX + 16, y: mouseY + 16 };

    const tooltip = contentRef.current;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tooltipWidth = tooltip.offsetWidth || 340;
    const tooltipHeight = tooltip.scrollHeight || 300;

    let finalX = mouseX + 16;
    let finalY = mouseY + 16;

    // Check right edge
    if (finalX + tooltipWidth > viewportWidth - 16) {
      finalX = mouseX - tooltipWidth - 16;
    }

    // Check bottom edge
    if (finalY + tooltipHeight > viewportHeight - 16) {
      finalY = mouseY - tooltipHeight - 16;
    }

    return { x: finalX, y: finalY };
  };

  const updatePosition = (clientX: number, clientY: number) => {
    setMouse({ x: clientX, y: clientY });
    setPosition(calculatePosition(clientX, clientY));
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsVisible(true);
    updatePosition(e.clientX, e.clientY);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isVisible) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
    setIsVisible(true);
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  };

  useEffect(() => {
    if (isVisible && contentRef.current) {
      setPosition(calculatePosition(mouse.x, mouse.y));
    }
  }, [isVisible, mouse.x, mouse.y]);

  const tooltipPortal = mounted && createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="pointer-events-none fixed z-[999999] overflow-hidden rounded-xl"
          role="tooltip"
          aria-hidden={!isVisible}
          style={{
            top: position.y,
            left: position.x,
            background: 'var(--clr-bg-raised)',
            boxShadow: 'var(--neu-raised-lg), 0 10px 40px var(--clr-accent-blue-glow)',
            border: '1px solid var(--shadow-light)',
            width: 'max-content',
            minWidth: '280px',
            maxWidth: '380px'
          }}
        >
          <div ref={contentRef}>
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative inline-block", containerClassName)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      {tooltipPortal}
    </div>
  );
};
