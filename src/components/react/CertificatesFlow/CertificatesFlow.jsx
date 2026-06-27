import { useCallback, useEffect, useMemo, useState, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { Lens } from '../../ui/lens';
import { Tooltip } from '../../ui/tooltip-card';
import { ImageWithSkeleton } from '../../ui/ImageWithSkeleton';
import { PinchZoomImage } from '../../ui/PinchZoomImage';
import { FiLoader } from 'react-icons/fi';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { globalEvents, EVENTS } from '../../../lib/events';
import './CertificatesFlow.css';

const CenterNode = memo(({ data }) => (
  <div className="cert-flow-center-node">
    <h2 className="cert-flow-center-title">{data.label}</h2>
    <p className="cert-flow-center-subtitle">{data.subtitle} &rarr;</p>
    <Handle type="source" position={Position.Right} className="cert-flow-handle-right" />
  </div>
));
CenterNode.displayName = 'CenterNode';

const CertificateNode = memo(({ data }) => {
  const imagePath = data.image.startsWith('/') ? data.image : `/certificate/${data.image.split('/').pop()}`;

  const tooltipContent = (
    <div 
      className="cert-tooltip-container" 
      onClick={() => {
        if (data.onPreview) data.onPreview();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (data.onPreview) data.onPreview();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className="cert-tooltip-image-wrapper">
        <ImageWithSkeleton src={imagePath} alt={data.title} className="cert-tooltip-image" loading="lazy" decoding="async" width="800" height="600" />
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
        role="button"
        tabIndex={0}
        aria-label={`Preview certificate for ${data.title}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (data.onPreview) data.onPreview();
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
});
CertificateNode.displayName = 'CertificateNode';

const nodeTypes = {
  center: CenterNode,
  certificate: CertificateNode,
};

function FlowContent({ items, strings, onNodeClick, openPreview }) {
  const [isInteractive, setIsInteractive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFlowReady, setIsFlowReady] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize, { passive: true });
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

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

        /* Center alignment for single remaining item */
        if (i === items.length - 1 && row === 0) {
          row = 1;
        }

        const xPos = 550 + col * 450;
        const yPos = (row - 1) * 300;

        nodes.push({
          id: currentId,
          type: 'certificate',
          position: { x: xPos, y: yPos },
          data: { 
            ...cert, 
            previewLabel: strings?.previewLabel || 'PREVIEW',
            onPreview: () => openPreview && openPreview({ type: 'certificate', data: cert })
          }
        });

        const isBlue = i % 2 === 0;
        edges.push({
          id: `e-${prevId}-${currentId}`,
          source: prevId,
          target: currentId,
          type: 'smoothstep',
          animated: typeof window !== 'undefined' && window.innerWidth >= 768,
          style: {
            stroke: isBlue ? 'var(--clr-accent-blue)' : 'var(--clr-accent-orange)',
            strokeWidth: 4,
            opacity: 0.8,
            ...(typeof window !== 'undefined' && window.innerWidth >= 768 ? {
              filter: `drop-shadow(0 0 6px ${isBlue ? 'var(--clr-accent-blue-glow)' : 'var(--clr-accent-orange-glow)'})`
            } : {})
          }
        });

        prevId = currentId;
      });
    }

    return { initialNodes: nodes, initialEdges: edges };
  }, [items, strings, openPreview]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        const subset = nodes.slice(0, 3).map(n => ({ id: n.id }));
        fitView({ nodes: subset, padding: 0.1, duration: 0, maxZoom: 0.8 });
      } else {
        fitView({ padding: 0.15, duration: 1000 });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, nodes.length]);

  return (
    <div className="relative w-full h-full">
      {!isFlowReady && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--clr-bg-deep)] rounded-xl">
          <FiLoader className="animate-spin text-3xl text-[var(--clr-accent-blue)] mb-3" />
          <span className="text-xs font-ui text-[var(--clr-text-secondary)] animate-pulse tracking-widest uppercase">
            {strings?.loading_flow || "Loading"}
          </span>
        </div>
      )}
      {!isInteractive && isMobile && (
        <div 
          className="interaction-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setIsInteractive(true);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          role="button"
          tabIndex={0}
          aria-label={strings?.tap_to_interact || "Ketuk untuk berinteraksi"}
        >
          <div className="interaction-overlay-icon">
            <svg viewBox="0 0 84.91 122.88" fill="currentColor" width="48" height="48">
              <path d="M26.6,80.57c-0.11-0.06-0.25-0.14-0.37-0.23c-1.49-1.18-3.13-2.51-4.54-3.66c-2.06-1.69-4.43-3.64-6.09-5.02 c-1.13-0.93-2.42-1.58-3.63-1.83c-0.79-0.14-1.49-0.14-2.06,0.08c-0.45,0.2-0.85,0.56-1.1,1.13c-0.34,0.76-0.51,1.83-0.42,3.3 c0.08,1.3,0.54,2.71,1.13,4.09c0.87,2,2.09,3.86,2.99,5.04c0.06,0.08,0.11,0.14,0.14,0.23l17.84,25.48 c0.23,0.34,0.37,0.71,0.39,1.07c0.37,2.93,0.99,5.16,1.89,6.54c0.68,1.01,1.52,1.52,2.62,1.49h28.07c1.75-0.03,3.33-0.53,4.79-1.55 c1.61-1.1,3.04-2.82,4.37-5.13c0.03-0.03,0.06-0.08,0.08-0.11c0.51-0.87,1.18-2,1.83-3.07c2.85-4.68,5.33-8.77,5.61-14.57l-0.17-8 c-0.03-0.11-0.03-0.23-0.03-0.34s0-0.87,0.03-1.89c0.06-5.3,0.14-11.84-4.71-12.65h-3.13c-0.03,1.49-0.11,3.02-0.2,4.48 c-0.08,1.32-0.17,2.56-0.17,3.78c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09 c0.31-4.99,0.68-10.71-3.3-11.41h-3.1c-0.17,0-0.34-0.03-0.51-0.06c0.03,1.8-0.08,3.66-0.2,5.47C60.08,70.46,60,71.7,60,72.91 c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34c0-1.21,0.08-2.62,0.17-4.09c0.31-4.99,0.68-10.71-3.3-11.41h-3.1 c-0.23,0-0.42-0.03-0.62-0.08v9.1c0,1.3-1.04,2.34-2.34,2.34c-1.3,0-2.34-1.04-2.34-2.34V41.99c0-4.09-1.66-6.68-3.8-7.75 c-0.79-0.4-1.63-0.59-2.45-0.59c-0.82,0-1.66,0.2-2.45,0.59c-2.11,1.07-3.75,3.66-3.75,7.86v42.81c0,1.3-1.04,2.34-2.34,2.34 c-1.3,0-2.34-1.04-2.34-2.34v-4.34H26.6L26.6,80.57z M39.29,13.99c0,1.55-1.26,2.78-2.78,2.78c-1.55,0-2.78-1.26-2.78-2.78V2.78 c0-1.55,1.26-2.78,2.78-2.78c1.55,0,2.78,1.26,2.78,2.78V13.99L39.29,13.99L39.29,13.99z M13.99,36.95c1.55,0,2.78,1.26,2.78,2.78 c0,1.55-1.26,2.78-2.78,2.78H2.78C1.23,42.5,0,41.24,0,39.73c0-1.55,1.26-2.78,2.78-2.78H13.99L13.99,36.95z M21.92,20.33 c1.08,1.08,1.08,2.85,0,3.93c-1.08,1.08-2.85,1.08-3.93,0l-7.9-7.93c-1.08-1.08-1.08-2.85,0-3.93c1.08-1.08,2.85-1.08,3.93,0 L21.92,20.33L21.92,20.33z M58.47,42.5c-1.55,0-2.78-1.26-2.78-2.78c0-1.55,1.26-2.78,2.78-2.78h11.21c1.55,0,2.78,1.26,2.78,2.78 c0,1.55-1.26,2.78-2.78,2.78H58.47L58.47,42.5z M54.47,23.65c-1.08,1.08-2.85,1.08-3.93,0c-1.08-1.08-1.08-2.85,0-3.93l7.9-7.93 c1.08-1.08,2.85-1.08,3.93,0c1.08,1.08,1.08,2.85,0,3.93L54.47,23.65L54.47,23.65z M48.47,52.79c0.2-0.06,0.39-0.08,0.62-0.08h3.24 c0.17,0,0.37,0.03,0.53,0.06c4.31,0.68,6.26,3.19,7.05,6.45c0.31-0.14,0.65-0.23,0.99-0.23h3.24c0.17,0,0.37,0.03,0.53,0.06 c4.65,0.73,6.51,3.58,7.19,7.19c0.11-0.03,0.23-0.03,0.37-0.03h3.24c0.17,0,0.37,0.03,0.54,0.06c8.91,1.38,8.79,10.23,8.71,17.36 v1.86l0.2,8.23v0.25c-0.34,7.02-3.1,11.56-6.28,16.8c-0.54,0.87-1.07,1.77-1.8,3.02c-0.03,0.03-0.03,0.06-0.06,0.08 c-1.66,2.9-3.58,5.13-5.78,6.65c-2.23,1.55-4.71,2.34-7.41,2.37H35.53c-2.79,0.06-4.96-1.16-6.57-3.55c-1.3-1.92-2.14-4.62-2.59-8 L8.9,86.35l-0.09-0.08c-1.04-1.38-2.45-3.55-3.52-5.95c-0.79-1.8-1.38-3.75-1.52-5.67c-0.14-2.28,0.17-4.09,0.82-5.52 c0.79-1.78,2.09-2.93,3.64-3.55c1.44-0.59,3.07-0.68,4.71-0.34c1.97,0.4,4,1.38,5.72,2.82c1.41,1.18,3.78,3.1,6.09,4.99l1.92,1.58 V42.13c0-6.23,2.76-10.23,6.34-12.04c1.44-0.73,2.99-1.1,4.57-1.1c1.58,0,3.13,0.37,4.56,1.1c3.58,1.8,6.4,5.83,6.4,11.95v10.76 L48.47,52.79L48.47,52.79z" />
            </svg>
          </div>
          <span className="interaction-overlay-text">{strings?.tap_to_interact || "Ketuk untuk berinteraksi"}</span>
        </div>
      )}
      {isInteractive && isMobile && (
        <button
          className="interaction-done-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsInteractive(false);
          }}
          aria-label={strings?.done || "Selesai"}
        >
          <span>{strings?.done || "Selesai"}</span>
        </button>
      )}
      <ReactFlow
        proOptions={{ hideAttribution: true }}
        onInit={() => setIsFlowReady(true)}
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
        panOnDrag={isMobile ? isInteractive : true}
        nodesDraggable={true}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
      >
        <Controls showInteractive={false} style={{ button: { backgroundColor: 'var(--clr-bg-raised)', border: '1px solid var(--shadow-light)', color: 'var(--clr-text-primary)' } }} />
      </ReactFlow>
    </div>
  );
}

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
      role="dialog"
      aria-modal="true"
      aria-label="Certificate preview"
    >
      <button
        ref={closeButtonRef}
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-6 focus-visible:right-6 focus-visible:w-14 focus-visible:h-14 focus-visible:bg-red-500 focus-visible:text-white focus-visible:rounded-full focus-visible:flex focus-visible:items-center focus-visible:justify-center focus-visible:z-50 focus-visible:text-2xl"
        onClick={handleClose}
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
    if (node.type === 'certificate' && node.data && node.data.image) {
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

  const handleClose = useCallback(() => {
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
        <ReactFlowProvider>
          <FlowContent items={items} strings={strings} onNodeClick={onNodeClick} openPreview={openPreview} />
        </ReactFlowProvider>
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
