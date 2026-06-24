import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lens } from '../../ui/lens';
import { Tooltip } from '../../ui/tooltip-card';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './CertificatesFlow.css';

const CenterNode = ({ data }) => (
  <div className="cert-flow-center-node">
    <h2 className="cert-flow-center-title">{data.label}</h2>
    <p className="cert-flow-center-subtitle">{data.subtitle} &rarr;</p>
    <Handle type="source" position={Position.Right} className="cert-flow-handle-right" />
  </div>
);

const CertificateNode = ({ data }) => {
  const imagePath = data.image.startsWith('/') ? data.image : `/certificate/${data.image.split('/').pop()}`;

  const tooltipContent = (
    <div className="cert-tooltip-container">
      <div className="cert-tooltip-image-wrapper">
        <img src={imagePath} alt={data.title} className="cert-tooltip-image" loading="lazy" />
        <div className="cert-tooltip-gradient-overlay">
          <p className="cert-tooltip-provider">{data.name}</p>
        </div>
        <div className="cert-tooltip-badge">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          <span className="cert-tooltip-badge-text">{data.previewLabel}</span>
        </div>
      </div>
      <div className="cert-tooltip-body">
        <h3 className="cert-tooltip-title">{data.title}</h3>
        <p className="cert-tooltip-description">{data.description}</p>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        className="cert-node-container"
        tabIndex={0}
        role="button"
        aria-label={`Preview certificate for ${data.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.currentTarget.click();
          }
        }}
      >
        <Handle type="target" position={Position.Left} className="cert-flow-handle-left-blue" />

        <div className="cert-node-header">
          <div className="cert-node-header-left">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <span className="cert-node-provider">{data.name}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.5 }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </div>

        <p className="cert-node-title">
          {data.title}
        </p>

        <Handle type="source" position={Position.Right} className="cert-flow-handle-right-orange" />
      </div>
    </Tooltip>
  );
};

const nodeTypes = {
  center: CenterNode,
  certificate: CertificateNode,
};

function FlowContent({ items, strings, onNodeClick }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [
      {
        id: 'start',
        type: 'center',
        position: { x: -200, y: 0 },
        data: { 
          label: strings?.centerLabel || 'My Certificates',
          subtitle: strings?.centerSubtitle || 'Scroll or drag to explore'
        }
      }
    ];
    const edges = [];

    let prevId = 'start';
    if (items && items.length > 0) {
      items.forEach((cert, i) => {
        const currentId = `cert-${cert.id || i}`;
        const col = Math.floor(i / 3);
        let row = i % 3;

        // Center the last item if it's the only one in its column
        if (i === items.length - 1 && row === 0) {
          row = 1;
        }

        const xPos = 550 + col * 450;
        const yPos = (row - 1) * 300;

        nodes.push({
          id: currentId,
          type: 'certificate',
          position: { x: xPos, y: yPos },
          data: { ...cert, previewLabel: strings?.previewLabel || 'PREVIEW' }
        });

        const isBlue = i % 2 === 0;
        edges.push({
          id: `e-${prevId}-${currentId}`,
          source: prevId,
          target: currentId,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: isBlue ? 'var(--clr-accent-blue)' : 'var(--clr-accent-orange)',
            strokeWidth: 4,
            opacity: 0.8,
            filter: `drop-shadow(0 0 6px ${isBlue ? 'var(--clr-accent-blue-glow)' : 'var(--clr-accent-orange-glow)'})`
          }
        });

        prevId = currentId;
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [items]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Focus the view with a more reasonable padding
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 1000 });
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={onNodeClick}
      nodeTypes={nodeTypes}
      colorMode="dark"
      minZoom={0.1}
      maxZoom={1.5}
      preventScrolling={false}
      zoomOnScroll={false}
      panOnScroll={false}
    >
      <Background variant="dots" gap={32} size={2} color="rgba(255, 255, 255, 0.15)" />
      <Controls showInteractive={false} style={{ button: { backgroundColor: 'var(--clr-bg-raised)', border: '1px solid var(--shadow-light)', color: 'var(--clr-text-primary)' } }} />
    </ReactFlow>
  );
}

export default function CertificatesFlow({ items, strings }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Trap focus and close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && previewImage) {
        handleClose();
      }
    };
    
    if (previewImage) {
      document.addEventListener('keydown', handleKeyDown);
      // Ensure focus on close button for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewImage]);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'certificate' && node.data && node.data.image) {
      const imagePath = node.data.image.startsWith('/') ? node.data.image : `/certificate/${node.data.image.split('/').pop()}`;
      setIsClosing(false);
      setPreviewImage(imagePath);
    }
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setPreviewImage(null);
      setIsClosing(false);
      setHovering(false); // Reset hovering state so lens doesn't persist on next open
    }, 300); // Matches the animation duration
  };

  const modalContent = previewImage && (
    <div
      className={`cert-modal-overlay ${isClosing ? 'closing' : 'entering'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <button
        ref={closeButtonRef}
        className="cert-modal-close-btn"
        onClick={handleClose}
        aria-label="Close certificate preview"
      >
        &times;
      </button>
      <div
        className={`cert-modal-content-wrapper ${isClosing ? 'closing' : 'entering'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
          <img
            src={previewImage}
            alt="Certificate detailed preview"
            className="cert-modal-image"
          />
        </Lens>
      </div>
    </div>
  );

  return (
    <>
      <div className="cert-flow-wrapper">
        <ReactFlowProvider>
          <FlowContent items={items} strings={strings} onNodeClick={onNodeClick} />
        </ReactFlowProvider>
      </div>

      {isClient && previewImage && createPortal(modalContent, document.body)}
    </>
  );
}
