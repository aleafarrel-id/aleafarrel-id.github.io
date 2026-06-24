import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

const CenterNode = ({ data }) => (
  <div style={{
    padding: 'var(--space-12) var(--space-16)',
    borderRadius: 'var(--radius-xl)',
    background: 'var(--clr-bg)',
    boxShadow: 'var(--neu-raised)',
    border: '1px solid var(--shadow-light)',
    textAlign: 'center',
    position: 'relative'
  }}>
    <h2 style={{ color: 'var(--clr-text-primary)', fontFamily: 'var(--font-display)', margin: 0, fontSize: 'var(--text-4xl)', fontWeight: '900', textShadow: '0 4px 12px var(--shadow-dark)' }}>{data.label}</h2>
    <p style={{ color: 'var(--clr-text-secondary)', marginTop: 'var(--space-3)', fontSize: 'var(--text-base)', letterSpacing: '0.02em', opacity: 0.9 }}>Scroll or drag to explore &rarr;</p>
    <Handle type="source" position={Position.Right} style={{ background: 'var(--clr-accent-blue)', width: '16px', height: '16px', border: '3px solid var(--clr-bg)', boxShadow: '0 0 16px var(--clr-accent-blue-glow)', right: '-8px' }} />
  </div>
);

const CertificateNode = ({ data }) => {
  const imagePath = data.image.startsWith('/') ? data.image : `/certificate/${data.image.split('/').pop()}`;

  const tooltipContent = (
    <div style={{ width: '320px', padding: 0 }}>
      <div style={{ position: 'relative', width: '100%', height: '180px', borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem', overflow: 'hidden', background: 'var(--clr-bg-deep)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <img src={imagePath} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--space-4)', background: 'linear-gradient(to top, rgba(18,18,18,0.95) 0%, rgba(18,18,18,0) 100%)', display: 'flex', alignItems: 'flex-end' }}>
          <p style={{ color: 'var(--clr-accent-blue)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', margin: 0, fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{data.name}</p>
        </div>
        <div style={{ position: 'absolute', top: 'var(--space-3)', right: 'var(--space-3)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: 'var(--radius-full)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          <span style={{ fontSize: '10px', color: 'var(--clr-text-primary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>PREVIEW</span>
        </div>
      </div>
      <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <h3 style={{ color: 'var(--clr-text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', margin: '0 0 var(--space-2) 0', fontWeight: '800', lineHeight: '1.3' }}>{data.title}</h3>
        <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--text-xs)', margin: 0, lineHeight: '1.6' }}>{data.description}</p>
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent}>
      <div
        style={{
          padding: 'var(--space-4) var(--space-5)',
          borderRadius: 'var(--radius-lg)',
          background: 'linear-gradient(145deg, var(--clr-bg-raised), var(--clr-bg-deep))',
          border: '1px solid var(--shadow-light)',
          boxShadow: 'var(--neu-raised-sm)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: '240px',
          maxWidth: '260px',
          color: 'var(--clr-text-primary)',
          transition: 'all var(--duration-fast) var(--ease-out-expo)',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          e.currentTarget.style.boxShadow = 'var(--neu-raised), 0 8px 24px var(--clr-accent-blue-glow)';
          e.currentTarget.style.borderColor = 'var(--clr-accent-blue)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = 'var(--neu-raised-sm)';
          e.currentTarget.style.borderColor = 'var(--shadow-light)';
        }}
      >
        <Handle type="target" position={Position.Left} style={{ background: 'var(--clr-accent-blue)', width: '12px', height: '12px', border: '2px solid var(--clr-bg-raised)', left: '-6px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
            <span style={{ fontFamily: 'var(--font-ui)', fontWeight: '800', fontSize: 'var(--text-sm)', letterSpacing: '0.05em' }}>{data.name}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </div>

        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--clr-text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5', opacity: 0.8 }}>
          {data.title}
        </p>

        <Handle type="source" position={Position.Right} style={{ background: 'var(--clr-accent-orange)', width: '12px', height: '12px', border: '2px solid var(--clr-bg-raised)', right: '-6px' }} />
      </div>
    </Tooltip>
  );
};

const nodeTypes = {
  center: CenterNode,
  certificate: CertificateNode,
};

function FlowContent({ items, onNodeClick }) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes = [
      {
        id: 'start',
        type: 'center',
        position: { x: -200, y: 0 },
        data: { label: 'My Certificates' }
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
          data: cert
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
    // Adding a short timeout ensures the dom is ready for fitView
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

export default function CertificatesFlow({ items }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    }, 300); // Matches the animation duration
  };

  const modalContent = previewImage && (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        background: 'rgba(10,10,12,0.9)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        animation: isClosing ? 'certFadeOut 0.3s ease-out forwards' : 'certFadeIn 0.3s ease-out forwards'
      }}
      onClick={handleClose}
    >
      <button
        style={{
          position: 'absolute',
          top: '32px', right: '32px',
          background: 'var(--clr-bg-raised)',
          border: '1px solid var(--shadow-light)',
          color: 'var(--clr-text-primary)',
          width: '56px', height: '56px',
          borderRadius: '50%',
          fontSize: '32px',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--neu-raised)',
          zIndex: 100000,
          transition: 'transform 0.2s, background 0.2s'
        }}
        onClick={handleClose}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'var(--clr-error)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--clr-bg-raised)'; }}
      >
        &times;
      </button>
      <div
        style={{
          maxWidth: '90%',
          maxHeight: '90vh',
          animation: isClosing ? 'certScaleOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' : 'certScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={180}>
          <img
            src={previewImage}
            alt="Certificate Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '0',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
              cursor: 'crosshair'
            }}
          />
        </Lens>
      </div>
    </div>
  );

  return (
    <>
      <div style={{
        width: '100%',
        height: '650px',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        border: '1px solid var(--shadow-light)',
        boxShadow: 'var(--neu-inset)',
        position: 'relative'
      }}>
        <ReactFlowProvider>
          <FlowContent items={items} onNodeClick={onNodeClick} />
        </ReactFlowProvider>
      </div>

      {isClient && previewImage && createPortal(modalContent, document.body)}

      <style>
        {`
          @keyframes certFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes certScaleIn { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
          @keyframes certFadeOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes certScaleOut { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(0.95) translateY(20px); opacity: 0; } }
        `}
      </style>
    </>
  );
}
