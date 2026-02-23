import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { Play, Share2, Terminal, ChevronLeft, X, Copy, Check, RefreshCw, Key, History, Download, Upload, Clock, User, GitCommit, ScrollText, CheckCircle2, XCircle, Save, AlertTriangle, Square, Trash2 } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { useAppStore } from '../../store/useAppStore';
import { NodeStatus, ExecutionStepLog, WorkflowNode, NodeType, ExecutionLog } from '../../types';
import DeployModal from './DeployModal';
import TestRunModal from '../workflow/TestRunModal';
import { useToastStore } from '../common/Toast';
import { clsx } from 'clsx';
import { useWorkflowSocket } from '../../hooks/useWorkflowSocket';
import { api, BACKEND_URL } from '../../lib/api';
import { translations } from '../../locales';
import { formatJsonPreview } from '../../lib/responsePreviewUtils';

const UnsavedChangesDialog = ({ isOpen, onConfirm, onCancel, onSave, t }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void; onSave: () => void; t: any }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[400px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t.editor.unsavedChanges}</h3>
              <p className="text-sm text-gray-500">{t.editor.unsavedChangesDesc}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              {t.editor.dontSave}
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {t.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = () => {
  const { 
    isRunning, 
    nodes, 
    edges,
    resetStatuses, 
    setGraph,
    runWorkflow,
    stopWorkflow,
    hasUnsavedChanges,
    markAsSaved,
    currentExecutionId,
    handleExecutionStarted,
    handleNodeStarted,
    handleNodeCompleted,
    handleExecutionCompleted,
    setCurrentExecutionId,
  } = useFlowStore();
  const { workflows, deployWorkflow, loadExecutions, loadWorkflow, generateWorkflowApiKey, executions, currentTeam, updateWorkflow, rollbackWorkflow, language } = useAppStore();
  const t = translations[language];
  
  const { subscribeWorkflow, unsubscribeWorkflow } = useWorkflowSocket({
    onExecutionCreated: (event) => {
      console.log('[Header] Execution created:', event);
      setCurrentExecutionId(event.executionId);
    },
    onExecutionStarted: handleExecutionStarted,
    onNodeStarted: handleNodeStarted,
    onNodeCompleted: handleNodeCompleted,
    onExecutionCompleted: handleExecutionCompleted,
  });
  
  const navigate = useNavigate();
  const { id: activeWorkflowId } = useParams<{ id: string }>();
  const addToast = useToastStore(state => state.addToast);
  const [showApiModal, setShowApiModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTestRunModal, setShowTestRunModal] = useState(false);
  const [apiModalTab, setApiModalTab] = useState<'request' | 'response' | 'execution'>('request');
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);
  const [loadingExecDetail, setLoadingExecDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [workflowApiKey, setWorkflowApiKey] = useState<{ id: string; maskedKey: string; status: string; keyType: string } | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const workflowExecutions = executions.filter(e => e.workflowId === activeWorkflowId);

  const isAdmin = currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN';

  const getStoredFullKey = (wfId: string) => {
    try {
      return localStorage.getItem(`workflow_api_key_${wfId}`);
    } catch {
      return null;
    }
  };

  const storeFullKey = (wfId: string, key: string) => {
    try {
      localStorage.setItem(`workflow_api_key_${wfId}`, key);
    } catch {}
  };

  const clearStoredFullKey = (wfId: string) => {
    try {
      localStorage.removeItem(`workflow_api_key_${wfId}`);
    } catch {}
  };

  useEffect(() => {
    if (activeWorkflowId && currentTeam && showApiModal) {
      loadWorkflowApiKey();
      loadWorkflow(currentTeam.id, activeWorkflowId);
    }
  }, [activeWorkflowId, currentTeam, showApiModal]);

  const loadWorkflowApiKey = async () => {
    if (!currentTeam || !activeWorkflowId) return;
    setLoadingKey(true);
    try {
      const data = await api.apiKeys.getWorkflow(currentTeam.id, activeWorkflowId);
      setWorkflowApiKey(data);
      const storedKey = getStoredFullKey(activeWorkflowId);
      if (storedKey) {
        setFullKey(storedKey);
      }
    } catch (error) {
      console.error('Failed to load workflow API key:', error);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleGenerateWorkflowKey = async () => {
    if (!currentTeam || !activeWorkflowId || !isAdmin) return;
    setLoadingKey(true);
    try {
      const data = await api.apiKeys.createWorkflow(currentTeam.id, activeWorkflowId, {});
      setWorkflowApiKey(data);
      setFullKey(data.key);
      storeFullKey(activeWorkflowId, data.key);
      addToast('success', t.editor.keyGenerated);
    } catch (error: any) {
      addToast('error', t.editor.keyGenerateFailed + ': ' + error.message);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleToggleWorkflowKey = async (enabled: boolean) => {
    if (!currentTeam || !activeWorkflowId || !isAdmin || !workflowApiKey) return;
    setLoadingKey(true);
    try {
      await api.apiKeys.toggleWorkflow(currentTeam.id, activeWorkflowId, { enabled });
      setWorkflowApiKey({ ...workflowApiKey, status: enabled ? 'active' : 'disabled' });
      addToast('success', enabled ? t.editor.keyEnabled : t.editor.keyDisabled);
    } catch (error: any) {
      addToast('error', t.editor.operationFailed + ': ' + error.message);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleDeleteWorkflowKey = async () => {
    if (!currentTeam || !activeWorkflowId || !isAdmin || !workflowApiKey) return;
    if (!confirm(t.editor.confirmDeleteKey)) return;
    setLoadingKey(true);
    try {
      await api.apiKeys.deleteWorkflow(currentTeam.id, activeWorkflowId);
      setWorkflowApiKey(null);
      setFullKey(null);
      clearStoredFullKey(activeWorkflowId);
      addToast('success', t.editor.keyDeleted);
    } catch (error: any) {
      addToast('error', t.editor.operationFailed + ': ' + error.message);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleSave = async (showToast = true) => {
    if (!activeWorkflowId || !currentTeam) return;
    
    setIsSaving(true);
    try {
      const definition = { nodes, edges };
      await updateWorkflow(currentTeam.id, activeWorkflowId, { definition });
      markAsSaved();
      if (showToast) {
        addToast('success', t.editor.saveSuccess);
      }
    } catch (error: any) {
      addToast('error', t.editor.saveFailed + ': ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateBack = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      setPendingNavigation(() => () => navigate('/'));
    } else {
      navigate('/');
    }
  }, [hasUnsavedChanges, navigate]);

  const handleConfirmNavigation = () => {
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const handleSaveAndNavigate = async () => {
    await handleSave(false);
    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeWorkflowId, currentTeam, nodes, edges]);

  useEffect(() => {
    if (activeWorkflowId) {
      subscribeWorkflow(activeWorkflowId);
      loadExecutions();
      return () => {
        unsubscribeWorkflow(activeWorkflowId);
      };
    }
  }, [activeWorkflowId, subscribeWorkflow, unsubscribeWorkflow]);

  const handleExport = () => {
    if (!activeWorkflow) return;
    const exportData = {
        meta: activeWorkflow,
        nodes: nodes,
        edges: edges,
        exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeWorkflow.name.replace(/\s+/g, '_')}_v${activeWorkflow.version}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            
            if (data.nodes && data.edges) {
                if(confirm(t.editor.importConfirm)) {
                    setGraph(data.nodes, data.edges);
                    resetStatuses();
                }
            } else {
                alert(t.editor.invalidFormat);
            }
        } catch (err) {
            console.error(err);
            alert(t.editor.parseFailed);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleRun = async () => {
    if (isRunning) {
      stopWorkflow();
      return;
    }
    
    if (hasUnsavedChanges) {
      addToast('warning', t.editor.saveBeforeRun);
      return;
    }
    
    const startNode = nodes.find(n => n.data.type === NodeType.START);
    const triggerType = startNode?.data.config?.triggerType || 'manual';
    
    if (triggerType === 'form' || triggerType === 'webhook') {
      setShowTestRunModal(true);
    } else {
      await executeWorkflow({});
    }
  };

  const executeWorkflow = async (input: any) => {
    await runWorkflow(input, undefined, activeWorkflowId, currentTeam?.id);
    await loadExecutions();
  };

  const handleTestRun = (input: any) => {
    setShowTestRunModal(false);
    executeWorkflow(input);
  };

  const getStartNodeConfig = () => {
    const startNode = nodes.find(n => n.data.type === NodeType.START);
    return startNode?.data.config || {};
  };

  const getEndNodeConfig = () => {
    const endNode = nodes.find(n => n.data.type === NodeType.END);
    return endNode?.data.config || {};
  };

  const onDeploySubmit = (version: string, description: string) => {
      if (activeWorkflowId) {
          deployWorkflow(activeWorkflowId, version, description);
          markAsSaved();
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectExecution = async (exec: ExecutionLog) => {
    if (!currentTeam) return;
    
    setLoadingExecDetail(true);
    try {
      const detail = await api.executions.get(currentTeam.id, exec.id);
      setSelectedExec({
        ...exec,
        steps: (detail.steps || []).map((s: any) => ({
          nodeId: s.nodeId,
          nodeLabel: s.nodeLabel,
          status: s.status,
          duration: s.duration || 0,
          logs: Array.isArray(s.logs) ? s.logs : [],
          input: s.inputData,
          output: s.outputData,
        })),
        input: detail.inputData,
        output: detail.outputData,
      });
    } catch (error) {
      console.error('Failed to load execution detail:', error);
      setSelectedExec(exec);
    } finally {
      setLoadingExecDetail(false);
    }
  };

  const apiUrl = `${BACKEND_URL}/api/v1/hooks/${activeWorkflowId}`;
  const startConfig = getStartNodeConfig();
  const httpMethod = startConfig.webhookMethod || 'POST';
  const apiKeyToUse = fullKey || workflowApiKey?.maskedKey || 'YOUR_API_KEY';
  
  const getRequestBodyExample = () => {
    const config = getStartNodeConfig();
    const triggerType = config.triggerType || 'webhook';
    const formFields = config.formFields || [];
    
    if (triggerType === 'form' && formFields.length > 0) {
      const exampleBody: Record<string, any> = {};
      formFields.forEach((field: any) => {
        switch (field.type) {
          case 'number': exampleBody[field.key] = 123; break;
          case 'boolean': exampleBody[field.key] = true; break;
          case 'email': exampleBody[field.key] = 'user@example.com'; break;
          default: exampleBody[field.key] = field.placeholder || `示例${field.label}`;
        }
      });
      return JSON.stringify(exampleBody, null, 2);
    }
    
    return '{\n  "input": "value"\n}';
  };

  const getResponseExample = (success: boolean) => {
    const endConfig = getEndNodeConfig();
    const responseBody = endConfig.responseBody || '';
    
    if (success && responseBody) {
      return formatJsonPreview(responseBody, nodes);
    }
    
    if (success) {
      return `{
  "executionId": "exec_abc123",
  "status": "success",
  "message": "${language === 'zh' ? '工作流执行成功' : 'Workflow executed successfully'}",
  "data": {
    "result": "${language === 'zh' ? '处理结果' : 'Processing result'}"
  }
}`;
    }
    return `{
  "executionId": "exec_abc123",
  "status": "failed",
  "message": "${language === 'zh' ? '执行失败' : 'Execution failed'}: ${language === 'zh' ? '错误信息' : 'error message'}",
  "error": {
    "nodeId": "node-1",
    "nodeLabel": "HTTP ${language === 'zh' ? '请求' : 'Request'}",
    "message": "${language === 'zh' ? '请求超时' : 'Request timeout'}"
  }
}`;
  };

  const requestBody = getRequestBodyExample();
  const curlCommand = `curl -X ${httpMethod} ${apiUrl} \\
  -H "Authorization: Bearer ${apiKeyToUse}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBody.replace(/\n/g, ' ').replace(/\s+/g, ' ')}'`;

  const historyVersions = activeWorkflow?.history && activeWorkflow.history.length > 0 
    ? activeWorkflow.history 
    : [];

  return (
    <>
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <button 
            onClick={handleNavigateBack}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title={t.editor.returnDashboard}
        >
            <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-gray-200"></div>
        <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none mb-1">
                {activeWorkflow?.name || t.editor.untitledWorkflow}
            </h1>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 rounded">v{activeWorkflow?.versionStr || activeWorkflow?.version || '0.1.0'}</span>
                 <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                     activeWorkflow?.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                 }`}>
                    {activeWorkflow?.status === 'active' ? t.editor.published : t.editor.draft}
                 </span>
                 {hasUnsavedChanges && (
                   <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                     {t.editor.unsaved}
                   </span>
                 )}
            </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
            <button 
                onClick={() => { loadExecutions(); setShowHistoryModal(true); }}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
                title={t.editor.runLog}
            >
                <ScrollText className="h-4 w-4" />
                <span className="text-xs font-medium">{t.editor.logs}</span>
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button 
                onClick={() => setShowVersionModal(true)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors relative group"
                title={t.editor.history}
            >
                <History className="h-4 w-4" />
            </button>
            <button 
                onClick={handleImportClick}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title={t.editor.importWorkflow}
            >
                <Upload className="h-4 w-4" />
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImportFile} 
                    accept=".json" 
                    className="hidden" 
                />
            </button>
            <button 
                onClick={handleExport}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title={t.editor.exportWorkflow}
            >
                <Download className="h-4 w-4" />
            </button>
        </div>

        <button 
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Terminal className="h-3.5 w-3.5" />
          {t.editor.apiDocs}
        </button>

        <button 
            onClick={() => handleSave()}
            disabled={isSaving || !hasUnsavedChanges}
            className={clsx(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              hasUnsavedChanges 
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                : "bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200"
            )}
            title={`${t.editor.saveDraft} (Ctrl+S)`}
        >
          {isSaving ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {t.editor.saveDraft}
        </button>

        <button 
            onClick={handleRun}
            disabled={false}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all
            ${isRunning ? 'bg-red-600 hover:bg-red-700 active:scale-95' : 'bg-black hover:bg-gray-800 active:scale-95'}
            `}
        >
          {isRunning ? (
             <>
               <Square className="h-3.5 w-3.5 fill-current" />
               {t.editor.stop}
             </>
          ) : (
            <>
                <Play className="h-3.5 w-3.5 fill-current" />
                {t.editor.testRun}
            </>
          )}
        </button>
        
        <button 
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Share2 className="h-3.5 w-3.5" />
          {t.editor.deploy}
        </button>
      </div>
    </header>

    <UnsavedChangesDialog 
      isOpen={showUnsavedDialog}
      onConfirm={handleConfirmNavigation}
      onCancel={() => setShowUnsavedDialog(false)}
      onSave={handleSaveAndNavigate}
      t={t}
    />

    {showDeployModal && (
        <DeployModal 
            currentVersion={activeWorkflow?.versionStr || '0.1.0'} 
            onClose={() => setShowDeployModal(false)}
            onDeploy={onDeploySubmit}
            nodeCount={nodes.length}
        />
    )}

    {showTestRunModal && (
        <TestRunModal
          isOpen={showTestRunModal}
          onClose={() => setShowTestRunModal(false)}
          onRun={handleTestRun}
          triggerType={getStartNodeConfig().triggerType || 'manual'}
          formFields={getStartNodeConfig().formFields || []}
          formTitle={getStartNodeConfig().formTitle}
          isRunning={isRunning}
        />
    )}

    {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
             <div className="h-full w-[800px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ScrollText className="h-4 w-4 text-gray-500" />
                            {t.editor.executionLogs}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{t.editor.executionLogsDesc}</p>
                    </div>
                    <button 
                        onClick={() => { setShowHistoryModal(false); setSelectedExec(null); }}
                        className="rounded-full p-1 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    {!selectedExec ? (
                        <div className="space-y-3">
                             {workflowExecutions.length === 0 ? (
                                 <div className="text-center py-10 text-gray-400 text-sm">{t.editor.noExecutions}</div>
                             ) : (
                                 workflowExecutions.map(exec => (
                                    <div 
                                        key={exec.id}
                                        onClick={() => handleSelectExecution(exec)}
                                        className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={clsx(
                                                    "flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded uppercase",
                                                    exec.status === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                                                )}>
                                                    {exec.status === 'success' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                    {exec.status}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono">#{exec.id}</span>
                                            </div>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {exec.startTime}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>Duration: {exec.duration}ms</span>
                                            <span className="bg-gray-100 px-2 py-0.5 rounded">{exec.trigger}</span>
                                        </div>
                                    </div>
                                 ))
                             )}
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-right-4 duration-200">
                             <button 
                                onClick={() => setSelectedExec(null)}
                                className="mb-4 text-xs text-blue-600 hover:underline flex items-center gap-1"
                             >
                                 &larr; {t.editor.returnList}
                             </button>
                             {loadingExecDetail ? (
                               <div className="flex items-center justify-center py-10">
                                 <div className="h-6 w-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                               </div>
                             ) : (
                             <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.editor.statusLabel}</span>
                                        <div className={clsx(
                                            "mt-1 font-semibold text-sm capitalize flex items-center gap-1",
                                            selectedExec.status === 'success' ? "text-green-600" : "text-red-600"
                                        )}>
                                            {selectedExec.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                            {selectedExec.status}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.editor.startTime}</span>
                                        <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.startTime}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.editor.totalDuration}</span>
                                        <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.duration}ms</div>
                                    </div>
                                </div>

                                <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                                    {(selectedExec.steps || []).map((step, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className={clsx(
                                                "absolute left-[-20px] top-0 h-10 w-10 flex items-center justify-center rounded-full border-4 border-white shadow-sm z-10 transition-colors",
                                                step.status === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                            )}>
                                                {step.status === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                            </div>
                                            <div className="ml-8">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-semibold text-gray-900">{step.nodeLabel}</span>
                                                    <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 rounded">{step.duration}ms</span>
                                                </div>
                                                
                                                {step.logs && step.logs.length > 0 && (
                                                  <div className="mb-2">
                                                    <div className="text-[10px] text-gray-500 font-medium mb-1">日志</div>
                                                    <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 leading-relaxed overflow-x-auto border border-gray-800 shadow-sm">
                                                        {step.logs.map((log, i) => (
                                                            <div key={i} className="mb-0.5 last:mb-0">
                                                                <span className="text-gray-600 mr-2 opacity-50">$</span>
                                                                {log}
                                                            </div>
                                                        ))}
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {step.input && (
                                                  <div className="mb-2">
                                                    <div className="text-[10px] text-gray-500 font-medium mb-1">输入</div>
                                                    <div className="bg-blue-50 rounded-md p-2 font-mono text-[10px] text-blue-800 leading-relaxed overflow-x-auto border border-blue-100">
                                                      <pre className="whitespace-pre-wrap">{typeof step.input === 'string' ? step.input : JSON.stringify(step.input, null, 2)}</pre>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                {step.output && (
                                                  <div className="mb-2">
                                                    <div className="text-[10px] text-gray-500 font-medium mb-1">输出</div>
                                                    <div className="bg-green-50 rounded-md p-2 font-mono text-[10px] text-green-800 leading-relaxed overflow-x-auto border border-green-100">
                                                      <pre className="whitespace-pre-wrap">{typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}</pre>
                                                    </div>
                                                  </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {(!selectedExec.steps || selectedExec.steps.length === 0) && (
                                      <div className="text-center py-6 text-gray-400 text-xs">
                                        暂无节点执行详情
                                      </div>
                                    )}
                                </div>
                             </div>
                             )}
                        </div>
                    )}
                </div>
             </div>
        </div>
    )}

    {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[720px] max-h-[90vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> {t.editor.apiGuide}
                    </h3>
                    <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 block">{t.editor.authorization}</label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded border border-gray-200 shadow-sm">
                                    <Key className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">{t.editor.workflowKey}</span>
                                        {workflowApiKey ? (
                                            <span className={clsx(
                                                "text-[10px] px-2 py-0.5 rounded-full border",
                                                workflowApiKey.status === 'active'
                                                    ? "bg-green-100 text-green-700 border-green-200"
                                                    : "bg-gray-200 text-gray-600 border-gray-300"
                                            )}>
                                                {workflowApiKey.status === 'active' ? 'Active' : 'Disabled'}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{t.editor.notEnabled}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{t.editor.workflowKeyDesc}</p>
                                    
                                    {loadingKey ? (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                            {t.editor.loading2}
                                        </div>
                                    ) : workflowApiKey ? (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 font-mono">
                                                    {fullKey || workflowApiKey.maskedKey}
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(fullKey || workflowApiKey.maskedKey)} 
                                                    className="p-1.5 hover:bg-gray-200 rounded text-gray-500" 
                                                    title={t.editor.copy}
                                                >
                                                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                            {isAdmin && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleToggleWorkflowKey(workflowApiKey.status !== 'active')}
                                                        className={clsx(
                                                            "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                                                            workflowApiKey.status === 'active' ? "bg-green-600" : "bg-gray-300"
                                                        )}
                                                    >
                                                        <span className={clsx(
                                                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                                                            workflowApiKey.status === 'active' ? "translate-x-5" : "translate-x-0.5"
                                                        )} />
                                                    </button>
                                                    <button 
                                                        onClick={handleGenerateWorkflowKey}
                                                        className="p-1.5 hover:bg-gray-200 rounded text-gray-500" 
                                                        title={t.editor.regenerate}
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={handleDeleteWorkflowKey}
                                                        className="p-1.5 hover:bg-red-50 rounded text-red-500" 
                                                        title={t.common.delete}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        isAdmin && (
                                            <button 
                                                onClick={handleGenerateWorkflowKey}
                                                className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
                                            >
                                                {t.editor.generateWorkflowKey}
                                            </button>
                                        )
                                    )}
                                    {!isAdmin && !workflowApiKey && (
                                        <p className="text-xs text-gray-400">{t.editor.adminOnly}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">{t.editor.endpoint}</label>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200">{httpMethod}</span>
                            <code className="text-xs text-gray-800 flex-1 truncate font-mono">{apiUrl}</code>
                        </div>
                    </div>

                    <div>
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-3">
                            <button
                                onClick={() => setApiModalTab('request')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                    apiModalTab === 'request' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {t.editor.requestExample}
                            </button>
                            <button
                                onClick={() => setApiModalTab('response')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                    apiModalTab === 'response' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {t.editor.responseExample}
                            </button>
                            <button
                                onClick={() => setApiModalTab('execution')}
                                className={clsx(
                                    "flex-1 py-1.5 text-xs font-medium rounded-md transition-all",
                                    apiModalTab === 'execution' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {t.editor.executionQuery}
                            </button>
                        </div>

                        {apiModalTab === 'request' ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-500">{t.editor.requestBody}</label>
                                    <button 
                                        onClick={() => copyToClipboard(requestBody)}
                                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copied ? t.editor.copied : t.editor.copy}
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-800">
                                    <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                                        {requestBody}
                                    </pre>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-gray-500">{t.editor.curlCommand}</label>
                                    <button 
                                        onClick={() => copyToClipboard(curlCommand)}
                                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {copied ? t.editor.copied : t.editor.copy}
                                    </button>
                                </div>
                                <div className="bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-800">
                                    <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                                        {curlCommand}
                                    </pre>
                                </div>

                                {getStartNodeConfig().formFields?.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700">
                                        <strong>{t.editor.formFieldDesc}</strong>
                                        <ul className="mt-1 space-y-0.5">
                                            {getStartNodeConfig().formFields.map((field: any) => (
                                                <li key={field.id} className="flex items-center gap-2">
                                                    <code className="bg-blue-100 px-1 rounded">{field.key}</code>
                                                    <span className="text-blue-600">{field.label}</span>
                                                    {field.required && <span className="text-red-500">*</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ) : apiModalTab === 'response' ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-2 block">{t.editor.successResponse}</label>
                                    <div className="bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-800">
                                        <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                                            {getResponseExample(true)}
                                        </pre>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-2 block">{t.editor.errorResponse}</label>
                                    <div className="bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-800">
                                        <pre className="text-[10px] text-red-400 font-mono whitespace-pre-wrap leading-relaxed">
                                            {getResponseExample(false)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        ) : apiModalTab === 'execution' ? (
                            <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700">
                                    <strong>{language === 'zh' ? '说明：' : 'Note:'}</strong> {t.editor.executionQueryDesc}
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">GET</span>
                                                <span className="text-xs font-medium text-gray-900">{t.editor.queryProgress}</span>
                                            </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                                                <code className="text-[10px] text-gray-800 flex-1 font-mono">
                                                    GET {BACKEND_URL}/api/v1/teams/{currentTeam?.id}/executions/{`{executionId}`}/progress
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(`GET ${BACKEND_URL}/api/v1/teams/${currentTeam?.id}/executions/{executionId}/progress`)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500">{t.editor.queryProgressDesc}</p>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">GET</span>
                                                <span className="text-xs font-medium text-gray-900">{t.editor.queryHistory}</span>
                                            </div>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                                                <code className="text-[10px] text-gray-800 flex-1 font-mono">
                                                    GET {BACKEND_URL}/api/v1/teams/{currentTeam?.id}/executions?limit=20&offset=0
                                                </code>
                                                <button 
                                                    onClick={() => copyToClipboard(`GET ${BACKEND_URL}/api/v1/teams/${currentTeam?.id}/executions?limit=20&offset=0`)}
                                                    className="p-1 hover:bg-gray-200 rounded text-gray-400"
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-gray-500">{language === 'zh' ? '获取工作流的执行历史列表，支持分页查询。' : 'Get workflow execution history list with pagination support.'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setShowApiModal(false)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        {t.common.confirm}
                    </button>
                </div>
            </div>
        </div>
    )}

    {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <History className="h-4 w-4" /> {t.dashboard.versionHistory}
                    </h3>
                    <button onClick={() => setShowVersionModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {historyVersions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            {language === 'zh' ? '暂无发布记录' : 'No published versions yet'}
                        </div>
                    ) : (
                        historyVersions.map((v, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 group">
                                <div className="mt-1 flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                        <GitCommit className="h-4 w-4" />
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-gray-900 text-sm">v{v.version}</span>
                                        {v.version === activeWorkflow?.versionStr && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t.dashboard.currentVersion}</span>}
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 whitespace-pre-line">{v.description}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {v.date}</span>
                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {v.author}</span>
                                    </div>
                                </div>
                                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-white hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                        onClick={async () => {
                                          if (!currentTeam || !activeWorkflowId) return;
                                          
                                          try {
                                            const result = await rollbackWorkflow(currentTeam.id, activeWorkflowId, v.version);
                                            
                                            if (result && result.definition) {
                                              const definition = result.definition as { nodes?: any[]; edges?: any[] };
                                              if (definition.nodes && definition.edges) {
                                                setGraph(definition.nodes, definition.edges);
                                                resetStatuses();
                                                markAsSaved();
                                              }
                                            }
                                            
                                            addToast('success', language === 'zh' ? `已成功回滚到版本 v${v.version}` : `Rolled back to version v${v.version}`);
                                            setShowVersionModal(false);
                                          } catch (error: any) {
                                            addToast('error', language === 'zh' ? `回滚失败: ${error.message}` : `Rollback failed: ${error.message}`);
                                          }
                                        }}
                                    >
                                        {t.dashboard.rollback}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default Header;
