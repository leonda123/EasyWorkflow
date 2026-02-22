import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Workflow, Info, Code, ChevronRight, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { api } from '../../../lib/api';

interface WorkflowCallNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodeId: string;
}

const WorkflowCallNodeConfig: React.FC<WorkflowCallNodeConfigProps> = ({ config, onChange, nodeId }) => {
    const { currentTeam, workflows } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [targetWorkflow, setTargetWorkflow] = useState<any>(null);
    
    const targetWorkflowId = config?.targetWorkflowId || '';
    const inputMapping = config?.inputMapping || {};
    
    useEffect(() => {
        if (targetWorkflowId) {
            loadWorkflowDetails(targetWorkflowId);
        }
    }, [targetWorkflowId]);
    
    const loadWorkflowDetails = async (id: string) => {
        if (!currentTeam) return;
        setLoading(true);
        try {
            const wf = await api.workflows.get(currentTeam.id, id);
            setTargetWorkflow(wf);
        } catch (error) {
            console.error('Failed to load workflow:', error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleWorkflowSelect = (id: string) => {
        onChange('targetWorkflowId', id);
    };
    
    const updateInputMapping = (key: string, value: string) => {
        onChange('inputMapping', { ...inputMapping, [key]: value });
    };
    
    const addInputMapping = () => {
        const newKey = `param_${Object.keys(inputMapping).length + 1}`;
        updateInputMapping(newKey, '');
    };
    
    const removeInputMapping = (key: string) => {
        const newMapping = { ...inputMapping };
        delete newMapping[key];
        onChange('inputMapping', newMapping);
    };
    
    const availableWorkflows = workflows.filter(wf => wf.id !== nodeId);
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-purple-50 p-3 rounded-lg border border-purple-100">
                <Info className="h-4 w-4 text-purple-500 shrink-0" />
                <span>工作流调用节点可以执行另一个工作流，实现模块化设计。</span>
            </div>
            
            <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">选择工作流</label>
                <div className="relative">
                    <select
                        value={targetWorkflowId}
                        onChange={(e) => handleWorkflowSelect(e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-black appearance-none"
                    >
                        <option value="">请选择工作流</option>
                        {availableWorkflows.map(wf => (
                            <option key={wf.id} value={wf.id}>{wf.name}</option>
                        ))}
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 rotate-90 pointer-events-none" />
                </div>
            </div>
            
            {targetWorkflowId && (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                        </div>
                    ) : targetWorkflow && (
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Workflow className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-900">{targetWorkflow.name}</span>
                            </div>
                            <p className="text-xs text-gray-500">{targetWorkflow.description || '暂无描述'}</p>
                        </div>
                    )}
                    
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-700">输入参数映射</label>
                            <button
                                onClick={addInputMapping}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                + 添加参数
                            </button>
                        </div>
                        <div className="space-y-2">
                            {Object.entries(inputMapping).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={key}
                                        onChange={(e) => {
                                            const newMapping = { ...inputMapping };
                                            delete newMapping[key];
                                            newMapping[e.target.value] = value as string;
                                            onChange('inputMapping', newMapping);
                                        }}
                                        className="w-1/3 rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                        placeholder="参数名"
                                    />
                                    <input
                                        type="text"
                                        value={value as string}
                                        onChange={(e) => updateInputMapping(key, e.target.value)}
                                        className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black font-mono"
                                        placeholder="{{steps.nodeId.field}}"
                                    />
                                    <button
                                        onClick={() => removeInputMapping(key)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            {Object.keys(inputMapping).length === 0 && (
                                <div className="text-xs text-gray-400 text-center py-2">
                                    暂无参数映射
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
            
            <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">超时设置</label>
                <select
                    value={config?.timeout || 60000}
                    onChange={(e) => onChange('timeout', parseInt(e.target.value))}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-black"
                >
                    <option value={30000}>30 秒</option>
                    <option value={60000}>1 分钟（默认）</option>
                    <option value={300000}>5 分钟</option>
                    <option value={600000}>10 分钟</option>
                </select>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <h4 className="text-xs font-medium text-gray-700 mb-2">输出变量</h4>
                <div className="bg-gray-50 rounded-md p-3 text-xs font-mono text-gray-600">
                    <div className="flex items-center gap-2">
                        <Code className="h-3 w-3" />
                        <span>{`{{steps.${nodeId}}}`}</span>
                    </div>
                    <div className="mt-1 text-gray-400">
                        访问子工作流输出：{`{{steps.${nodeId}.output}}`}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowCallNodeConfig;
