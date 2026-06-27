import { useCallback, useEffect, useState, useRef, memo, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Lens } from '../../ui/lens';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { PinchZoomImage } from '../../ui/PinchZoomImage';
import { globalEvents, EVENTS } from '../../../lib/events';
import './CertificatesFlow.css';

const CertificatesFlowCore = lazy(() => import('./CertificatesFlowCore'));

const CertModal = memo(({ previewImage, isClosing, handleClose }) => {
  const [hovering, setHovering] = useState(false);
  const closeButtonRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    mountTimeRef.current = Date.now();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus({ preventScroll: true });
    }, 100);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [handleClose]);

  const safeHandleClose = useCallback(() => {
    if (Date.now() - mountTimeRef.current > 300) {
      handleClose();
    }
  }, [handleClose]);

  if (!previewImage) return null;

  return (
    <div
      className={`cert-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={safeHandleClose}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          safeHandleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <button
        ref={closeButtonRef}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-6 focus-visible:right-6 focus-visible:w-14 focus-visible:h-14 focus-visible:bg-red-500 focus-visible:text-white focus-visible:rounded-full focus-visible:flex focus-visible:items-center focus-visible:justify-center focus-visible:z-50 focus-visible:text-2xl"
        onClick={handleClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClose();
        }}
        aria-label="Close certificate preview"
      >
        &times;
      </button>
      <div
        className={`cert-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <PinchZoomImage>
          <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
            <ImageWithSkeleton
              src={previewImage}
              alt="Certificate detailed preview"
              className="cert-modal-image"
              width="1200"
              height="900"
              loading="lazy"
              decoding="async"
            />
          </Lens>
        </PinchZoomImage>
      </div>
    </div>
  );
});
CertModal.displayName = 'CertModal';

/**
 * @typedef {Object} CertificatesFlowProps
 * @property {Array<any>} items
 * @property {any} strings
 */

/**
 * @param {CertificatesFlowProps} props
 */
export default function CertificatesFlow({ items, strings }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openPreview = useCallback((node) => {
    if (node && node.data && node.data.image) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      const imagePath = node.data.image.startsWith('/') ? node.data.image : `/certificate/${node.data.image.split('/').pop()}`;
      setIsClosing(false);
      setPreviewImage(imagePath);
      document.body.style.overflow = "hidden";
      globalEvents.emit(EVENTS.LENIS_STOP);
    }
  }, []);

  const onNodeClick = useCallback((_, node) => {
    const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isTouch) return;
    openPreview(node);
  }, [openPreview]);

  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      document.body.style.overflow = "";
      globalEvents.emit(EVENTS.LENIS_START);
    };
  }, []);

  const handleClose = useCallback((e) => {
    if (e) e.preventDefault();
    setIsClosing(true);
    document.body.style.overflow = "";
    globalEvents.emit(EVENTS.LENIS_START);
    closeTimeoutRef.current = setTimeout(() => {
      setPreviewImage(null);
      setIsClosing(false);
    }, 300);
  }, []);

  return (
    <>
      <div className="cert-flow-wrapper">
        <Suspense fallback={
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-[var(--clr-bg-deep)] rounded-xl relative z-10">
            <svg className="animate-spin h-10 w-10 text-[var(--clr-accent-blue)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-ui text-[var(--clr-text-secondary)] animate-pulse tracking-widest uppercase">
              {strings?.loading_flow || "Loading"}
            </span>
          </div>
        }>
          {isClient && (
            <CertificatesFlowCore 
              items={items} 
              strings={strings} 
              onNodeClick={onNodeClick} 
              openPreview={openPreview} 
            />
          )}
        </Suspense>
      </div>

      {isClient && previewImage && createPortal(
        <CertModal 
          previewImage={previewImage} 
          isClosing={isClosing} 
          handleClose={handleClose} 
        />, 
        document.body
      )}
    </>
  );
}
