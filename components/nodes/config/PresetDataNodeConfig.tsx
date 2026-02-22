import React, { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { Database, Copy, Check, Info, Code, Braces, LayoutGrid, FileJson } from 'lucide-react';
import { PresetDataConfig, PresetField, WorkflowNode, WorkflowEdge } from '../../../types';
import PresetFieldEditor from './PresetFieldEditor';

interface PresetDataNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodeId: string;
    nodes?: WorkflowNode[];
    edges?: WorkflowEdge[];
}

const PresetDataNodeConfig: React.FC<PresetDataNodeConfigProps> = ({ config, onChange, nodeId, nodes = [], edges = [] }) => {
    const [copied, setCopied] = useState(false);
    const [jsonError, setJsonError] = useState<string | null>(null);
    
    const presetDataConfig: PresetDataConfig = config?.presetDataConfig || {
        mode: 'static',
        fields: [],
        presetData: config?.presetData || {},
    };
    
    const [mode, setMode] = useState<'static' | 'dynamic'>(presetDataConfig.mode || 'static');
    const [fields, setFields] = useState<PresetField[]>(presetDataConfig.fields || []);
    const [presetData, setPresetData] = useState(presetDataConfig.presetData || config?.presetData || {});
    
    useEffect(() => {
        const newConfig: PresetDataConfig = {
            mode,
            fields: mode === 'dynamic' ? fields : undefined,
            presetData: mode === 'static' ? presetData : undefined,
        };
        onChange('presetDataConfig', newConfig);
        
        if (mode === 'static') {
            onChange('presetData', presetData);
        }
    }, [mode, fields, presetData]);
    
    const handleDataChange = (value: string) => {
        try {
            const parsed = JSON.parse(value);
            setJsonError(null);
            setPresetData(parsed);
        } catch (e) {
            setJsonError('JSON 格式错误');
        }
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(JSON.stringify(outputPreview, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const presets = [
        { name: '空对象', data: {} },
        { name: '用户数据', data: { id: 1, name: '张三', email: 'zhangsan@example.com', age: 28 } },
        { name: 'API 响应', data: { success: true, data: { items: [], total: 0 }, message: '操作成功' } },
        { name: '数组数据', data: [1, 2, 3, 4, 5] },
        { name: '表单数据', data: { username: 'test', password: '123456', remember: true } },
    ];

    const outputPreview = useMemo(() => {
        if (mode === 'static') {
            return presetData;
        } else {
            const result: Record<string, any> = {};
            fields.forEach(f => {
                if (f.key) {
                    if (f.isVariable) {
                        result[f.key] = `{{${f.value}}}`;
                    } else {
                        result[f.key] = f.value;
                    }
                }
            });
            return result;
        }
    }, [mode, presetData, fields]);
    
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <span>预设数据节点用于测试，可以模拟各种输入场景。支持变量引用如 {`{{steps.nodeId.field}}`}</span>
            </div>
            
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">数据模式</label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        onClick={() => setMode('static')}
                        className={clsx(
                            "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            mode === 'static' 
                                ? "bg-white text-gray-900 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <FileJson className="h-3 w-3" />
                        静态数据
                    </button>
                    <button
                        onClick={() => setMode('dynamic')}
                        className={clsx(
                            "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            mode === 'dynamic' 
                                ? "bg-white text-purple-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <LayoutGrid className="h-3 w-3" />
                        动态映射
                    </button>
                </div>
            </div>
            
            {mode === 'static' ? (
                <>
                    <div>
                        <label className="mb-2 block text-xs font-medium text-gray-700">快速预设</label>
                        <div className="flex flex-wrap gap-2">
                            {presets.map(preset => (
                                <button
                                    key={preset.name}
                                    onClick={() => setPresetData(preset.data)}
                                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-gray-700">JSON 数据</label>
                            <button
                                onClick={copyToClipboard}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                {copied ? '已复制' : '复制'}
                            </button>
                        </div>
                        <div className="relative">
                            <textarea
                                value={JSON.stringify(presetData, null, 2)}
                                onChange={(e) => handleDataChange(e.target.value)}
                                rows={10}
                                className={clsx(
                                    "w-full rounded-md border bg-gray-900 text-green-400 p-3 font-mono text-xs focus:ring-1 outline-none resize-none",
                                    jsonError ? "border-red-500 focus:ring-red-500" : "border-gray-700 focus:ring-blue-500"
                                )}
                                placeholder='{"key": "value"}'
                            />
                            {jsonError && (
                                <div className="absolute bottom-2 right-2 text-xs text-red-400">
                                    {jsonError}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <PresetFieldEditor
                    fields={fields}
                    onChange={setFields}
                    nodes={nodes}
                    currentNodeId={nodeId}
                    edges={edges}
                />
            )}
            
            <div>
                <label className="mb-2 block text-xs font-medium text-gray-700">超时设置</label>
                <div className="flex items-center gap-2">
                    <select
                        value={config?.timeout || 30000}
                        onChange={(e) => onChange('timeout', parseInt(e.target.value))}
                        className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-black"
                    >
                        <option value={5000}>5 秒</option>
                        <option value={10000}>10 秒</option>
                        <option value={30000}>30 秒（默认）</option>
                        <option value={60000}>1 分钟</option>
                        <option value={300000}>5 分钟</option>
                    </select>
                </div>
            </div>
            
            <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-700">输出预览</h4>
                    <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                    >
                        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        {copied ? '已复制' : '复制'}
                    </button>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-auto">
                    <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                        {JSON.stringify(outputPreview, null, 2)}
                    </pre>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                        <Code className="h-3 w-3" />
                        <span className="font-mono">{`{{steps.${nodeId}}}`}</span>
                    </div>
                    <div className="mt-1 text-gray-400">
                        访问预设数据：{`{{steps.${nodeId}.fieldName}}`}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PresetDataNodeConfig;
