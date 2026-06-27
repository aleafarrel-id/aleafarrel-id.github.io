import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiExternalLink, FiGithub } from 'react-icons/fi';
import { FaGooglePlay } from 'react-icons/fa';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import { Lens } from '../../ui/lens';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { globalEvents, EVENTS } from '../../../lib/events';
import './ProjectsScrollStack.css';

const ProjectsScrollStack = ({ items, view_project }) => {
  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        handleClose();
      }
    };
    
    let focusTimer;
    if (previewImage) {
      document.addEventListener('keydown', handleKeyDown);
      focusTimer = setTimeout(() => {
        closeButtonRef.current?.focus({ preventScroll: true });
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [previewImage]);

  const openPreview = useCallback((imagePath) => {
    if (imagePath) {
      setIsClosing(false);
      setPreviewImage(imagePath);
      document.body.style.overflow = "hidden";
      globalEvents.emit(EVENTS.LENIS_STOP);
    }
  }, []);

  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      document.body.style.overflow = "";
      globalEvents.emit(EVENTS.LENIS_START);
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    document.body.style.overflow = "";
    globalEvents.emit(EVENTS.LENIS_START);
    closeTimeoutRef.current = setTimeout(() => {
      setPreviewImage(null);
      setIsClosing(false);
      setHovering(false);
    }, 300);
  };

  const modalContent = previewImage && (
    <div
      className={`project-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Project image preview"
    >
      <button
        ref={closeButtonRef}
        className="project-modal-close-btn"
        onClick={handleClose}
        aria-label="Close project preview"
      >
        &times;
      </button>
      <div
        className={`project-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
          <img
            src={previewImage}
            alt="Project detailed preview"
            className="project-modal-image"
            width="1200"
            height="900"
          />
        </Lens>
      </div>
    </div>
  );

  return (
    <div className="projects-scroll-wrapper">
      <ScrollStack
        useWindowScroll={true}
        itemDistance={0}
        stackPosition="10%"
      >
        {(items || []).map((card, index) => (
          <ScrollStackItem key={card.id || index} itemClassName="project-scroll-card">
            <div 
              className="project-card-inner group"
              onClick={() => openPreview(card.image)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openPreview(card.image);
                }
              }}
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
                    <a href={card.link} target="_blank" rel="noopener noreferrer" className="project-link-btn primary" aria-label={view_project} onClick={(e) => e.stopPropagation()}>
                      {card.link.includes('github.com') ? <FiGithub size={18} /> : <FiExternalLink size={18} />} 
                      <span>{view_project}</span>
                    </a>
                  )}
                  {card.playStoreUrl && (
                    <a href={card.playStoreUrl} target="_blank" rel="noopener noreferrer" className="project-link-btn secondary" aria-label="Play Store" onClick={(e) => e.stopPropagation()}>
                      <FaGooglePlay size={18} /> 
                      <span>Play Store</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </ScrollStackItem>
        ))}
      </ScrollStack>
      {isClient && previewImage && createPortal(modalContent, document.body)}
    </div>
  );
};

export default ProjectsScrollStack;
