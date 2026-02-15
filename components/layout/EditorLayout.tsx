import React from 'react';
import Sidebar from '../Sidebar';
import WorkflowCanvas from '../flow/WorkflowCanvas';
import PropertiesPanel from '../PropertiesPanel';
import Header from './Header';
import RunTracePanel from '../flow/RunTracePanel';
import McpCopilot from '../ai/McpCopilot';

const EditorLayout = () => {
  return (
    <div className="flex h-screen w-screen flex-col bg-white overflow-hidden animate-in fade-in duration-300">
      <Header />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="relative flex-1 bg-gray-50 flex flex-col overflow-hidden">
          <div className="flex-1 relative">
             <WorkflowCanvas />
             <PropertiesPanel />
             <McpCopilot /> {/* Floating Copilot */}
          </div>
          <RunTracePanel />
        </main>
      </div>
    </div>
  );
};

export default EditorLayout;