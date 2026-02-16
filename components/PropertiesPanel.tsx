import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Save, Clock, FileText, Activity, Settings, X, Bookmark, Globe, Play, Box, Workflow, Brain, Database, PlayCircle } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import { useAppStore } from '../store/useAppStore';
import { NodeStatus, NodeType } from '../types';
import { translations } from '../locales';

// Import separated config components
import StartNodeConfig from './nodes/config/StartNodeConfig';
import ApiNodeConfig from './nodes/config/ApiNodeConfig';
import ProcessNodeConfig from './nodes/config/ProcessNodeConfig';
import ConditionNodeConfig from './nodes/config/ConditionNodeConfig';
import LlmNodeConfig from './nodes/config/LlmNodeConfig';
import DelayNodeConfig from './nodes/config/DelayNodeConfig';
import DbNodeConfig from './nodes/config/DbNodeConfig';
import EndNodeConfig from './nodes/config/EndNodeConfig';

const PropertiesPanel = () => {
  const { selectedNodeId, nodes, updateNodeData, updateNodeConfig, setSelectedNode, runWorkflow, isRunning } = useFlowStore();
  const { saveNodeTemplate, language, activeWorkflowId, addExecution, workflows } = useAppStore();
  const t = translations[language].editor;
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config');
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveTags, setSaveTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);

  useEffect(() => {
    if (selectedNode) {
        setSaveName(selectedNode.data.label);
        setSaveTags([]);
    }
  }, [selectedNodeId]);

  if (!selectedNode) {
    return null;
  }

  const { config } = selectedNode.data;

  // --- Handlers ---

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNodeData(selectedNode.id, { label: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(selectedNode.id, { description: e.target.value });
  };

  const updateConfig = (key: string, value: any) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentTag.trim()) {
          e.preventDefault();
          if(!saveTags.includes(currentTag.trim())) {
              setSaveTags([...saveTags, currentTag.trim()]);
          }
          setCurrentTag('');
      }
  };

  const removeTag = (tag: string) => {
      setSaveTags(saveTags.filter(t => t !== tag));
  };

  const handleSaveFavorite = () => {
      if(!saveName.trim()) return;
      saveNodeTemplate(selectedNode.data, saveName, saveTags);
      setShowSavePopover(false);
      alert('已保存到收藏夹');
  };

  const handleRunToNode = async () => {
      if(isRunning) return;
      
      const startTime = Date.now();
      const { success, steps } = await runWorkflow(selectedNode.id);

      if (activeWorkflowId && activeWorkflow) {
        addExecution({
            id: `ex-${Date.now()}`,
            workflowId: activeWorkflowId,
            workflowName: activeWorkflow.name,
            status: success ? 'success' : 'failed',
            startTime: new Date().toLocaleString(),
            duration: Date.now() - startTime,
            trigger: 'partial', // Mark as partial run
            steps: steps
        });
    }
  }

  return (
    <div className="absolute right-4 top-4 bottom-4 flex w-96 flex-col rounded-xl border border-gray-200 bg-white shadow-xl z-20 overflow-hidden animate-in slide-in-from-right-10 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4 bg-gray-50/50">
        <div className="flex items-center gap-2">
           {selectedNode.data.type === NodeType.START && <Play className="h-4 w-4 text-blue-600" />}
           {selectedNode.data.type === NodeType.API_REQUEST && <Globe className="h-4 w-4 text-purple-600" />}
           {selectedNode.data.type === NodeType.PROCESS && <Settings className="h-4 w-4 text-orange-600" />}
           {selectedNode.data.type === NodeType.CONDITION && <Workflow className="h-4 w-4 text-orange-500" />}
           {selectedNode.data.type === NodeType.LLM && <Brain className="h-4 w-4 text-purple-600" />}
           {selectedNode.data.type === NodeType.DELAY && <Clock className="h-4 w-4 text-yellow-600" />}
           {selectedNode.data.type === NodeType.DB_QUERY && <Database className="h-4 w-4 text-blue-500" />}
           {selectedNode.data.type === NodeType.END && <Box className="h-4 w-4 text-gray-600" />}
           <span className="text-xs font-bold text-gray-400 uppercase">{selectedNode.data.type} 节点</span>
        </div>
        
        <div className="flex items-center gap-1">
             <button 
                onClick={handleRunToNode}
                disabled={isRunning}
                className={clsx(
                    "flex items-center gap-1 rounded-md px-2 py-1 transition-colors border shadow-sm",
                    isRunning 
                        ? "bg-gray-100 text-gray-400 border-transparent cursor-not-allowed" 
                        : "bg-white text-green-700 border-green-200 hover:bg-green-50"
                )}
                title={t.runPartial}
             >
                 {isRunning ? (
                     <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                 ) : (
                     <PlayCircle className="h-3.5 w-3.5" />
                 )}
                 <span className="text-[10px] font-medium hidden sm:inline">{t.runPartial}</span>
             </button>

             <div className="relative">
                <button 
                    onClick={() => setShowSavePopover(!showSavePopover)}
                    className="rounded-md p-1 hover:bg-yellow-100 text-gray-400 hover:text-yellow-600 transition-colors"
                    title="收藏到组件库"
                >
                    <Bookmark className="h-4 w-4" />
                </button>
                {/* Save Popover */}
                {showSavePopover && (
                    <div className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl p-4 animate-in fade-in zoom-in-95 duration-100">
                        <h4 className="text-xs font-bold text-gray-900 mb-3 flex items-center gap-1">
                            <Bookmark className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            收藏节点配置
                        </h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">名称</label>
                                <input 
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-blue-500"
                                    value={saveName}
                                    onChange={e => setSaveName(e.target.value)}
                                    placeholder="我的自定义节点"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500 block mb-1">标签 (回车添加)</label>
                                <div className="border border-gray-200 rounded bg-white px-2 py-1 min-h-[30px] flex flex-wrap gap-1">
                                    {saveTags.map(tag => (
                                        <span key={tag} className="bg-gray-100 text-gray-600 text-[10px] px-1 rounded flex items-center gap-0.5">
                                            {tag}
                                            <X className="h-2 w-2 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)}/>
                                        </span>
                                    ))}
                                    <input 
                                        className="text-xs outline-none flex-1 min-w-[50px] bg-transparent"
                                        value={currentTag}
                                        onChange={e => setCurrentTag(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        placeholder={saveTags.length === 0 ? "如: 钉钉, 通知" : ""}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setShowSavePopover(false)} className="text-xs text-gray-500 hover:text-gray-900">取消</button>
                                <button onClick={handleSaveFavorite} className="text-xs bg-black text-white px-3 py-1 rounded hover:bg-gray-800">保存</button>
                            </div>
                        </div>
                    </div>
                )}
             </div>
            <div className="w-px h-4 bg-gray-300 mx-1"></div>
            <button 
            onClick={() => setSelectedNode(null)}
            className="rounded-md p-1 hover:bg-gray-200 text-gray-500 transition-colors"
            >
            <X className="h-4 w-4" />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('config')}
          className={clsx(
            "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'config' 
              ? "border-black text-black" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          配置
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={clsx(
            "flex-1 py-3 text-sm font-medium transition-colors border-b-2",
            activeTab === 'logs' 
              ? "border-black text-black" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          运行日志
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'config' ? (
          <div className="space-y-6">
            {/* Common Fields */}
            <div className="space-y-3 pb-4 border-b border-gray-100">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">节点名称</label>
                <input
                  type="text"
                  value={selectedNode.data.label}
                  onChange={handleLabelChange}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all"
                />
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">描述</label>
                <textarea
                  value={selectedNode.data.description}
                  onChange={handleDescriptionChange}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all resize-none text-gray-600"
                />
              </div>
            </div>

            {/* Specific Config */}
            <div className="animate-in fade-in duration-300">
                {selectedNode.data.type === NodeType.START && (
                    <StartNodeConfig config={config} onChange={updateConfig} nodeId={selectedNode.id} />
                )}
                {selectedNode.data.type === NodeType.API_REQUEST && (
                    <ApiNodeConfig 
                        config={config} 
                        onChange={updateConfig} 
                        nodes={nodes} 
                        currentNodeId={selectedNode.id} 
                    />
                )}
                {selectedNode.data.type === NodeType.PROCESS && (
                    <ProcessNodeConfig 
                        config={config} 
                        onChange={updateConfig} 
                        nodes={nodes} 
                        currentNodeId={selectedNode.id} 
                    />
                )}
                {selectedNode.data.type === NodeType.CONDITION && (
                    <ConditionNodeConfig 
                        config={config} 
                        onChange={updateConfig} 
                        nodes={nodes} 
                        currentNodeId={selectedNode.id} 
                    />
                )}
                {selectedNode.data.type === NodeType.LLM && (
                    <LlmNodeConfig 
                        config={config} 
                        onChange={updateConfig} 
                        nodes={nodes} 
                        currentNodeId={selectedNode.id} 
                    />
                )}
                {selectedNode.data.type === NodeType.DELAY && (
                    <DelayNodeConfig config={config} onChange={updateConfig} />
                )}
                {selectedNode.data.type === NodeType.DB_QUERY && (
                    <DbNodeConfig config={config} onChange={updateConfig} nodes={nodes} currentNodeId={selectedNode.id} />
                )}
                {selectedNode.data.type === NodeType.END && (
                    <EndNodeConfig 
                        config={config} 
                        onChange={updateConfig} 
                        nodes={nodes} 
                        currentNodeId={selectedNode.id} 
                    />
                )}
            </div>

          </div>
        ) : (
          <div className="space-y-4">
             {/* Status Card */}
             <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-500">状态</span>
                    <span className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded-full capitalize",
                        selectedNode.data.status === NodeStatus.SUCCESS && "bg-green-100 text-green-700",
                        selectedNode.data.status === NodeStatus.ERROR && "bg-red-100 text-red-700",
                        selectedNode.data.status === NodeStatus.RUNNING && "bg-blue-100 text-blue-700",
                        selectedNode.data.status === NodeStatus.IDLE && "bg-gray-200 text-gray-600",
                        selectedNode.data.status === NodeStatus.SKIPPED && "bg-yellow-100 text-yellow-700",
                    )}>{selectedNode.data.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>耗时: {selectedNode.data.duration || 0}ms</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-600">
                        <Activity className="h-3 w-3" />
                        <span>重试: 0</span>
                    </div>
                </div>
             </div>

             <div>
                <h3 className="mb-2 text-xs font-semibold text-gray-900 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    控制台输出
                </h3>
                <div className="rounded-md border border-gray-200 bg-gray-900 text-gray-300 p-3 font-mono text-[10px] leading-relaxed min-h-[150px] overflow-auto max-h-[300px]">
                    {selectedNode.data.logs && selectedNode.data.logs.length > 0 ? (
                        selectedNode.data.logs.map((log, i) => (
                            <div key={i} className="mb-1 border-b border-gray-800 pb-1 last:border-0">
                                <span className="text-gray-500 mr-2 block text-[9px]">{new Date().toLocaleTimeString()}</span>
                                <span className="break-all">{log}</span>
                            </div>
                        ))
                    ) : (
                        <span className="text-gray-600 italic">暂无日志。运行工作流以查看输出。</span>
                    )}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button 
            className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 transition-colors shadow-sm"
            onClick={() => setSelectedNode(null)}
          >
              <Save className="h-3 w-3" />
              完成
          </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;