import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { Braces, Trash2, Plus } from 'lucide-react';
import { WorkflowNode, NodeType, KeyValuePair } from '../../types';

interface VariableMenuProps {
  nodes: WorkflowNode[];
  currentNodeId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
}

export const VariableMenu = ({ nodes, currentNodeId, onSelect, onClose }: VariableMenuProps) => {
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

export type EnhancedInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onValueChange: (val: string) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
};

export const EnhancedInput = ({ value, onValueChange, nodes, currentNodeId, className, ...props }: EnhancedInputProps) => {
  const [showVars, setShowVars] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInsert = (variable: string) => {
    const input = inputRef.current;
    if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const val = value ? String(value) : '';
        const newValue = val.slice(0, start) + variable + val.slice(end);
        onValueChange(newValue);
        
        // Restore focus and move cursor
        setTimeout(() => {
            input.focus();
            const newCursorPos = start + variable.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    } else {
        const currentVal = value ? String(value) : '';
        onValueChange(currentVal + variable);
    }
    setShowVars(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '{') {
      setShowVars(true);
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        {...props}
        ref={inputRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
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

export type EnhancedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onValueChange: (val: string) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
};

export const EnhancedTextarea = ({ value, onValueChange, nodes, currentNodeId, className, ...props }: EnhancedTextareaProps) => {
    const [showVars, setShowVars] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
  
    const handleInsert = (variable: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart || 0;
            const end = textarea.selectionEnd || 0;
            const val = value ? String(value) : '';
            const newValue = val.slice(0, start) + variable + val.slice(end);
            onValueChange(newValue);
            
            setTimeout(() => {
                textarea.focus();
                const newCursorPos = start + variable.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        } else {
            const val = value ? String(value) : '';
            onValueChange(val + variable);
        }
        setShowVars(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === '{') {
        setShowVars(true);
      }
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    };
  
    return (
      <div className="relative w-full">
        <textarea
          {...props}
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
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

export const KeyValueEditor = ({ items = [], onChange, nodes, currentNodeId }: { items?: KeyValuePair[], onChange: (items: KeyValuePair[]) => void, nodes: WorkflowNode[], currentNodeId: string }) => {
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
