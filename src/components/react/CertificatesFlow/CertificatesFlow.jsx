import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lens } from '../../ui/lens';
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
  // Use image path correctly
  const imagePath = data.image.startsWith('/') ? data.image : `/certificate/${data.image.split('/').pop()}`;
  
  return (
    <div 
      style={{
        padding: 'var(--space-6)',
        borderRadius: 'var(--radius-xl)',
        background: 'var(--clr-bg-raised)',
        border: '1px solid var(--shadow-light)',
        boxShadow: 'var(--neu-raised-sm)',
        width: '380px',
        color: 'var(--clr-text-primary)',
        transition: 'transform var(--duration-base) var(--ease-out-expo), box-shadow var(--duration-base) var(--ease-out-expo), border-color var(--duration-base) var(--ease-out-expo)',
        cursor: 'pointer'
      }}
      onMouseEnter={(e) => { 
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'; 
        e.currentTarget.style.boxShadow = 'var(--neu-raised-lg), 0 0 20px var(--clr-accent-blue-glow)';
        e.currentTarget.style.borderColor = 'var(--clr-accent-blue)';
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.transform = 'translateY(0) scale(1)'; 
        e.currentTarget.style.boxShadow = 'var(--neu-raised-sm)';
        e.currentTarget.style.borderColor = 'var(--shadow-light)';
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: 'var(--clr-accent-blue)', width: '14px', height: '14px', border: '3px solid var(--clr-bg-raised)', boxShadow: '0 0 12px var(--clr-accent-blue-glow)', left: '-7px' }} />
      
      <div style={{ position: 'relative', width: '100%', height: '240px', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 'var(--space-6)', background: 'var(--clr-bg-deep)', boxShadow: 'var(--neu-inset)' }}>
         <img src={imagePath} alt={data.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.95, transition: 'transform var(--duration-slow) var(--ease-out-expo)' }} loading="lazy" onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
         <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, var(--clr-bg-raised) 0%, transparent 100%)', pointerEvents: 'none', opacity: 0.9 }} />
         <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--clr-bg-deep)', border: '1px solid var(--clr-accent-blue)', color: 'var(--clr-accent-blue)', padding: '4px 12px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', pointerEvents: 'none', textTransform: 'uppercase' }}>
            Preview
         </div>
         <div style={{ position: 'absolute', bottom: 'var(--space-4)', left: 'var(--space-5)', right: 'var(--space-5)', pointerEvents: 'none' }}>
             <p style={{ color: 'var(--clr-accent-blue)', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-xs)', margin: '0 0 var(--space-1) 0', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', textShadow: '0 2px 4px var(--shadow-dark)' }}>{data.name}</p>
         </div>
      </div>

      <h3 style={{ color: 'var(--clr-text-primary)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: '0 0 var(--space-3) 0', fontWeight: '800', lineHeight: '1.3', letterSpacing: '-0.01em' }}>{data.title}</h3>
      <p style={{ color: 'var(--clr-text-secondary)', fontSize: 'var(--text-sm)', margin: 0, lineHeight: '1.6', opacity: 0.9 }}>{data.description}</p>

      <Handle type="source" position={Position.Right} style={{ background: 'var(--clr-accent-orange)', width: '14px', height: '14px', border: '3px solid var(--clr-bg-raised)', boxShadow: '0 0 12px var(--clr-accent-orange-glow)', right: '-7px' }} />
    </div>
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
        position: { x: 0, y: 0 }, 
        data: { label: 'My Certificates' } 
      }
    ];
    const edges = [];
    
    let prevId = 'start';
    if (items && items.length > 0) {
      items.forEach((cert, i) => {
        const currentId = `cert-${cert.id || i}`;
        const isUp = i % 2 === 0;
        
        nodes.push({
          id: currentId,
          type: 'certificate',
          position: { x: 650 + i * 500, y: isUp ? -180 : 200 },
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
      <Background variant="dots" gap={32} size={2} color="var(--shadow-light)" />
      <Controls showInteractive={false} style={{ button: { backgroundColor: 'var(--clr-bg-raised)', border: '1px solid var(--shadow-light)', color: 'var(--clr-text-primary)' } }} />
    </ReactFlow>
  );
}

export default function CertificatesFlow({ items }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [hovering, setHovering] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    if (node.type === 'certificate' && node.data && node.data.image) {
      const imagePath = node.data.image.startsWith('/') ? node.data.image : `/certificate/${node.data.image.split('/').pop()}`;
      setPreviewImage(imagePath);
    }
  }, []);

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
        animation: 'certFadeIn 0.3s ease-out forwards'
      }}
      onClick={() => setPreviewImage(null)}
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
        onClick={() => setPreviewImage(null)}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = 'var(--clr-error)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'var(--clr-bg-raised)'; }}
      >
        &times;
      </button>
      <div 
        style={{
          maxWidth: '90%',
          maxHeight: '90vh',
          animation: 'certScaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Lens hovering={hovering} setHovering={setHovering} zoomFactor={1.8} lensSize={250}>
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
        `}
      </style>
    </>
  );
}
