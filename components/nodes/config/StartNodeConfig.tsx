import React from 'react';
import { clsx } from 'clsx';
import { Globe, Calendar, FormInput, MousePointerClick, Zap, Clock, Plus, Trash2, Copy, Info } from 'lucide-react';
import { FormField } from '../../../types';
import { BACKEND_URL } from '../../../lib/api';

interface StartNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodeId: string;
    workflowId?: string;
}

const StartNodeConfig: React.FC<StartNodeConfigProps> = ({ config, onChange, nodeId, workflowId }) => {
    const triggerType = config?.triggerType || 'webhook';
    const formFields: FormField[] = config?.formFields || [];
    const webhookId = workflowId || nodeId;

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
                            {BACKEND_URL}/api/v1/hooks/{webhookId}
                        </code>
                        <button className="text-gray-400 hover:text-black" title="复制">
                            <Copy className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="mt-3 text-[10px] text-gray-500">
                        <p className="font-semibold mb-1">CURL 测试:</p>
                        <code className="block bg-gray-900 text-gray-300 p-2 rounded whitespace-pre-wrap font-mono">
                            curl -X {config?.webhookMethod || 'POST'} {BACKEND_URL}/api/v1/hooks/{webhookId} \<br/>
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
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-medium text-gray-700">Cron 表达式</label>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Info className="h-3 w-3" />
                            <span>支持秒级 (6位)</span>
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="*/5 * * * * *"
                        value={config?.cronExpression || ''}
                        onChange={(e) => onChange('cronExpression', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-black placeholder:text-gray-300"
                    />
                    <div className="mt-1 flex items-center gap-2 text-[9px] text-gray-400 font-mono pl-1">
                        <span>秒</span>
                        <span>分</span>
                        <span>时</span>
                        <span>日</span>
                        <span>月</span>
                        <span>周</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {[
                            { label: '每5秒', val: '*/5 * * * * *' },
                            { label: '每分钟', val: '0 * * * * *' },
                            { label: '每小时', val: '0 0 * * * *' },
                            { label: '每天 8:00', val: '0 0 8 * * *' },
                            { label: '每周一', val: '0 0 9 * * 1' }
                        ].map(preset => (
                            <button 
                                key={preset.val}
                                onClick={() => onChange('cronExpression', preset.val)}
                                className="px-2 py-1 text-[10px] bg-gray-50 hover:bg-gray-100 rounded text-gray-600 border border-gray-200 transition-colors"
                                title={preset.val}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="rounded bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100 flex gap-2">
                    <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">关于时区</p>
                        <p className="opacity-80">调度器使用 UTC 时区。例如北京时间 (UTC+8) 每天上午 8 点，应设置为 <code>0 0 0 * * *</code>。</p>
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

export default StartNodeConfig;