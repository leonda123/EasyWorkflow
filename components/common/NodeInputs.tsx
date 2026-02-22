import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { Braces, Trash2, Plus, AlertCircle } from 'lucide-react';
import { WorkflowNode, NodeType, KeyValuePair, WorkflowEdge } from '../../types';
import VariablePicker from './VariablePicker';

const validateVariableSyntax = (text: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const regex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const expression = match[1].trim();
    if (expression.includes('{{') || expression.includes('}}')) {
      errors.push(`嵌套语法错误: ${match[0]}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
};

interface VariableMenuProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  currentNodeId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
}

export const VariableMenu = ({ nodes, edges, currentNodeId, onSelect, onClose }: VariableMenuProps) => {
  const availableNodes = nodes.filter(n => n.id !== currentNodeId);

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
  edges?: WorkflowEdge[];
};

export const EnhancedInput = ({ value, onValueChange, nodes, currentNodeId, edges = [], className, ...props }: EnhancedInputProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const syntaxValidation = useMemo(() => {
    const val = value ? String(value) : '';
    return validateVariableSyntax(val);
  }, [value]);

  const handleInsert = useCallback((variable: string) => {
    const input = inputRef.current;
    if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const val = value ? String(value) : '';
        const newValue = val.slice(0, start) + variable + val.slice(end);
        onValueChange(newValue);
        
        setTimeout(() => {
            input.focus();
            const newCursorPos = start + variable.length;
            input.setSelectionRange(newCursorPos, newCursorPos);
        }, 0);
    } else {
        const currentVal = value ? String(value) : '';
        onValueChange(currentVal + variable);
    }
    setShowPicker(false);
  }, [value, onValueChange]);

  const handleOpenPicker = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPickerPosition({ x: rect.right - 320, y: rect.bottom + 4 });
    }
    setShowPicker(true);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === '{' && !e.shiftKey) {
      e.preventDefault();
      handleOpenPicker();
    }
    if (props.onKeyDown) {
      props.onKeyDown(e);
    }
  }, [handleOpenPicker, props]);

  return (
    <div className="relative flex items-center w-full">
      <input
        {...props}
        ref={inputRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={clsx(className, "pr-8", !syntaxValidation.valid && "border-red-300 bg-red-50")}
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
        {!syntaxValidation.valid && (
          <div className="group relative">
            <AlertCircle className="h-3 w-3 text-red-500" />
            <div className="absolute right-0 top-4 hidden group-hover:block w-48 bg-red-50 border border-red-200 rounded p-2 text-[10px] text-red-600 z-10 shadow-lg">
              {syntaxValidation.errors.map((err, i) => (
                <div key={i}>{err}</div>
              ))}
              <div className="mt-1 pt-1 border-t border-red-200 text-red-500">
                正确: {`{{func(path)}}`}
              </div>
            </div>
          </div>
        )}
        <button
            ref={buttonRef}
            onClick={handleOpenPicker}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            title="插入变量 (输入 { 快捷键)"
        >
            <Braces className="h-3 w-3" />
        </button>
      </div>
      {showPicker && (
        <VariablePicker
          nodes={nodes}
          edges={edges}
          currentNodeId={currentNodeId}
          onSelect={handleInsert}
          onClose={() => setShowPicker(false)}
          position={pickerPosition}
        />
      )}
    </div>
  );
};

export type EnhancedTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onValueChange: (val: string) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges?: WorkflowEdge[];
};

export const EnhancedTextarea = ({ value, onValueChange, nodes, currentNodeId, edges = [], className, ...props }: EnhancedTextareaProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number } | undefined>();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const syntaxValidation = useMemo(() => {
      const val = value ? String(value) : '';
      return validateVariableSyntax(val);
    }, [value]);
  
    const handleInsert = useCallback((variable: string) => {
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
        setShowPicker(false);
    }, [value, onValueChange]);

    const handleOpenPicker = useCallback(() => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setPickerPosition({ x: rect.right - 320, y: rect.bottom + 4 });
      }
      setShowPicker(true);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === '{' && !e.shiftKey) {
        e.preventDefault();
        handleOpenPicker();
      }
      if (props.onKeyDown) {
        props.onKeyDown(e);
      }
    }, [handleOpenPicker, props]);
  
    return (
      <div className="relative w-full">
        <textarea
          {...props}
          ref={textareaRef}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className={clsx(className, !syntaxValidation.valid && "border-red-300 bg-red-50")}
        />
        <div className="absolute right-2 top-2 flex items-center gap-1">
            {!syntaxValidation.valid && (
              <div className="group relative">
                <AlertCircle className="h-3 w-3 text-red-500" />
                <div className="absolute right-0 top-4 hidden group-hover:block w-48 bg-red-50 border border-red-200 rounded p-2 text-[10px] text-red-600 z-10 shadow-lg">
                  {syntaxValidation.errors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  <div className="mt-1 pt-1 border-t border-red-200 text-red-500">
                    正确: {`{{func(path)}}`}
                  </div>
                </div>
              </div>
            )}
            <button
                ref={buttonRef}
                onClick={handleOpenPicker}
                className="flex h-6 w-6 items-center justify-center rounded bg-white border border-gray-200 shadow-sm text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all"
                title="插入变量 (输入 { 快捷键)"
            >
                <Braces className="h-3 w-3" />
            </button>
            {showPicker && (
              <VariablePicker
                nodes={nodes}
                edges={edges}
                currentNodeId={currentNodeId}
                onSelect={handleInsert}
                onClose={() => setShowPicker(false)}
                position={pickerPosition}
              />
            )}
        </div>
      </div>
    );
};

export const KeyValueEditor = ({ 
  items = [], 
  onChange, 
  nodes, 
  currentNodeId,
  edges = []
}: { 
  items?: KeyValuePair[]; 
  onChange: (items: KeyValuePair[]) => void; 
  nodes: WorkflowNode[]; 
  currentNodeId: string;
  edges?: WorkflowEdge[];
}) => {
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
            edges={edges}
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
