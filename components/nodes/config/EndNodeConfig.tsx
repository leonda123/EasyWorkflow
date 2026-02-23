import React, { useMemo, useState } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';
import { FileJson, Info, Copy, Check, Eye } from 'lucide-react';
import { getPreviousNodes } from '../../../lib/variableUtils';
import { formatJsonPreview } from '../../../lib/responsePreviewUtils';

interface EndNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
    edges?: WorkflowEdge[];
}

const RESPONSE_TEMPLATES = [
    {
        id: 'success',
        name: '成功响应',
        description: '标准成功响应格式',
        template: `{
  "status": "success",
  "message": "操作成功",
  "data": {{steps.last.data}}
}`
    },
    {
        id: 'error',
        name: '错误响应',
        description: '标准错误响应格式',
        template: `{
  "status": "error",
  "message": "操作失败",
  "error": {
    "code": "INTERNAL_ERROR",
    "details": {{steps.last.error}}
  }
}`
    },
    {
        id: 'list',
        name: '列表响应',
        description: '分页列表数据格式',
        template: `{
  "status": "success",
  "data": {
    "items": {{steps.last.data}},
    "total": {{length(steps.last.data)}},
    "page": 1,
    "pageSize": 20
  }
}`
    },
    {
        id: 'ai',
        name: 'AI 响应',
        description: 'AI 模型输出格式',
        template: `{
  "status": "success",
  "data": {
    "content": {{steps.llm.content}},
    "model": {{steps.llm.model}},
    "usage": {{steps.llm.usage}}
  }
}`
    },
    {
        id: 'minimal',
        name: '简洁响应',
        description: '最小化响应格式',
        template: `{
  "code": 0,
  "data": {{steps.last.data}}
}`
    },
    {
        id: 'api',
        name: 'API 标准响应',
        description: 'RESTful API 标准格式',
        template: `{
  "code": 200,
  "message": "OK",
  "data": {{steps.last.data}},
  "timestamp": "{{now()}}"
}`
    }
];

const ResponsePreview: React.FC<{ 
    responseBody: string; 
    nodes: WorkflowNode[];
}> = ({ responseBody, nodes }) => {
    const [copied, setCopied] = useState(false);
    
    const preview = useMemo(() => {
        return formatJsonPreview(responseBody, nodes);
    }, [responseBody, nodes]);
    
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(preview);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };
    
    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    响应预览
                </label>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
                    title="复制预览"
                >
                    {copied ? (
                        <>
                            <Check className="h-3 w-3 text-green-500" />
                            已复制
                        </>
                    ) : (
                        <>
                            <Copy className="h-3 w-3" />
                            复制
                        </>
                    )}
                </button>
            </div>
            <div className="bg-gray-900 rounded-md p-3 overflow-auto max-h-[200px] border border-gray-800">
                <pre className="text-[10px] text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {preview}
                </pre>
            </div>
            <p className="mt-1 text-[10px] text-gray-400">
                预览中的变量已替换为示例值，实际执行时会使用真实数据
            </p>
        </div>
    );
};

const EndNodeConfig: React.FC<EndNodeConfigProps> = ({ config, onChange, nodes, currentNodeId, edges = [] }) => {
    const previousNodes = useMemo(() => {
        return getPreviousNodes(currentNodeId, nodes, edges);
    }, [currentNodeId, nodes, edges]);
    
    const handleTemplateSelect = (templateId: string) => {
        const template = RESPONSE_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            onChange('responseBody', template.template);
        }
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">HTTP 状态码</label>
                <div className="flex items-center gap-2">
                    <input 
                        type="number"
                        value={config?.responseStatus || 200}
                        onChange={(e) => onChange('responseStatus', parseInt(e.target.value))}
                        className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black font-mono"
                        placeholder="200"
                    />
                    <span className="text-xs text-gray-400">
                        {config?.responseStatus === 200 && 'OK'}
                        {config?.responseStatus === 201 && 'Created'}
                        {config?.responseStatus === 400 && 'Bad Request'}
                        {config?.responseStatus === 404 && 'Not Found'}
                        {config?.responseStatus === 500 && 'Internal Server Error'}
                    </span>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-700">响应模板</label>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {RESPONSE_TEMPLATES.map(template => (
                        <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.id)}
                            className="flex flex-col items-center p-2 rounded-md border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                        >
                            <FileJson className="h-4 w-4 text-gray-400 mb-1" />
                            <span className="text-[10px] font-medium text-gray-700">{template.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">响应内容 (JSON)</label>
                <EnhancedTextarea
                    value={config?.responseBody || ''}
                    onValueChange={(val) => onChange('responseBody', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    edges={edges}
                    className="w-full h-[200px] rounded-md border border-gray-200 p-3 text-xs font-mono outline-none focus:border-black resize-none"
                    placeholder={`{\n  "status": "success",\n  "data": {{steps.last.data}}\n}`}
                    spellCheck={false}
                />
                <p className="mt-1.5 text-[10px] text-gray-400">
                    使用 <code className="bg-gray-100 px-1 rounded">{'{{steps.nodeId.data}}'}</code> 插入前置节点数据
                </p>
            </div>
            
            <ResponsePreview responseBody={config?.responseBody || ''} nodes={previousNodes} />

            <div className="bg-blue-50 rounded-md p-3">
                <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-2">
                    <Info className="h-3 w-3" />
                    <span>变量处理函数</span>
                </div>
                <div className="space-y-1.5 text-[10px] text-blue-600">
                    <div className="flex items-start gap-2">
                        <code className="bg-blue-100 px-1 rounded shrink-0">json(str)</code>
                        <span>字符串转 JSON 对象</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <code className="bg-blue-100 px-1 rounded shrink-0">stringify(obj)</code>
                        <span>对象转 JSON 字符串</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <code className="bg-blue-100 px-1 rounded shrink-0">get(obj, path)</code>
                        <span>安全获取嵌套属性</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-blue-100">
                        <p className="text-blue-500 mb-1">示例：</p>
                        <code className="block bg-white p-1.5 rounded text-[9px] text-gray-700">
                            {'{{json(steps.node.data)}}'}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EndNodeConfig;
