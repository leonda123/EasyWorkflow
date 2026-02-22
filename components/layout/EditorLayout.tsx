import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import WorkflowCanvas from '../flow/WorkflowCanvas';
import PropertiesPanel from '../PropertiesPanel';
import Header from './Header';
import RunTracePanel from '../flow/RunTracePanel';
import McpCopilot from '../ai/McpCopilot';
import { useAppStore } from '../../store/useAppStore';
import { useFlowStore } from '../../store/useFlowStore';

const EditorLayout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadWorkflow, currentTeam, isAuthenticated, checkAuth, teams } = useAppStore();
  const { setGraph, resetStatuses, markAsSaved, clearTraceLogs, setRunning, stopWorkflow, isRunning, setCurrentWorkflowId, currentWorkflowId, tracePosition } = useFlowStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      
      try {
        await checkAuth();
      } catch {
        navigate('/login');
        return;
      }
    };
    init();
  }, [checkAuth, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    if (id !== currentWorkflowId) {
      if (isRunning) {
        stopWorkflow();
      }
      clearTraceLogs();
      setRunning(false);
      setCurrentWorkflowId(id || null);
    }
    
    const loadWorkflowData = async () => {
      if (!id) {
        setIsLoading(false);
        return;
      }

      const team = currentTeam || teams[0];
      if (!team) {
        setIsLoading(false);
        return;
      }

      try {
        const workflow = await loadWorkflow(team.id, id);
        if (workflow && workflow.definition) {
          const definition = workflow.definition as { nodes?: any[]; edges?: any[] };
          if (definition.nodes && definition.edges) {
            setGraph(definition.nodes, definition.edges);
            resetStatuses();
            markAsSaved();
          }
        }
        markAsSaved();
      } catch (error) {
        console.error('Failed to load workflow:', error);
      }
      
      setIsLoading(false);
    };

    loadWorkflowData();
  }, [id, currentTeam?.id, isAuthenticated, teams.length]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
          <span className="text-sm text-gray-500">加载中...</span>
        </div>
      </div>
    );
  }

  const isRightPanel = tracePosition === 'right';

  return (
    <div className="flex h-screen w-screen flex-col bg-white overflow-hidden animate-in fade-in duration-300">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="relative flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
             <WorkflowCanvas />
             <PropertiesPanel />
             <McpCopilot />
          </div>
          {!isRightPanel && <RunTracePanel />}
        </main>
        {isRightPanel && <RunTracePanel />}
      </div>
    </div>
  );
};

export default EditorLayout;
