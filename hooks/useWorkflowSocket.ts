import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ExecutionCreatedEvent {
  executionId: string;
  workflowId: string;
}

export interface ExecutionStartedEvent {
  event: 'execution:started';
  executionId: string;
  totalNodes: number;
  nodeOrder: string[];
}

export interface NodeStartedEvent {
  event: 'node:started';
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
}

export interface NodeCompletedEvent {
  event: 'node:completed';
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  status: 'success' | 'failed';
  duration: number;
  output?: any;
  logs?: string[];
  error?: string;
}

export interface ExecutionCompletedEvent {
  event: 'execution:completed';
  executionId: string;
  status: 'SUCCESS' | 'FAILED';
  duration: number;
  output?: any;
  error?: string;
}

export interface WorkflowSocketCallbacks {
  onExecutionCreated?: (event: ExecutionCreatedEvent) => void;
  onExecutionStarted?: (event: ExecutionStartedEvent) => void;
  onNodeStarted?: (event: NodeStartedEvent) => void;
  onNodeCompleted?: (event: NodeCompletedEvent) => void;
  onExecutionCompleted?: (event: ExecutionCompletedEvent) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';
const WS_NAMESPACE = '/workflow';

export function useWorkflowSocket(callbacks: WorkflowSocketCallbacks) {
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    socketRef.current = io(`${WS_URL}${WS_NAMESPACE}`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    socket.on('execution:created', (event: ExecutionCreatedEvent) => {
      console.log('[WebSocket] Execution created:', event);
      callbacksRef.current.onExecutionCreated?.(event);
    });

    socket.on('execution:started', (event: ExecutionStartedEvent) => {
      console.log('[WebSocket] Execution started:', event);
      callbacksRef.current.onExecutionStarted?.(event);
    });

    socket.on('node:started', (event: NodeStartedEvent) => {
      console.log('[WebSocket] Node started:', event);
      callbacksRef.current.onNodeStarted?.(event);
    });

    socket.on('node:completed', (event: NodeCompletedEvent) => {
      console.log('[WebSocket] Node completed:', event);
      callbacksRef.current.onNodeCompleted?.(event);
    });

    socket.on('execution:completed', (event: ExecutionCompletedEvent) => {
      console.log('[WebSocket] Execution completed:', event);
      callbacksRef.current.onExecutionCompleted?.(event);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribeWorkflow = useCallback((workflowId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('workflow:subscribe', { workflowId });
      console.log('[WebSocket] Subscribed to workflow:', workflowId);
    }
  }, []);

  const unsubscribeWorkflow = useCallback((workflowId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('workflow:unsubscribe', { workflowId });
      console.log('[WebSocket] Unsubscribed from workflow:', workflowId);
    }
  }, []);

  const subscribe = useCallback((executionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('execution:subscribe', { executionId });
      console.log('[WebSocket] Subscribed to execution:', executionId);
    }
  }, []);

  const unsubscribe = useCallback((executionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('execution:unsubscribe', { executionId });
      console.log('[WebSocket] Unsubscribed from execution:', executionId);
    }
  }, []);

  const isConnected = useCallback(() => {
    return socketRef.current?.connected ?? false;
  }, []);

  return {
    subscribeWorkflow,
    unsubscribeWorkflow,
    subscribe,
    unsubscribe,
    isConnected,
  };
}
