import { useState, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { FiExternalLink, FiGithub } from 'react-icons/fi';
import { FaGooglePlay } from 'react-icons/fa';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import { Lens } from '../../ui/lens';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { PinchZoomImage } from '../../ui/PinchZoomImage';
import { globalEvents, EVENTS } from '../../../lib/events';
import './ProjectsScrollStack.css';

const ProjectModal = memo(({ previewImage, isClosing, handleClose }) => {
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
      className={`project-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={safeHandleClose}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          safeHandleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Project image preview"
    >
      <button
        ref={closeButtonRef}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-6 focus-visible:right-6 focus-visible:w-14 focus-visible:h-14 focus-visible:bg-red-500 focus-visible:text-white focus-visible:rounded-full focus-visible:flex focus-visible:items-center focus-visible:justify-center focus-visible:z-50 focus-visible:text-2xl"
        onClick={handleClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClose();
        }}
        aria-label="Close project preview"
      >
        &times;
      </button>
      <div
        className={`project-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <PinchZoomImage>
          <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
            <ImageWithSkeleton
              src={previewImage}
              alt="Project detailed preview"
              className="project-modal-image"
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

ProjectModal.displayName = 'ProjectModal';

const ProjectCard = memo(({ card, index, view_project, openPreview }) => {
  const handleOpen = useCallback(() => {
    openPreview(index);
  }, [openPreview, index]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPreview(index);
    }
  }, [openPreview, index]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <ScrollStackItem itemClassName="project-scroll-card">
      <div 
        className="project-card-inner group"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`Preview ${card.name} project`}
      >
        <div className="project-card-image-section">
          <img src={card.image} alt={card.name} loading="lazy" decoding="async" width="800" height="600" style={{ objectFit: 'cover' }} />
          <div className="project-overlay"></div>
        </div>
        
        <div className="project-card-content">
          <div className="project-card-category">{card.category}</div>
          <h3 className="project-card-title">{card.name}</h3>
          <p className="project-card-description">{card.description}</p>
          
          <div className="project-card-tags">
            {card.tags.map((tag, idx) => (
              <span key={idx} className="project-card-tag">{tag}</span>
            ))}
          </div>
          
          <div className="project-card-links">
            {card.link && (
              <a href={card.link} target="_blank" rel="noopener noreferrer" className="project-link-btn primary" aria-label={view_project} onClick={stopPropagation}>
                {card.link.includes('github.com') ? <FiGithub size={18} /> : <FiExternalLink size={18} />} 
                <span>{view_project}</span>
              </a>
            )}
            {card.playStoreUrl && (
              <a href={card.playStoreUrl} target="_blank" rel="noopener noreferrer" className="project-link-btn secondary" aria-label="Play Store" onClick={stopPropagation}>
                <FaGooglePlay size={18} /> 
                <span>Play Store</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </ScrollStackItem>
  );
});

ProjectCard.displayName = 'ProjectCard';

const ProjectsScrollStack = ({ items, view_project }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const openPreview = useCallback((index) => {
    if (items && items[index]) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
      setIsClosing(false);
      setPreviewImage(items[index].image || items[index].src);
      document.body.style.overflow = "hidden";
      globalEvents.emit(EVENTS.LENIS_STOP);
    }
  }, [items]);

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
    <div className="projects-scroll-wrapper">
      <ScrollStack
        useWindowScroll={true}
        itemDistance={0}
        stackPosition="10%"
      >
        {(items || []).map((card, index) => (
          <ProjectCard 
            key={card.id || index} 
            index={index}
            card={card} 
            view_project={view_project} 
            openPreview={openPreview} 
          />
        ))}
      </ScrollStack>
      {isClient && previewImage && createPortal(
        <ProjectModal 
          previewImage={previewImage} 
          isClosing={isClosing} 
          handleClose={handleClose} 
        />, 
        document.body
      )}
    </div>
  );
};

export default memo(ProjectsScrollStack);
