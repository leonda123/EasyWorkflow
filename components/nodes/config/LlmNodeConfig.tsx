import React, { useState, useEffect } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';
import { api } from '../../../lib/api';
import { clsx } from 'clsx';
import { Cpu, Cloud, Settings2, AlertCircle, Check, RefreshCw, Zap, ZapOff } from 'lucide-react';

interface LlmNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
    edges?: WorkflowEdge[];
}

interface LlmProvider {
    id: string;
    name: string;
    baseUrl: string;
    models: string[];
}

interface LlmConfig {
    id: string;
    name: string;
    provider: string;
    model: string;
    isActive: boolean;
    isDefault: boolean;
}

const LlmNodeConfig: React.FC<LlmNodeConfigProps> = ({ config, onChange, nodes, currentNodeId, edges = [] }) => {
    const [serverConfigs, setServerConfigs] = useState<LlmConfig[]>([]);
    const [providers, setProviders] = useState<LlmProvider[]>([]);
    const [loading, setLoading] = useState(true);
    
    const llmConfig = config?.llmConfig || { 
        temperature: 0.7,
        maxTokens: 2048,
        useServerConfig: true,
        configId: ''
    };

    const useServerConfig = llmConfig.useServerConfig !== false;

    useEffect(() => {
        const loadData = async () => {
            try {
                const [configsData, providersData] = await Promise.all([
                    api.llm.configs.list(),
                    api.llm.providers()
                ]);
                setServerConfigs(configsData);
                setProviders(providersData);
                
                if (!llmConfig.configId && configsData.length > 0) {
                    const defaultConfig = configsData.find((c: LlmConfig) => c.isDefault) || configsData[0];
                    onChange('llmConfig', { 
                        ...llmConfig, 
                        configId: defaultConfig.id,
                        useServerConfig: true
                    });
                }
            } catch (error) {
                console.error('Failed to load LLM configs:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const updateLlm = (key: string, value: any) => {
        onChange('llmConfig', { ...llmConfig, [key]: value });
    };

    const handleConfigTypeChange = (type: 'server' | 'custom') => {
        if (type === 'server') {
            const defaultConfig = serverConfigs.find(c => c.isDefault) || serverConfigs[0];
            const newConfig = {
                temperature: llmConfig.temperature || 0.7,
                maxTokens: llmConfig.maxTokens || 2048,
                systemPrompt: llmConfig.systemPrompt,
                userPrompt: llmConfig.userPrompt,
                responseFormat: llmConfig.responseFormat,
                useServerConfig: true,
                configId: defaultConfig?.id || ''
            };
            onChange('llmConfig', newConfig);
        } else {
            const selectedProvider = providers.find(p => p.id === llmConfig.provider) || providers[0];
            const newConfig = {
                temperature: llmConfig.temperature || 0.7,
                maxTokens: llmConfig.maxTokens || 2048,
                systemPrompt: llmConfig.systemPrompt,
                userPrompt: llmConfig.userPrompt,
                responseFormat: llmConfig.responseFormat,
                useServerConfig: false,
                configId: '',
                provider: selectedProvider?.id || 'openai',
                baseUrl: selectedProvider?.baseUrl || '',
                model: selectedProvider?.models?.[0] || '',
                apiKey: ''
            };
            onChange('llmConfig', newConfig);
        }
    };

    const selectedProvider = providers.find(p => p.id === llmConfig.provider);
    const selectedServerConfig = serverConfigs.find(c => c.id === llmConfig.configId);

    const getActiveModelInfo = () => {
        if (useServerConfig) {
            if (selectedServerConfig) {
                return {
                    name: selectedServerConfig.name,
                    model: selectedServerConfig.model,
                    provider: selectedServerConfig.provider,
                    isActive: selectedServerConfig.isActive
                };
            }
            return null;
        } else {
            if (llmConfig.apiKey && llmConfig.model) {
                return {
                    name: '自定义配置',
                    model: llmConfig.model,
                    provider: llmConfig.provider,
                    isActive: true
                };
            }
            return null;
        }
    };

    const activeModel = getActiveModelInfo();

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Active Model Status */}
            {activeModel && (
                <div className={clsx(
                    "rounded-lg p-3 border",
                    activeModel.isActive 
                        ? "bg-green-50 border-green-200" 
                        : "bg-gray-50 border-gray-200"
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {activeModel.isActive ? (
                                <Zap className="h-4 w-4 text-green-600" />
                            ) : (
                                <ZapOff className="h-4 w-4 text-gray-400" />
                            )}
                            <div>
                                <div className="text-xs font-semibold text-gray-900">
                                    当前启用: {activeModel.name}
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    {activeModel.provider} · {activeModel.model}
                                </div>
                            </div>
                        </div>
                        <div className={clsx(
                            "text-[10px] px-2 py-0.5 rounded-full",
                            activeModel.isActive 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-100 text-gray-500"
                        )}>
                            {activeModel.isActive ? '已启用' : '未启用'}
                        </div>
                    </div>
                </div>
            )}

            {/* Config Type Selector */}
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">配置类型</label>
                <select
                    value={useServerConfig ? 'server' : 'custom'}
                    onChange={(e) => handleConfigTypeChange(e.target.value as 'server' | 'custom')}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                >
                    <option value="server">服务端配置 (推荐)</option>
                    <option value="custom">自定义配置</option>
                </select>
            </div>

            {useServerConfig ? (
                <div className="space-y-3">
                    {loading ? (
                        <div className="flex items-center justify-center py-4 text-gray-400">
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            加载配置...
                        </div>
                    ) : serverConfigs.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <div>
                                    <strong>未配置 LLM</strong>
                                    <p className="mt-1">请让管理员在设置页面配置 LLM，或使用自定义配置模式。</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">选择 LLM 配置</label>
                                <select
                                    value={llmConfig.configId || ''}
                                    onChange={(e) => updateLlm('configId', e.target.value)}
                                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                                >
                                    <option value="">请选择...</option>
                                    {serverConfigs.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.provider} - {c.model}) {c.isDefault ? '⭐' : ''} {!c.isActive ? ' [已禁用]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {selectedServerConfig && (
                                <div className={clsx(
                                    "flex items-center gap-2 text-xs px-2 py-1.5 rounded border",
                                    selectedServerConfig.isActive
                                        ? "text-green-700 bg-green-50 border-green-200"
                                        : "text-amber-700 bg-amber-50 border-amber-200"
                                )}>
                                    {selectedServerConfig.isActive ? (
                                        <>
                                            <Check className="h-3.5 w-3.5" />
                                            将使用服务端配置的 LLM ({selectedServerConfig.provider})
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="h-3.5 w-3.5" />
                                            此配置已被禁用
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-gray-700">模型提供商</label>
                            <select
                                value={llmConfig.provider || 'openai'}
                                onChange={(e) => {
                                    const provider = e.target.value;
                                    updateLlm('provider', provider);
                                    const found = providers.find(p => p.id === provider);
                                    if (found) {
                                        updateLlm('baseUrl', found.baseUrl);
                                        if (found.models.length > 0) {
                                            updateLlm('model', found.models[0]);
                                        }
                                    }
                                }}
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                            >
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="mb-1 block text-xs font-medium text-gray-700">模型名称</label>
                            {selectedProvider?.models.length ? (
                                <select
                                    value={llmConfig.model || ''}
                                    onChange={(e) => updateLlm('model', e.target.value)}
                                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                                >
                                    {selectedProvider.models.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            ) : (
                                <input 
                                    type="text"
                                    value={llmConfig.model || ''}
                                    onChange={(e) => updateLlm('model', e.target.value)}
                                    placeholder="gpt-3.5-turbo"
                                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                                />
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Base URL</label>
                            <input 
                                type="text"
                                value={llmConfig.baseUrl || ''}
                                onChange={(e) => updateLlm('baseUrl', e.target.value)}
                                placeholder="https://api.openai.com/v1"
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">API Key</label>
                            <input 
                                type="password"
                                value={llmConfig.apiKey || ''}
                                onChange={(e) => updateLlm('apiKey', e.target.value)}
                                placeholder="sk-..."
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs font-mono outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {llmConfig.apiKey && llmConfig.model && (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded border border-green-200">
                            <Check className="h-3.5 w-3.5" />
                            自定义配置已完成 ({llmConfig.provider})
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">输出格式</label>
                    <select
                        value={llmConfig.responseFormat || 'text'}
                        onChange={(e) => updateLlm('responseFormat', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-blue-500"
                    >
                        <option value="text">纯文本</option>
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

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-medium text-gray-700">Max Tokens</label>
                        <span className="text-[10px] text-gray-500">{llmConfig.maxTokens || 2048}</span>
                    </div>
                    <input 
                        type="number"
                        min="1"
                        max="32768"
                        value={llmConfig.maxTokens || 2048}
                        onChange={(e) => updateLlm('maxTokens', Math.min(parseInt(e.target.value) || 2048, 32768))}
                        className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">范围: 1 - 32768</p>
                </div>
            </div>

            <div className="space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-bold text-gray-700">System Prompt</label>
                    <EnhancedTextarea 
                        value={llmConfig.systemPrompt || ''}
                        onValueChange={(val) => updateLlm('systemPrompt', val)}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        edges={edges}
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
                        edges={edges}
                        placeholder="Hello, how are you? {{steps.prev.data}}"
                        className="w-full h-32 rounded-md border border-gray-200 px-3 py-2 text-xs focus:border-purple-500 outline-none resize-none"
                    />
                </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 border border-blue-100">
                <div className="flex items-start gap-2">
                    <Cpu className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                        <strong>支持的 API 平台：</strong>
                        <p className="mt-1 text-blue-600">OpenAI、DeepSeek、阿里云通义千问、智谱 AI、月之暗面、百度文心一言等兼容 OpenAI 协议的平台。</p>
                        <p className="mt-2 text-blue-500">
                            变量函数: <code className="bg-blue-100 px-1 rounded">json(str)</code> 字符串转对象、
                            <code className="bg-blue-100 px-1 rounded">stringify(obj)</code> 对象转字符串
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LlmNodeConfig;
