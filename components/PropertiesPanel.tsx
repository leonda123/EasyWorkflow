import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Save, Clock, FileText, Activity, Settings, Plus, Trash2, Code2, Globe, Play, Box, Braces, Lock, ChevronRight, Copy, Bookmark, Tag, Brain, Database, Calendar, FormInput, MousePointerClick, Zap, Workflow, AlertCircle, Download, PlayCircle, MapPin } from 'lucide-react';
import { useFlowStore } from '../store/useFlowStore';
import { useAppStore } from '../store/useAppStore';
import { NodeStatus, NodeType, KeyValuePair, WorkflowNode, FormField } from '../types';
import { translations } from '../locales';

// --- Shared Components for Variable Insertion ---

interface VariableMenuProps {
  nodes: WorkflowNode[];
  currentNodeId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
}

const VariableMenu = ({ nodes, currentNodeId, onSelect, onClose }: VariableMenuProps) => {
  // Filter out the current node, we only want inputs from others (usually previous ones)
  const availableNodes = nodes.filter(n => n.id !== currentNodeId);

  // Mocking output schema based on node type
  const getNodeOutputs = (node: WorkflowNode) => {
    switch (node.data.type) {
      case NodeType.START:
        return [
            { label: 'Body 参数', value: `steps.${node.id}.body` },
            { label: 'Query 参数', value: `steps.${node.id}.query` },
            { label: 'Headers', value: `steps.${node.id}.headers` }
        ];
      case NodeType.API_REQUEST:
        return [
            { label: '响应数据', value: `steps.${node.id}.data` },
            { label: '状态码', value: `steps.${node.id}.status` }
        ];
      case NodeType.PROCESS:
        return [
            { label: '处理结果', value: `steps.${node.id}.result` }
        ];
      case NodeType.LLM:
        return [
            { label: 'AI 回复', value: `steps.${node.id}.content` }
        ];
      case NodeType.DB_QUERY:
        return [
            { label: '查询结果 (Rows)', value: `steps.${node.id}.rows` },
            { label: '受影响行数', value: `steps.${node.id}.rowCount` }
        ];
      default:
        return [{ label: '输出数据', value: `steps.${node.id}.data` }];
    }
  };

  // Click outside to close
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-gray-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-100">
      <div className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
        插入变量
      </div>
      <div className="max-h-60 overflow-y-auto p-1">
        {availableNodes.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-400">无可用的前置节点</div>
        ) : (
            availableNodes.map(node => (
            <div key={node.id} className="mb-1">
                <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-900 bg-gray-50/50 rounded">
                    <span className="opacity-50 text-[10px] uppercase border border-gray-200 px-1 rounded bg-white">
                        {node.data.type === 'api' ? 'API' : node.data.type.slice(0,3)}
                    </span>
                    <span className="truncate flex-1">{node.data.label}</span>
                </div>
                <div className="pl-2 mt-1 space-y-0.5">
                    {getNodeOutputs(node).map((output) => (
                        <button
                            key={output.value}
                            onClick={() => onSelect(`{{${output.value}}}`)}
                            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                        >
                            <span className="font-mono text-[10px]">{output.label}</span>
                            <span className="hidden group-hover:inline text-[9px] opacity-50 font-mono">{output.value}</span>
                        </button>
                    ))}
                </div>
            </div>
            ))
        )}
      </div>
    </div>
  );
};

type EnhancedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onValueChange: (val: string) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
};

const EnhancedInput = ({ value, onValueChange, nodes, currentNodeId, className, ...props }: EnhancedInputProps) => {
  const [showVars, setShowVars] = useState(false);

  const handleInsert = (variable: string) => {
    const currentVal = value ? String(value) : '';
    const newValue = currentVal + variable;
    onValueChange(newValue);
    setShowVars(false);
  };

  return (
    <div className="relative flex items-center">
      <input
        {...props}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={clsx(className, "pr-8")} // space for button
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2">
        <button
            onClick={() => setShowVars(!showVars)}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            title="插入变量"
        >
            <Braces className="h-3 w-3" />
        </button>
        {showVars && (
            <VariableMenu 
                nodes={nodes} 
                currentNodeId={currentNodeId} 
                onSelect={handleInsert} 
                onClose={() => setShowVars(false)} 
            />
        )}
      </div>
    </div>
  );
};

type EnhancedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onValueChange: (val: string) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
};

const EnhancedTextarea = ({ value, onValueChange, nodes, currentNodeId, className, ...props }: EnhancedTextareaProps) => {
    const [showVars, setShowVars] = useState(false);
  
    const handleInsert = (variable: string) => {
      const cursorPosition = (document.activeElement as HTMLTextAreaElement)?.selectionStart || (value ? String(value).length : 0);
      const val = value ? String(value) : '';
      const newValue = val.slice(0, cursorPosition) + variable + val.slice(cursorPosition);
      onValueChange(newValue);
      setShowVars(false);
    };
  
    return (
      <div className="relative">
        <textarea
          {...props}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className={className}
        />
        <div className="absolute right-2 top-2">
            <button
                onClick={() => setShowVars(!showVars)}
                className="flex h-6 w-6 items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all"
                title="插入变量"
            >
                <Braces className="h-3 w-3" />
            </button>
            {showVars && (
                <VariableMenu 
                    nodes={nodes} 
                    currentNodeId={currentNodeId} 
                    onSelect={handleInsert} 
                    onClose={() => setShowVars(false)} 
                />
            )}
        </div>
      </div>
    );
};

// --- Node Config Components ---

// ... StartNodeConfig and ApiNodeConfig remain unchanged ...
const StartNodeConfig = ({ config, onChange, nodeId }: { config: any, onChange: (k: string, v: any) => void, nodeId: string }) => {
    const triggerType = config?.triggerType || 'webhook';
    const formFields: FormField[] = config?.formFields || [];

    const handleAddField = () => {
        const newField: FormField = {
            id: Date.now().toString(),
            key: `field_${formFields.length + 1}`,
            label: `Field ${formFields.length + 1}`,
            type: 'text',
            required: true,
            placeholder: ''
        };
        onChange('formFields', [...formFields, newField]);
    };

    const updateField = (id: string, field: Partial<FormField>) => {
        onChange('formFields', formFields.map(f => f.id === id ? { ...f, ...field } : f));
    };

    const removeField = (id: string) => {
        onChange('formFields', formFields.filter(f => f.id !== id));
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        
        {/* Trigger Type Selector */}
        <div className="grid grid-cols-4 gap-2 bg-gray-100 p-1 rounded-lg">
            {[
                { id: 'webhook', icon: Globe, label: 'Webhook' },
                { id: 'schedule', icon: Calendar, label: '定时' },
                { id: 'form', icon: FormInput, label: '表单' },
                { id: 'manual', icon: MousePointerClick, label: '手动' }
            ].map(type => (
                <button
                    key={type.id}
                    onClick={() => onChange('triggerType', type.id)}
                    className={clsx(
                        "flex flex-col items-center justify-center gap-1 py-2 rounded-md transition-all",
                        triggerType === type.id 
                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                            : "text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                    )}
                >
                    <type.icon className="h-4 w-4" />
                    <span className="text-[10px] font-medium">{type.label}</span>
                </button>
            ))}
        </div>

        {/* --- Webhook Config --- */}
        {triggerType === 'webhook' && (
            <div className="space-y-4">
                 <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">HTTP Method</label>
                    <select 
                        value={config?.webhookMethod || 'POST'}
                        onChange={(e) => onChange('webhookMethod', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-black"
                    >
                        <option value="POST">POST (推荐)</option>
                        <option value="GET">GET</option>
                        <option value="PUT">PUT</option>
                    </select>
                 </div>

                <div className="rounded bg-gray-50 p-3 border border-gray-100 group relative">
                    <label className="mb-1 block text-xs font-medium text-gray-500">Webhook URL</label>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs border border-gray-200 text-gray-600 select-all">
                            https://api.easyflow.com/hooks/{nodeId}
                        </code>
                        <button className="text-gray-400 hover:text-black" title="复制">
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-500">
                        <p className="font-semibold mb-1">CURL 测试:</p>
                        <code className="block bg-gray-900 text-gray-300 p-2 rounded whitespace-pre-wrap font-mono">
                            curl -X {config?.webhookMethod || 'POST'} https://api.easyflow.com/hooks/{nodeId} \<br/>
                            -H "Content-Type: application/json" \<br/>
                            -d '{`{"foo": "bar"}`}'
                        </code>
                    </div>
                </div>
            </div>
        )}

        {/* --- Schedule Config --- */}
        {triggerType === 'schedule' && (
            <div className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-700">Cron 表达式</label>
                    <input
                        type="text"
                        placeholder="0 * * * *"
                        value={config?.cronExpression || ''}
                        onChange={(e) => onChange('cronExpression', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-black"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                        {[
                            { label: '每分钟', val: '* * * * *' },
                            { label: '每小时', val: '0 * * * *' },
                            { label: '每天', val: '0 0 * * *' },
                            { label: '每周', val: '0 0 * * 0' }
                        ].map(preset => (
                            <button 
                                key={preset.val}
                                onClick={() => onChange('cronExpression', preset.val)}
                                className="px-2 py-1 text-[10px] bg-gray-100 hover:bg-gray-200 rounded text-gray-600 border border-gray-200"
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="rounded bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100 flex gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-semibold">注意时区</p>
                        <p className="opacity-80">当前服务器时间使用 UTC 时区。请根据需要调整您的 Cron 表达式。</p>
                    </div>
                </div>
            </div>
        )}

        {/* --- Form Config --- */}
        {triggerType === 'form' && (
            <div className="space-y-4">
                 <div>
                    <label className="mb-1 block text-xs font-medium text-gray-700">表单标题</label>
                    <input
                        type="text"
                        placeholder="请输入信息"
                        value={config?.formTitle || ''}
                        onChange={(e) => onChange('formTitle', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                </div>
                <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-medium text-gray-700">表单字段</label>
                        <button onClick={handleAddField} className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline">
                            <Plus className="h-3 w-3" /> 添加字段
                        </button>
                     </div>
                     
                     <div className="space-y-2">
                        {formFields.length === 0 && (
                            <div className="text-center py-4 bg-gray-50 rounded border border-dashed border-gray-200 text-xs text-gray-400">
                                暂无字段
                            </div>
                        )}
                        {formFields.map((field) => (
                            <div key={field.id} className="border border-gray-200 rounded-md p-2 bg-white space-y-2 relative group">
                                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => removeField(field.id)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <input 
                                            placeholder="Label"
                                            className="w-full text-xs font-medium border-b border-transparent focus:border-blue-500 outline-none"
                                            value={field.label}
                                            onChange={e => updateField(field.id, { label: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            placeholder="Variable Key"
                                            className="w-full text-xs font-mono text-gray-500 border-b border-transparent focus:border-blue-500 outline-none"
                                            value={field.key}
                                            onChange={e => updateField(field.id, { key: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <select 
                                        className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-gray-50"
                                        value={field.type}
                                        onChange={e => updateField(field.id, { type: e.target.value as any })}
                                    >
                                        <option value="text">Text</option>
                                        <option value="textarea">Long Text</option>
                                        <option value="number">Number</option>
                                        <option value="email">Email</option>
                                        <option value="boolean">Boolean</option>
                                        <option value="select">Select</option>
                                        <option value="file">File</option>
                                    </select>
                                    <label className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={field.required}
                                            onChange={e => updateField(field.id, { required: e.target.checked })}
                                        />
                                        Required
                                    </label>
                                    {field.type === 'file' && (
                                        <label className="flex items-center gap-1 text-[10px] text-gray-600 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={field.multiple || false}
                                                onChange={e => updateField(field.id, { multiple: e.target.checked })}
                                            />
                                            Multi
                                        </label>
                                    )}
                                </div>
                                {field.type === 'select' && (
                                     <input 
                                        placeholder="Options (comma separated)"
                                        className="w-full text-[10px] border border-gray-200 rounded px-2 py-1"
                                        value={field.options || ''}
                                        onChange={e => updateField(field.id, { options: e.target.value })}
                                     />
                                )}
                            </div>
                        ))}
                     </div>
                </div>
                <div className="rounded bg-gray-50 p-2 border border-gray-100 text-[10px] text-gray-500 flex justify-between items-center">
                    <span>Public URL:</span>
                    <a href="#" className="text-blue-600 hover:underline truncate max-w-[150px]">
                        https://forms.easyflow.com/f/{nodeId}
                    </a>
                </div>
            </div>
        )}

        {/* --- Manual Config --- */}
        {triggerType === 'manual' && (
            <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="bg-white p-2 rounded-full w-fit mx-auto mb-3 shadow-sm">
                    <Zap className="h-5 w-5 text-yellow-500" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">手动触发</h4>
                <p className="text-xs text-gray-500 mb-4">
                    该工作流只能通过控制台的“运行”按钮或 API 手动触发。
                    适用于子工作流或测试场景。
                </p>
            </div>
        )}

      </div>
    );
};

const ApiNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
    const { language } = useAppStore();
    const t = translations[language].editor.api;
    const [subTab, setSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'scripts'>('params');
    const [showImport, setShowImport] = useState(false);
    const [importContent, setImportContent] = useState('');
    const authConfig = config?.authConfig || {};

    const handleImport = () => {
        if (!importContent) return;
        
        let newConfig: any = {};
        
        try {
            // Try parsing as JSON (OpenAPI Operation Object)
            const json = JSON.parse(importContent);
            // Heuristic for OpenAPI operation object
            if (typeof json === 'object') {
                // If it looks like a full OpenAPI doc, we might need more logic, 
                // but if user pastes an Operation Object directly:
                // { "summary": "...", "parameters": [...], "responses": ... }
                // It's hard to extract URL/Method from just the operation object without the path key.
                // Assuming user pastes a simplified object or we support a simple JSON format:
                if (json.url) newConfig.url = json.url;
                if (json.method) newConfig.method = json.method.toUpperCase();
                if (json.headers) {
                    newConfig.headers = Object.entries(json.headers).map(([k, v], i) => ({ id: `h-${i}`, key: k, value: v }));
                }
                if (json.body) newConfig.body = typeof json.body === 'string' ? json.body : JSON.stringify(json.body, null, 2);
            }
        } catch (e) {
            // Not JSON, try basic cURL parsing (Simple regex based)
            if (importContent.trim().startsWith('curl')) {
                const urlMatch = importContent.match(/https?:\/\/[^\s"']+/);
                if (urlMatch) newConfig.url = urlMatch[0];
                
                if (importContent.includes('-X POST') || importContent.includes('--request POST')) newConfig.method = 'POST';
                else if (importContent.includes('-X PUT')) newConfig.method = 'PUT';
                else if (importContent.includes('-X DELETE')) newConfig.method = 'DELETE';
                else newConfig.method = 'GET'; // Default to GET, or check for data/body implies POST

                // Headers
                const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
                let match;
                const headers = [];
                while ((match = headerRegex.exec(importContent)) !== null) {
                    const [key, value] = match[1].split(/:\s?/);
                    headers.push({ id: `h-${Date.now()}-${headers.length}`, key, value });
                }
                if (headers.length > 0) newConfig.headers = headers;
            }
        }

        if (Object.keys(newConfig).length > 0) {
            Object.entries(newConfig).forEach(([k, v]) => onChange(k, v));
            alert(t.importTitle + ' Success');
            setShowImport(false);
            setImportContent('');
        } else {
            alert('Failed to parse input.');
        }
    };

    return (
      <div className="space-y-4">
        {/* Import Modal */}
        {showImport && (
            <div className="absolute inset-0 z-50 bg-white p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-gray-900">{t.importTitle}</h4>
                    <button onClick={() => setShowImport(false)}><X className="h-4 w-4 text-gray-500" /></button>
                </div>
                <p className="text-xs text-gray-500 mb-2">{t.importDesc}</p>
                <textarea 
                    className="flex-1 w-full border border-gray-200 rounded p-2 text-xs font-mono resize-none focus:border-blue-500 outline-none"
                    placeholder={t.pasteCurl}
                    value={importContent}
                    onChange={e => setImportContent(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setShowImport(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded">{translations[language].editor.cancel}</button>
                    <button onClick={handleImport} className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800">{t.btnImport}</button>
                </div>
            </div>
        )}

        {/* Method & URL Line */}
        <div className="flex gap-2">
          <select 
            value={config?.method || 'GET'}
            onChange={(e) => onChange('method', e.target.value)}
            className={clsx(
              "w-24 rounded-md border px-2 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-black",
              config?.method === 'GET' && "text-green-700 border-green-200 bg-green-50",
              config?.method === 'POST' && "text-yellow-700 border-yellow-200 bg-yellow-50",
              config?.method === 'DELETE' && "text-red-700 border-red-200 bg-red-50",
              (!config?.method || ['PUT', 'PATCH'].includes(config.method)) && "text-blue-700 border-blue-200 bg-blue-50",
            )}
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <EnhancedInput 
            placeholder="https://api.example.com/v1/resource"
            value={config?.url || ''}
            onValueChange={(val) => onChange('url', val)}
            nodes={nodes}
            currentNodeId={currentNodeId}
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-black w-full"
          />
          <button 
            onClick={() => setShowImport(true)}
            className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            title={t.import}
          >
              <Download className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
             {[
                 { id: 'params', label: t.tabs.params },
                 { id: 'auth', label: t.tabs.auth },
                 { id: 'headers', label: t.tabs.headers },
                 { id: 'body', label: t.tabs.body },
                 { id: 'scripts', label: t.tabs.scripts } // New Scripts Tab
             ].map((t) => (
               <button
                 key={t.id}
                 onClick={() => setSubTab(t.id as any)}
                 className={clsx(
                   "px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors whitespace-nowrap",
                   subTab === t.id ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"
                 )}
               >
                 {t.label}
               </button>
             ))}
          </div>

          <div className="min-h-[200px]">
            {/* Params Tab */}
            {subTab === 'params' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <KeyValueEditor 
                    items={config?.params} 
                    onChange={(v) => onChange('params', v)} 
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                />
              </div>
            )}

            {/* Auth Tab */}
            {subTab === 'auth' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-700">Authentication Type</label>
                    <select 
                        value={config?.authType || 'none'}
                        onChange={(e) => onChange('authType', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black bg-white"
                    >
                        <option value="none">{t.auth.none}</option>
                        <option value="bearer">{t.auth.bearer}</option>
                        <option value="basic">{t.auth.basic}</option>
                        <option value="oauth2">{t.auth.oauth2}</option>
                    </select>
                  </div>

                  {config?.authType === 'bearer' && (
                     <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Token</label>
                        <EnhancedInput
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1Ni..."
                            value={authConfig.token || ''}
                            onValueChange={(v) => onChange('authConfig', { ...authConfig, token: v })}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                        />
                     </div>
                  )}

                  {config?.authType === 'basic' && (
                     <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
                            <EnhancedInput
                                placeholder="admin"
                                value={authConfig.username || ''}
                                onValueChange={(v) => onChange('authConfig', { ...authConfig, username: v })}
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Password</label>
                            <EnhancedInput
                                type="password"
                                placeholder="********"
                                value={authConfig.password || ''}
                                onValueChange={(v) => onChange('authConfig', { ...authConfig, password: v })}
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                            />
                        </div>
                     </div>
                  )}

                  {config?.authType === 'oauth2' && (
                      <div className="space-y-3">
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.grantType}</label>
                              <select 
                                  value={authConfig.grantType || 'client_credentials'}
                                  onChange={e => onChange('authConfig', { ...authConfig, grantType: e.target.value })}
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
                              >
                                  <option value="client_credentials">Client Credentials</option>
                                  <option value="authorization_code">Authorization Code</option>
                              </select>
                          </div>
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.accessTokenUrl}</label>
                              <input 
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                  placeholder="https://api.example.com/oauth/token"
                                  value={authConfig.accessTokenUrl || ''}
                                  onChange={e => onChange('authConfig', { ...authConfig, accessTokenUrl: e.target.value })}
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.clientId}</label>
                                  <input 
                                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                      value={authConfig.clientId || ''}
                                      onChange={e => onChange('authConfig', { ...authConfig, clientId: e.target.value })}
                                  />
                              </div>
                              <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.clientSecret}</label>
                                  <input 
                                      type="password"
                                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                      value={authConfig.clientSecret || ''}
                                      onChange={e => onChange('authConfig', { ...authConfig, clientSecret: e.target.value })}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.scope}</label>
                              <input 
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                  placeholder="read write"
                                  value={authConfig.scope || ''}
                                  onChange={e => onChange('authConfig', { ...authConfig, scope: e.target.value })}
                              />
                          </div>
                          <div className="bg-yellow-50 p-2 rounded text-[10px] text-yellow-800 border border-yellow-100">
                              Note: OAuth2 token will be automatically fetched before the request.
                          </div>
                      </div>
                  )}
              </div>
            )}

            {/* Headers Tab */}
            {subTab === 'headers' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <KeyValueEditor 
                    items={config?.headers} 
                    onChange={(v) => onChange('headers', v)} 
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                />
              </div>
            )}

            {/* Body Tab */}
            {subTab === 'body' && (
               <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
                 <div className="mb-2 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-medium">Content-Type: application/json</span>
                 </div>
                 <EnhancedTextarea
                   value={config?.body || ''}
                   onValueChange={(val) => onChange('body', val)}
                   nodes={nodes}
                   currentNodeId={currentNodeId}
                   placeholder="{\n  'key': 'value'\n}"
                   className="w-full h-48 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs font-mono outline-none focus:border-black focus:ring-1 focus:ring-black resize-none text-gray-800"
                 />
               </div>
            )}

            {/* Scripts Tab */}
            {subTab === 'scripts' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 h-full overflow-y-auto pr-1">
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded text-[10px] text-blue-700 mb-2">
                        {t.scripts.hint}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.scripts.preRequest}</label>
                        <EnhancedTextarea 
                            value={config?.preRequestScript || ''}
                            onValueChange={val => onChange('preRequestScript', val)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full h-32 rounded-md border border-gray-200 bg-gray-900 text-gray-300 p-2 text-xs font-mono outline-none resize-none focus:border-blue-500"
                            placeholder="// console.log('Preparing request...');"
                            spellCheck={false}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.scripts.test}</label>
                        <EnhancedTextarea 
                            value={config?.testScript || ''}
                            onValueChange={val => onChange('testScript', val)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full h-32 rounded-md border border-gray-200 bg-gray-900 text-gray-300 p-2 text-xs font-mono outline-none resize-none focus:border-blue-500"
                            placeholder="// if (response.status === 200) { ... }"
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    );
};

const KeyValueEditor = ({ items = [], onChange, nodes, currentNodeId }: { items?: KeyValuePair[], onChange: (items: KeyValuePair[]) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
  const addRow = () => {
    onChange([...items, { id: Date.now().toString(), key: '', value: '' }]);
  };

  const updateRow = (id: string, field: 'key' | 'value', val: string) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const removeRow = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_1fr_20px] gap-2 mb-1 px-1">
        <span className="text-[10px] font-medium text-gray-400">键 (KEY)</span>
        <span className="text-[10px] font-medium text-gray-400">值 (VALUE)</span>
      </div>
      {items.map((item) => (
        <div key={item.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
          <input
            type="text"
            placeholder="Key"
            value={item.key}
            onChange={(e) => updateRow(item.id, 'key', e.target.value)}
            className="w-full min-w-0 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
          />
          <EnhancedInput
            placeholder="Value"
            value={item.value}
            onValueChange={(val) => updateRow(item.id, 'value', val)}
            nodes={nodes}
            currentNodeId={currentNodeId}
            className="w-full min-w-0 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
          />
          <button onClick={() => removeRow(item.id)} className="mt-1.5 text-gray-400 hover:text-red-500">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <button onClick={addRow} className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2">
        <Plus className="h-3 w-3" /> 添加参数
      </button>
    </div>
  );
};

// NEW: Condition Node Config
const ConditionNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800">
                <div className="flex items-center gap-2 mb-1 font-semibold">
                    <Workflow className="h-4 w-4" />
                    逻辑判断 (IF/ELSE)
                </div>
                <p className="opacity-90">
                    如果表达式结果为 <code>true</code>，流程将继续执行。否则流程终止（或进入 False 分支）。
                </p>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">条件表达式 (JavaScript)</label>
                <EnhancedTextarea
                    value={config?.conditionExpression || ''}
                    onValueChange={(val) => onChange('conditionExpression', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    className="w-full h-[150px] rounded-md border border-gray-200 bg-gray-50 p-3 text-xs font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none text-gray-800"
                    placeholder={`// 示例:\ninputs.body.value > 100 && steps.api_1.status === 200`}
                    spellCheck={false}
                />
            </div>
        </div>
    );
}

const LlmNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
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

const DelayNodeConfig = ({ config, onChange }: { config: any, onChange: (k: string, v: any) => void }) => {
    const delayConfig = config?.delayConfig || { duration: 1, unit: 'seconds' };

    const updateDelay = (key: string, value: any) => {
        onChange('delayConfig', { ...delayConfig, [key]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-xs text-yellow-800">
                <Clock className="h-4 w-4 inline-block mr-1 mb-0.5" />
                暂停工作流执行一段指定的时间。
             </div>
             
             <div className="flex gap-2">
                 <div className="flex-1">
                     <label className="mb-1 block text-xs font-medium text-gray-700">时长</label>
                     <input 
                        type="number"
                        min="0"
                        value={delayConfig.duration}
                        onChange={(e) => updateDelay('duration', parseInt(e.target.value) || 0)}
                        className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm outline-none focus:border-black"
                     />
                 </div>
                 <div className="w-1/3">
                     <label className="mb-1 block text-xs font-medium text-gray-700">单位</label>
                     <select
                        value={delayConfig.unit}
                        onChange={(e) => updateDelay('unit', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm bg-white outline-none focus:border-black"
                     >
                         <option value="ms">毫秒</option>
                         <option value="seconds">秒</option>
                         <option value="minutes">分钟</option>
                     </select>
                 </div>
             </div>
        </div>
    );
};

const DbNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
    const dbConfig = config?.dbConfig || { type: 'postgres' };
    
    const updateDb = (key: string, value: any) => {
        onChange('dbConfig', { ...dbConfig, [key]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">数据库类型</label>
                <select
                    value={dbConfig.type}
                    onChange={(e) => updateDb('type', e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm bg-white outline-none focus:border-black"
                >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mssql">SQL Server</option>
                </select>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">连接字符串</label>
                <input 
                   type="password"
                   placeholder="postgresql://user:password@localhost:5432/mydb"
                   value={dbConfig.connectionString || ''}
                   onChange={(e) => updateDb('connectionString', e.target.value)}
                   className="w-full rounded-md border border-gray-200 px-2 py-2 text-xs outline-none focus:border-black font-mono"
                />
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">SQL 查询语句</label>
                <EnhancedTextarea 
                    value={dbConfig.query || ''}
                    onValueChange={(val) => updateDb('query', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    placeholder="SELECT * FROM users WHERE id = {{steps.prev.userId}};"
                    className="w-full h-40 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono focus:border-blue-500 outline-none resize-none text-gray-800"
                />
                <p className="mt-1 text-[10px] text-gray-400">支持使用 <code>{`{{variables}}`}</code> 进行参数注入。</p>
            </div>
        </div>
    );
};

const ProcessNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>JavaScript 代码 (沙箱)</span>
        <div className="flex items-center gap-2">
            <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">NodeJS 环境</span>
            <Code2 className="h-3 w-3" />
        </div>
      </div>
      <div className="relative flex-1">
        <EnhancedTextarea
          value={config?.code || ''}
          onValueChange={(val) => onChange('code', val)}
          nodes={nodes}
          currentNodeId={currentNodeId}
          className="w-full h-[300px] rounded-md border border-gray-200 bg-gray-900 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-gray-100 leading-relaxed"
          placeholder={`// 使用 'inputs' 或 'steps' 获取前置数据\n\nreturn {\n  processed: true,\n  value: inputs.data * 2\n};`}
          spellCheck={false}
        />
      </div>
      <div className="rounded bg-blue-50 p-2 text-[10px] text-blue-700 border border-blue-100">
        <strong>提示:</strong> 使用 <code>return</code> 返回数据给下一个节点。
      </div>
    </div>
);

const EndNodeConfig = ({ config, onChange, nodes, currentNodeId }: { config: any, onChange: (k: string, v: any) => void, nodes: WorkflowNode[], currentNodeId: string }) => (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-700">HTTP 状态码</label>
        <input 
            type="number"
            value={config?.responseStatus || 200}
            onChange={(e) => onChange('responseStatus', parseInt(e.target.value))}
            className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-black font-mono"
            placeholder="200"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-700">响应内容 (JSON)</label>
        <EnhancedTextarea
            value={config?.responseBody || ''}
            onValueChange={(val) => onChange('responseBody', val)}
            nodes={nodes}
            currentNodeId={currentNodeId}
            className="w-full h-[200px] rounded-md border border-gray-200 p-3 text-xs font-mono outline-none focus:border-black resize-none"
            placeholder={`{\n  "status": "success",\n  "data": {{steps.last.data}}\n}`}
            spellCheck={false}
        />
        <p className="mt-1 text-[10px] text-gray-400">定义工作流最终返回的 JSON 数据。</p>
      </div>
    </div>
);

// --- Main Component ---

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