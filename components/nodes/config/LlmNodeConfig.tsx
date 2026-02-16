import React from 'react';
import { WorkflowNode } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';

interface LlmNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const LlmNodeConfig: React.FC<LlmNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => {
    const llmConfig = config?.llmConfig || { provider: 'openai', model: 'gpt-3.5-turbo', temperature: 0.7 };
    
    const updateLlm = (key: string, value: any) => {
        onChange('llmConfig', { ...llmConfig, [key]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-700">模型提供商</label>
                    <select
                        value={llmConfig.provider || 'openai'}
                        onChange={(e) => updateLlm('provider', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-black"
                    >
                        <option value="openai">OpenAI</option>
                        <option value="azure">Azure OpenAI</option>
                        <option value="custom">Custom / LocalAI</option>
                    </select>
                </div>
                <div className="flex-1">
                     <label className="mb-1 block text-xs font-medium text-gray-700">模型名称</label>
                     <input 
                        type="text"
                        value={llmConfig.model || ''}
                        onChange={(e) => updateLlm('model', e.target.value)}
                        placeholder="gpt-3.5-turbo"
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                     />
                </div>
            </div>

            {/* Connection Details */}
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                     <label className="mb-1 block text-xs font-medium text-gray-500">Base URL</label>
                     <input 
                        type="text"
                        value={llmConfig.baseUrl || ''}
                        onChange={(e) => updateLlm('baseUrl', e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                     />
                </div>
                <div>
                     <label className="mb-1 block text-xs font-medium text-gray-500">API Key</label>
                     <input 
                        type="password"
                        value={llmConfig.apiKey || ''}
                        onChange={(e) => updateLlm('apiKey', e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                     />
                </div>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
                 <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">输出格式 (Response Format)</label>
                    <select
                        value={llmConfig.responseFormat || 'text'}
                        onChange={(e) => updateLlm('responseFormat', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-black"
                    >
                        <option value="text">纯文本 (Text)</option>
                        <option value="json">JSON 对象</option>
                    </select>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Temperature (随机性)</label>
                        <span className="text-[10px] text-gray-500">{llmConfig.temperature || 0.7}</span>
                    </div>
                    <input 
                        type="range"
                        min="0" max="2" step="0.1"
                        value={llmConfig.temperature || 0.7}
                        onChange={(e) => updateLlm('temperature', parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                 </div>
            </div>

            {/* Prompts */}
            <div className="space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">System Prompt</label>
                    <EnhancedTextarea 
                        value={llmConfig.systemPrompt || ''}
                        onValueChange={(val) => updateLlm('systemPrompt', val)}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        placeholder="You are a helpful assistant..."
                        className="w-full h-20 rounded-md border border-gray-200 px-3 py-2 text-xs focus:border-purple-500 outline-none resize-none"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">User Prompt</label>
                    <EnhancedTextarea 
                        value={llmConfig.userPrompt || ''}
                        onValueChange={(val) => updateLlm('userPrompt', val)}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        placeholder="Hello, how are you? {{steps.prev.data}}"
                        className="w-full h-32 rounded-md border border-gray-200 px-3 py-2 text-xs focus:border-purple-500 outline-none resize-none"
                    />
                </div>
            </div>
        </div>
    );
};

export default LlmNodeConfig;