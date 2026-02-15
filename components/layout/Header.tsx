import React, { useState, useRef } from 'react';
import { Play, Share2, Terminal, ChevronLeft, X, Copy, Check, RefreshCw, Key, History, Download, Upload, FileJson, Clock, User, GitCommit, ScrollText, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { useAppStore } from '../../store/useAppStore';
import { NodeStatus, ExecutionStepLog, WorkflowNode, NodeType, ExecutionLog } from '../../types';
import DeployModal from './DeployModal';
import { clsx } from 'clsx';

const Header = () => {
  const { 
    isRunning, 
    nodes, 
    edges, // Import edges to calculate dependencies
    resetStatuses, 
    setGraph, // For Import
    runWorkflow
  } = useFlowStore();
  const { navigateToDashboard, activeWorkflowId, workflows, deployWorkflow, addExecution, generateWorkflowApiKey, executions } = useAppStore();
  const [showApiModal, setShowApiModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const workflowExecutions = executions.filter(e => e.workflowId === activeWorkflowId);

  // --- Handlers for Import/Export ---
  
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
                if(confirm('导入将覆盖当前画布内容，是否继续？')) {
                    setGraph(data.nodes, data.edges);
                    // Reset statuses on import
                    resetStatuses();
                }
            } else {
                alert('文件格式无效：缺少 nodes 或 edges 数据');
            }
        } catch (err) {
            console.error(err);
            alert('解析 JSON 文件失败');
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Handlers for Execution ---

  const handleRun = async () => {
    const startTime = Date.now();
    const { success, steps } = await runWorkflow(); // Run Full Workflow
    
    // Add to execution history (Persistent Store)
    if (activeWorkflowId && activeWorkflow) {
        addExecution({
            id: `ex-${Date.now()}`,
            workflowId: activeWorkflowId,
            workflowName: activeWorkflow.name,
            status: success ? 'success' : 'failed',
            startTime: new Date().toLocaleString(),
            duration: Date.now() - startTime,
            trigger: 'manual',
            steps: steps
        });
    }
  };

  const onDeploySubmit = (version: string, description: string) => {
      if (activeWorkflowId) {
          deployWorkflow(activeWorkflowId, version, description);
      }
  };

  const handleGenerateKey = () => {
      if(activeWorkflowId) {
          generateWorkflowApiKey(activeWorkflowId);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const apiUrl = `https://api.easyflow.com/v1/workflows/${activeWorkflowId}/run`;
  const apiKeyToUse = activeWorkflow?.apiKey || 'pk_live_GLOBAL_KEY...';
  
  const curlCommand = `curl -X POST ${apiUrl} \\
  -H "Authorization: Bearer ${apiKeyToUse}" \\
  -H "Content-Type: application/json" \\
  -d '{ "input": "value" }'`;

  // Use Real History if available, otherwise mock
  const historyVersions = activeWorkflow?.history && activeWorkflow.history.length > 0 
    ? activeWorkflow.history 
    : [];

  return (
    <>
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <button 
            onClick={navigateToDashboard}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            title="返回仪表盘"
        >
            <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-6 w-px bg-gray-200"></div>
        <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none mb-1">
                {activeWorkflow?.name || '未命名工作流'}
            </h1>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 rounded">v{activeWorkflow?.versionStr || activeWorkflow?.version || '0.1.0'}</span>
                 <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium border ${
                     activeWorkflow?.status === 'active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-100 text-gray-500 border-gray-200'
                 }`}>
                    {activeWorkflow?.status === 'active' ? '已发布' : '草稿'}
                 </span>
            </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Actions Toolbar */}
        <div className="flex items-center gap-1 border-r border-gray-200 pr-3 mr-1">
            <button 
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
                title="运行记录"
            >
                <ScrollText className="h-4 w-4" />
                <span className="text-xs font-medium">运行日志</span>
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1"></div>
            <button 
                onClick={() => setShowVersionModal(true)}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors relative group"
                title="历史版本"
            >
                <History className="h-4 w-4" />
            </button>
            <button 
                onClick={handleImportClick}
                className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                title="导入工作流"
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
                title="导出工作流"
            >
                <Download className="h-4 w-4" />
            </button>
        </div>

        <button 
            onClick={() => setShowApiModal(true)}
            className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Terminal className="h-3.5 w-3.5" />
          API 文档
        </button>

        <button 
            onClick={handleRun}
            disabled={isRunning}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all
            ${isRunning ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800 active:scale-95'}
            `}
        >
          {isRunning ? (
             <>
               <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
               运行中...
             </>
          ) : (
            <>
                <Play className="h-3.5 w-3.5 fill-current" />
                试运行
            </>
          )}
        </button>
        
        <button 
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Share2 className="h-3.5 w-3.5" />
          发布
        </button>
      </div>
    </header>

    {/* Deploy Modal */}
    {showDeployModal && (
        <DeployModal 
            currentVersion={activeWorkflow?.versionStr || '0.1.0'} 
            onClose={() => setShowDeployModal(false)}
            onDeploy={onDeploySubmit}
            nodeCount={nodes.length}
        />
    )}

    {/* History / Logs Modal (Reused Logic from Dashboard but context-aware) */}
    {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
             <div className="h-full w-[800px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <ScrollText className="h-4 w-4 text-gray-500" />
                            运行日志 (Execution Logs)
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">当前工作流的所有历史执行记录。</p>
                    </div>
                    <button 
                        onClick={() => { setShowHistoryModal(false); setSelectedExec(null); }}
                        className="rounded-full p-1 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
                    {/* List View */}
                    {!selectedExec ? (
                        <div className="space-y-3">
                             {workflowExecutions.length === 0 ? (
                                 <div className="text-center py-10 text-gray-400 text-sm">暂无执行记录</div>
                             ) : (
                                 workflowExecutions.map(exec => (
                                    <div 
                                        key={exec.id}
                                        onClick={() => setSelectedExec(exec)}
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
                        // Detail View (Similar to ExecutionsView)
                        <div className="animate-in slide-in-from-right-4 duration-200">
                             <button 
                                onClick={() => setSelectedExec(null)}
                                className="mb-4 text-xs text-blue-600 hover:underline flex items-center gap-1"
                             >
                                 &larr; 返回列表
                             </button>
                             <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-gray-100">
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">状态</span>
                                        <div className={clsx(
                                            "mt-1 font-semibold text-sm capitalize flex items-center gap-1",
                                            selectedExec.status === 'success' ? "text-green-600" : "text-red-600"
                                        )}>
                                            {selectedExec.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                            {selectedExec.status}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">开始时间</span>
                                        <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.startTime}</div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">总耗时</span>
                                        <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.duration}ms</div>
                                    </div>
                                </div>

                                {/* Timeline */}
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
                                                <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 leading-relaxed overflow-x-auto border border-gray-800 shadow-sm">
                                                    {step.logs.map((log, i) => (
                                                        <div key={i} className="mb-0.5 last:mb-0">
                                                            <span className="text-gray-600 mr-2 opacity-50">$</span>
                                                            {log}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    )}
                </div>
             </div>
        </div>
    )}

    {/* API Docs Modal */}
    {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <Terminal className="h-4 w-4" /> API 调用指南
                    </h3>
                    <button onClick={() => setShowApiModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    
                    {/* API Key Section */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 block">鉴权方式 (Authorization)</label>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-white rounded border border-gray-200 shadow-sm">
                                    <Key className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold text-gray-900">工作流专属 Key</span>
                                        {activeWorkflow?.apiKey ? (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Active</span>
                                        ) : (
                                            <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">未启用</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">仅允许触发当前工作流，比全局 Key 更安全。</p>
                                    
                                    {activeWorkflow?.apiKey ? (
                                        <div className="flex items-center gap-2">
                                            <code className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-600 font-mono">
                                                {activeWorkflow.apiKey}
                                            </code>
                                            <button onClick={() => copyToClipboard(activeWorkflow.apiKey!)} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="复制">
                                                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                            <button onClick={handleGenerateKey} className="p-1.5 hover:bg-gray-200 rounded text-gray-500" title="重置 Key">
                                                <RefreshCw className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleGenerateKey}
                                            className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800 transition-colors"
                                        >
                                            生成专属 Key
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Endpoint Section */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 block mb-1">接口地址 (Endpoint)</label>
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded p-2">
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200">POST</span>
                            <code className="text-xs text-gray-800 flex-1 truncate font-mono">{apiUrl}</code>
                        </div>
                    </div>
                    
                    {/* cURL Section */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                             <label className="text-xs font-medium text-gray-500">cURL 示例</label>
                             <button 
                                onClick={() => copyToClipboard(curlCommand)}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                             >
                                 {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                 {copied ? '已复制' : '复制'}
                             </button>
                        </div>
                        <div className="bg-gray-900 rounded-md p-3 overflow-x-auto border border-gray-800">
                            <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                                {curlCommand}
                            </pre>
                        </div>
                    </div>
                </div>
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setShowApiModal(false)}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* Version History Modal */}
    {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <History className="h-4 w-4" /> 历史版本 (Version History)
                    </h3>
                    <button onClick={() => setShowVersionModal(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {historyVersions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            暂无发布记录
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
                                        {i === 0 && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Current</span>}
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 whitespace-pre-line">{v.description}</p>
                                    <div className="flex items-center gap-3 text-[10px] text-gray-400">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {v.date}</span>
                                        <span className="flex items-center gap-1"><User className="h-3 w-3" /> {v.author}</span>
                                    </div>
                                </div>
                                <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        className="text-xs border border-gray-200 rounded px-2 py-1 hover:bg-white hover:text-blue-600"
                                        onClick={() => alert(`已恢复到版本 v${v.version}`)}
                                    >
                                        回滚
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