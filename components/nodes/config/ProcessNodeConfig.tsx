import React, { useState, useEffect } from 'react';
import { Settings, Sparkles, Copy, Check, Play, Code2, MessageSquare, Loader2, AlertCircle, Lightbulb, FileCode, ArrowUpRight, Lock } from 'lucide-react';
import { WorkflowNode, WorkflowEdge, OutputVariable, ProcessOutputConfig } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';
import { clsx } from 'clsx';
import { api } from '../../../lib/api';
import OutputVariableEditor from './OutputVariableEditor';

interface AiSettings {
  easyBotEnabled: boolean;
  processNodeAiEnabled: boolean;
  easyBotLlmConfigId: string | null;
  processNodeAiLlmConfigId: string | null;
}

interface ProcessNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
    edges?: WorkflowEdge[];
}

const CODE_TEMPLATES = [
    {
        id: 'filter',
        name: '数据过滤',
        description: '根据条件过滤数据',
        code: `// 过滤数据示例
const result = inputs.filter(item => {
  // 修改过滤条件
  return item.status === 'active';
});
return result;`
    },
    {
        id: 'map',
        name: '字段映射',
        description: '转换数据字段',
        code: `// 字段映射示例
const result = inputs.map(item => ({
  id: item.id,
  name: item.name,
  // 添加更多字段映射
}));
return result;`
    },
    {
        id: 'aggregate',
        name: '数据聚合',
        description: '聚合统计数据',
        code: `// 数据聚合示例
const result = {
  total: inputs.length,
  sum: inputs.reduce((acc, item) => acc + (item.value || 0), 0),
  average: inputs.reduce((acc, item) => acc + (item.value || 0), 0) / inputs.length
};
return result;`
    },
    {
        id: 'group',
        name: '分组统计',
        description: '按字段分组统计',
        code: `// 分组统计示例
const groups = {};
inputs.forEach(item => {
  const key = item.category || 'other';
  if (!groups[key]) groups[key] = [];
  groups[key].push(item);
});

const result = Object.entries(groups).map(([key, items]) => ({
  category: key,
  count: items.length,
  items
}));
return result;`
    },
    {
        id: 'transform',
        name: '格式转换',
        description: '转换数据格式',
        code: `// 格式转换示例
const result = inputs.map(item => ({
  ...item,
  // 添加时间戳
  processedAt: new Date().toISOString(),
  // 格式化字段
  displayName: \`\${item.firstName} \${item.lastName}\`
}));
return result;`
    },
    {
        id: 'merge',
        name: '数据合并',
        description: '合并多个数据源',
        code: `// 数据合并示例
// 假设有两个前置节点: node1 和 node2
const data1 = steps.node1?.rows || [];
const data2 = steps.node2?.rows || [];

// 根据ID合并
const result = data1.map(item1 => {
  const matching = data2.find(item2 => item2.id === item1.id);
  return {
    ...item1,
    ...matching
  };
});
return result;`
    }
];

const ProcessNodeConfig: React.FC<ProcessNodeConfigProps> = ({ config, onChange, nodes, currentNodeId, edges = [] }) => {
    const [activeTab, setActiveTab] = useState<'code' | 'ai' | 'templates' | 'output'>('code');
    const [aiPrompt, setAiPrompt] = useState(config?.aiPrompt || '');
    const [generating, setGenerating] = useState(false);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [aiExplanation, setAiExplanation] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);

    useEffect(() => {
        const loadAiSettings = async () => {
            try {
                const settings = await api.system.getAiSettings();
                setAiSettings(settings);
            } catch (error) {
                console.error('Failed to load AI settings:', error);
            }
        };
        loadAiSettings();
    }, []);

    const outputConfig: ProcessOutputConfig = config?.outputConfig || {
        mode: 'auto',
        variables: [],
    };

    const updateConfig = (key: string, value: any) => {
        onChange(key, value);
    };

    const handleGenerateCode = async () => {
        if (!aiPrompt.trim()) return;
        
        setGenerating(true);
        setGeneratedCode(null);
        setAiExplanation(null);
        
        try {
            const previousNodes = edges
                .filter(e => e.target === currentNodeId)
                .map(e => {
                    const node = nodes.find(n => n.id === e.source);
                    return node?.data?.label || e.source;
                });

            const result = await api.ai.generateCode({
                description: aiPrompt,
                context: {
                    previousSteps: previousNodes,
                }
            });
            
            setGeneratedCode(result.code);
            setAiExplanation(result.explanation);
        } catch (error: any) {
            console.error('Failed to generate code:', error);
        } finally {
            setGenerating(false);
        }
    };

    const applyGeneratedCode = () => {
        if (generatedCode) {
            updateConfig('code', generatedCode);
            updateConfig('aiGenerated', true);
            updateConfig('aiPrompt', aiPrompt);
            updateConfig('aiExplanation', aiExplanation);
            setGeneratedCode(null);
            setAiExplanation(null);
            setActiveTab('code');
        }
    };

    const applyTemplate = (template: typeof CODE_TEMPLATES[0]) => {
        updateConfig('code', template.code);
        updateConfig('aiGenerated', false);
        setActiveTab('code');
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleOutputConfigChange = (newConfig: ProcessOutputConfig) => {
        updateConfig('outputConfig', newConfig);
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800">
                <div className="flex items-center gap-2 mb-1 font-semibold">
                    <Settings className="h-4 w-4" />
                    数据处理节点
                </div>
                <p className="opacity-90">
                    使用 JavaScript 代码处理数据。可使用 AI 生成代码。
                </p>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">配置选项</label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setActiveTab('code')}
                        className={clsx(
                            "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            activeTab === 'code' 
                                ? "bg-white text-blue-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Code2 className="h-3 w-3" />
                        代码
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={clsx(
                            "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            activeTab === 'ai' 
                                ? "bg-white text-purple-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Sparkles className="h-3 w-3" />
                        AI
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={clsx(
                            "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            activeTab === 'templates' 
                                ? "bg-white text-green-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <FileCode className="h-3 w-3" />
                        模板
                    </button>
                    <button
                        onClick={() => setActiveTab('output')}
                        className={clsx(
                            "flex-1 px-2 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            activeTab === 'output' 
                                ? "bg-white text-orange-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <ArrowUpRight className="h-3 w-3" />
                        输出
                    </button>
                </div>
            </div>

            {activeTab === 'code' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700">处理代码</label>
                        {config?.aiGenerated && (
                            <span className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                <Sparkles className="h-3 w-3" />
                                AI 生成
                            </span>
                        )}
                    </div>
                    <EnhancedTextarea
                        value={config?.code || ''}
                        onValueChange={(val) => updateConfig('code', val)}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        edges={edges}
                        className="w-full h-[200px] rounded-md border border-gray-200 bg-gray-900 text-gray-100 p-3 text-xs font-mono outline-none focus:border-blue-500 resize-none"
                        placeholder={`// 可用变量:\n// inputs - 前置节点的输出\n// steps - 所有前置节点的结果\n// trigger - 触发器数据\n\nreturn inputs.map(item => ({\n  ...item,\n  processed: true\n}));`}
                        spellCheck={false}
                    />
                    {config?.aiExplanation && (
                        <div className="bg-purple-50 border border-purple-100 rounded-md p-2 text-xs text-purple-800">
                            <div className="flex items-center gap-1 font-medium mb-1">
                                <Lightbulb className="h-3 w-3" />
                                AI 说明
                            </div>
                            <p className="opacity-90">{config.aiExplanation}</p>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400">
                        可用变量: <code className="bg-gray-100 px-1 rounded">inputs</code>（前置节点输出）、
                        <code className="bg-gray-100 px-1 rounded">steps</code>（所有节点结果）、
                        <code className="bg-gray-100 px-1 rounded">trigger</code>（触发器数据）
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                        可用函数: <code className="bg-gray-100 px-1 rounded">json(str)</code>（字符串转对象）、
                        <code className="bg-gray-100 px-1 rounded">stringify(obj)</code>（对象转字符串）、
                        <code className="bg-gray-100 px-1 rounded">get(obj, path)</code>（安全取值）
                    </p>
                </div>
            )}

            {activeTab === 'ai' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    {aiSettings && !aiSettings.processNodeAiEnabled ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="p-3 bg-gray-100 rounded-full mb-3">
                                <Lock className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700 mb-1">AI 代码生成已禁用</p>
                            <p className="text-xs text-gray-500">请联系超级管理员启用此功能</p>
                        </div>
                    ) : (
                        <>
                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-gray-700">描述你的数据处理需求</label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="例如：将用户数据中的 email 字段提取出来，过滤掉无效的邮箱，然后转换为小写"
                                    className="w-full h-24 rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-purple-500 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleGenerateCode}
                                disabled={!aiPrompt.trim() || generating}
                                className={clsx(
                                    "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-medium transition-all",
                                    aiPrompt.trim() && !generating
                                        ? "bg-purple-600 text-white hover:bg-purple-700"
                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        正在生成代码...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        生成代码
                                    </>
                                )}
                            </button>

                            {generatedCode && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-medium text-gray-700">生成的代码</label>
                                        <button
                                            onClick={() => copyToClipboard(generatedCode)}
                                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700"
                                        >
                                            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                            {copied ? '已复制' : '复制'}
                                        </button>
                                    </div>
                                    <pre className="bg-gray-900 text-gray-100 rounded-md p-3 text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto">
                                {generatedCode}
                            </pre>
                            
                            {aiExplanation && (
                                <div className="bg-blue-50 border border-blue-100 rounded-md p-2 text-xs text-blue-800">
                                    <div className="flex items-center gap-1 font-medium mb-1">
                                        <MessageSquare className="h-3 w-3" />
                                        代码说明
                                    </div>
                                    <p className="opacity-90">{aiExplanation}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={applyGeneratedCode}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-md text-xs font-medium hover:bg-green-700 transition-colors"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    应用代码
                                </button>
                                <button
                                    onClick={() => { setGeneratedCode(null); setAiExplanation(null); }}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors"
                                >
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    重新生成
                                </button>
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </div>
            )}

            {activeTab === 'templates' && (
                <div className="space-y-2 animate-in fade-in duration-200">
                    <p className="text-xs text-gray-500 mb-2">选择一个模板快速开始</p>
                    <div className="grid gap-2">
                        {CODE_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => applyTemplate(template)}
                                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 text-left transition-all group"
                            >
                                <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center shrink-0">
                                    <FileCode className="h-4 w-4 text-gray-500 group-hover:text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-800">{template.name}</div>
                                    <div className="text-[10px] text-gray-500 mt-0.5">{template.description}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'output' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800">
                        <div className="flex items-center gap-2 mb-1 font-semibold">
                            <ArrowUpRight className="h-4 w-4" />
                            输出变量配置
                        </div>
                        <p className="opacity-90">
                            定义输出变量名称和类型，方便后续节点引用。
                        </p>
                    </div>

                    <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-700">输出模式</label>
                        <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                            <button
                                onClick={() => handleOutputConfigChange({ ...outputConfig, mode: 'auto' })}
                                className={clsx(
                                    "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                                    outputConfig.mode === 'auto' 
                                        ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                自动推断
                            </button>
                            <button
                                onClick={() => handleOutputConfigChange({ ...outputConfig, mode: 'custom', variables: outputConfig.variables || [] })}
                                className={clsx(
                                    "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all",
                                    outputConfig.mode === 'custom' 
                                        ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                                        : "text-gray-500 hover:text-gray-900"
                                )}
                            >
                                自定义变量
                            </button>
                        </div>
                    </div>

                    {outputConfig.mode === 'auto' ? (
                        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                            <p>自动从代码返回值推断输出结构。</p>
                            <p className="mt-1 text-gray-400">输出变量: <code className="bg-gray-100 px-1 rounded">steps.{currentNodeId}.result</code></p>
                        </div>
                    ) : (
                        <OutputVariableEditor
                            variables={outputConfig.variables || []}
                            onChange={(variables) => handleOutputConfigChange({ ...outputConfig, variables })}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            edges={edges}
                        />
                    )}
                </div>
            )}

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                    <strong>提示：</strong>处理结果存储在 <code className="bg-amber-100 px-1 rounded">steps.当前节点.result</code> 中。
                    代码在沙箱环境中执行，执行超时限制为 5 秒。
                </div>
            </div>
        </div>
    );
};

export default ProcessNodeConfig;
