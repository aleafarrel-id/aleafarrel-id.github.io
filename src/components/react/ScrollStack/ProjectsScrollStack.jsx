import React from 'react';
import { FiExternalLink, FiGithub } from 'react-icons/fi';
import { FaGooglePlay } from 'react-icons/fa';
import ScrollStack, { ScrollStackItem } from './ScrollStack';
import './ProjectsScrollStack.css';

const ProjectsScrollStack = ({ items, view_project }) => {
  return (
    <div className="projects-scroll-wrapper">
      <ScrollStack
        useWindowScroll={true}
        itemDistance={0}
        stackPosition="10%"
      >
        {(items || []).map((card, index) => (
          <ScrollStackItem key={card.id || index} itemClassName="project-scroll-card">
            <div className="project-card-inner group">
              <div className="project-card-image-section">
                <img src={card.image} alt={card.name} loading="lazy" />
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
                    <a href={card.link} target="_blank" rel="noopener noreferrer" className="project-link-btn primary" aria-label={view_project}>
                      {card.link.includes('github.com') ? <FiGithub size={18} /> : <FiExternalLink size={18} />} 
                      <span>{view_project}</span>
                    </a>
                  )}
                  {card.playStoreUrl && (
                    <a href={card.playStoreUrl} target="_blank" rel="noopener noreferrer" className="project-link-btn secondary" aria-label="Play Store">
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
    </div>
  );
};

export default ProjectsScrollStack;
