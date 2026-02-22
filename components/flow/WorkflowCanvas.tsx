import React, { useCallback, useRef, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  useOnSelectionChange,
  SelectionMode
} from '@xyflow/react';
import CustomNode from './CustomNode';
import CustomEdge from './CustomEdge';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeData, NodeType, NodeStatus } from '../../types';
import ContextMenu from './ContextMenu';

const nodeTypes = {
  custom: CustomNode,
};

const edgeTypes = {
  smoothstep: CustomEdge,
};

const WorkflowCanvasInner = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, deleteElements } = useReactFlow();
  const [menu, setMenu] = useState<{ id: string | null; top: number; left: number; type: 'node' | 'pane' } | null>(null);
  
  const { 
    nodes, 
    edges, 
    onNodesChange, 
    onEdgesChange, 
    onConnect, 
    addNode,
    deleteNode,
    setSelectedNode,
    copySelection,
    copyNodes,
    pasteSelection,
    copiedNodes
  } = useFlowStore();

  const hasCopiedNodes = copiedNodes.length > 0;

  // Keyboard Shortcuts Handler
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          // Ignore if input/textarea is active
          if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
              return;
          }

          // Delete
          if (event.key === 'Delete' || event.key === 'Backspace') {
             // ReactFlow handles delete natively if nodes are selected
          }

          // Copy: Ctrl+C or Cmd+C
          if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
              event.preventDefault();
              copySelection();
          }

          // Paste: Ctrl+V or Cmd+V
          if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
              event.preventDefault();
              pasteSelection();
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, pasteSelection]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow/type');
      const label = event.dataTransfer.getData('application/reactflow/label');
      const savedDataStr = event.dataTransfer.getData('application/reactflow/saved-node');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode: Node<NodeData>;

      if (savedDataStr) {
          // It's a saved node template
          try {
              const savedData = JSON.parse(savedDataStr) as NodeData;
              newNode = {
                  id: `node-${Date.now()}`,
                  type: 'custom',
                  position,
                  data: {
                      ...savedData,
                      status: NodeStatus.IDLE, // Reset status
                      logs: [], // Reset logs
                      lastRun: undefined,
                      duration: undefined,
                      // Ensure config sub-objects have new IDs to prevent collisions if they have IDs
                      config: {
                          ...savedData.config,
                          headers: savedData.config.headers?.map(h => ({ ...h, id: `${Date.now()}-${Math.random()}` })),
                          params: savedData.config.params?.map(p => ({ ...p, id: `${Date.now()}-${Math.random()}` }))
                      }
                  }
              };
          } catch (e) {
              console.error("Failed to parse saved node data", e);
              return;
          }
      } else {
          // Standard node
          newNode = {
            id: `node-${Date.now()}`,
            type: 'custom',
            position,
            data: { 
                label: label, 
                description: 'Configure this node',
                status: NodeStatus.IDLE, 
                type: type as NodeType,
                config: {} // Initialize empty config
            },
          };
      }

      addNode(newNode);
    },
    [screenToFlowPosition, addNode],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();

      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) return;

      // Calculate position relative to container
      setMenu({
        id: node.id,
        top: event.clientY - pane.top,
        left: event.clientX - pane.left,
        type: 'node'
      });
    },
    [setMenu],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      
      const pane = reactFlowWrapper.current?.getBoundingClientRect();
      if (!pane) return;

      setMenu({
        id: null,
        top: event.clientY - pane.top,
        left: event.clientX - pane.left,
        type: 'pane'
      });
    },
    [setMenu],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setMenu(null);
  }, [setSelectedNode, setMenu]);

  const handleMenuAction = (action: 'copy' | 'delete' | 'paste') => {
      if (!menu) return;

      switch(action) {
          case 'copy':
              if (menu.id) {
                  const node = nodes.find(n => n.id === menu.id);
                  if (node) copyNodes([node]);
              }
              break;
          case 'delete':
              if (menu.id) deleteNode(menu.id);
              break;
          case 'paste':
              // Calculate paste position in flow coords
              const pane = reactFlowWrapper.current?.getBoundingClientRect();
              if (pane) {
                  const flowPos = screenToFlowPosition({
                      x: pane.left + menu.left,
                      y: pane.top + menu.top
                  });
                  pasteSelection(flowPos);
              }
              break;
      }
      setMenu(null);
  };

  return (
    <div className="flex-1 h-full w-full relative bg-gray-50" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => { setSelectedNode(node.id); setMenu(null); }}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        proOptions={{ hideAttribution: true }}
        className="touch-none"
        selectionMode={SelectionMode.Partial}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Control', 'Meta', 'Shift']}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e5e7eb" />
        <Controls showInteractive={false} className="!bg-white !border-gray-200 !shadow-lg !rounded-lg" />
      </ReactFlow>
      
      {menu && (
          <ContextMenu 
            top={menu.top} 
            left={menu.left} 
            type={menu.type} 
            onAction={handleMenuAction}
            onClose={() => setMenu(null)}
            hasCopiedNodes={hasCopiedNodes}
          />
      )}
    </div>
  );
};

const WorkflowCanvas = () => (
    <ReactFlowProvider>
        <WorkflowCanvasInner />
    </ReactFlowProvider>
);

export default WorkflowCanvas;