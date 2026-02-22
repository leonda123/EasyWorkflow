import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Braces, ChevronDown, ChevronRight, Code } from 'lucide-react';
import { clsx } from 'clsx';
import { WorkflowNode, WorkflowEdge, OutputVariable, OutputVariableType } from '../../../types';
import { EnhancedInput } from '../../common/NodeInputs';
import VariablePicker from '../../common/VariablePicker';
import { getAllVariables } from '../../../lib/variableUtils';

interface OutputVariableEditorProps {
  variables: OutputVariable[];
  onChange: (variables: OutputVariable[]) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
}

const TYPE_OPTIONS: { value: OutputVariableType; label: string; icon: string }[] = [
  { value: 'string', label: '文本', icon: '📝' },
  { value: 'number', label: '数字', icon: '🔢' },
  { value: 'boolean', label: '布尔', icon: '✓' },
  { value: 'object', label: '对象', icon: '📦' },
  { value: 'array', label: '数组', icon: '📋' },
];

const TYPE_ICONS: Record<OutputVariableType, string> = {
  string: '📝',
  number: '🔢',
  boolean: '✓',
  object: '📦',
  array: '📋',
};

const createEmptyVariable = (): OutputVariable => ({
  id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: '',
  type: 'string',
  description: '',
  sourcePath: '',
  defaultValue: undefined,
});

const VariableRow: React.FC<{
  variable: OutputVariable;
  onChange: (variable: OutputVariable) => void;
  onDelete: () => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
  index: number;
}> = ({ variable, onChange, onDelete, nodes, currentNodeId, edges, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number }>();

  const handleVariableSelect = useCallback((selected: string) => {
    const cleanPath = selected.replace(/^\{\{|\}\}$/g, '');
    onChange({ ...variable, sourcePath: cleanPath });
    setShowPicker(false);
  }, [variable, onChange]);

  const allVariables = useMemo(() => 
    getAllVariables(currentNodeId, nodes, edges),
    [currentNodeId, nodes, edges]
  );

  const sourceVariableLabel = useMemo(() => {
    if (!variable.sourcePath) return '';
    
    for (const trigger of allVariables.trigger) {
      if (trigger.path === variable.sourcePath) return trigger.label;
      if (trigger.children) {
        const child = trigger.children.find(c => c.path === variable.sourcePath);
        if (child) return child.label;
      }
    }
    
    for (const { node, outputs } of allVariables.nodes) {
      for (const output of outputs) {
        if (output.path === variable.sourcePath) return `${node.data.label} → ${output.label}`;
        if (output.children) {
          const child = output.children.find(c => c.path === variable.sourcePath);
          if (child) return `${node.data.label} → ${child.label}`;
        }
      }
    }
    
    return variable.sourcePath;
  }, [variable.sourcePath, allVariables]);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-gray-400">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
        
        <span className="text-lg">{TYPE_ICONS[variable.type]}</span>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-800 truncate">
              {variable.name || `变量 ${index + 1}`}
            </span>
            {variable.sourcePath && (
              <span className="text-[10px] text-gray-400 truncate">
                ← {sourceVariableLabel}
              </span>
            )}
          </div>
          {variable.description && (
            <div className="text-[10px] text-gray-400 truncate">{variable.description}</div>
          )}
        </div>
        
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="删除变量"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      
      {expanded && (
        <div className="p-3 space-y-3 bg-white border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-gray-500">变量名称</label>
              <input
                type="text"
                value={variable.name}
                onChange={(e) => onChange({ ...variable, name: e.target.value })}
                placeholder="例如: userName"
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-[10px] font-medium text-gray-500">数据类型</label>
              <select
                value={variable.type}
                onChange={(e) => onChange({ ...variable, type: e.target.value as OutputVariableType })}
                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500 bg-white"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-500">描述（可选）</label>
            <input
              type="text"
              value={variable.description || ''}
              onChange={(e) => onChange({ ...variable, description: e.target.value })}
              placeholder="变量的用途说明"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-500">数据来源</label>
            <div className="relative">
              <button
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setPickerPosition({ x: rect.left, y: rect.bottom + 4 });
                  setShowPicker(true);
                }}
                className={clsx(
                  "w-full text-left px-2 py-1.5 text-xs rounded border truncate",
                  variable.sourcePath 
                    ? "border-blue-200 bg-blue-50 text-blue-700" 
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
                )}
              >
                {variable.sourcePath ? (
                  <span className="flex items-center gap-1">
                    <Braces className="h-3 w-3" />
                    {sourceVariableLabel}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Braces className="h-3 w-3" />
                    选择前置节点变量...
                  </span>
                )}
              </button>
              {showPicker && (
                <VariablePicker
                  nodes={nodes}
                  edges={edges}
                  currentNodeId={currentNodeId}
                  onSelect={handleVariableSelect}
                  onClose={() => setShowPicker(false)}
                  position={pickerPosition}
                />
              )}
            </div>
          </div>
          
          <div>
            <label className="mb-1 block text-[10px] font-medium text-gray-500">默认值（可选）</label>
            <input
              type="text"
              value={variable.defaultValue ?? ''}
              onChange={(e) => {
                let value: any = e.target.value;
                if (variable.type === 'number' && value) {
                  value = Number(value);
                } else if (variable.type === 'boolean') {
                  value = value === 'true';
                }
                onChange({ ...variable, defaultValue: value || undefined });
              }}
              placeholder={variable.type === 'boolean' ? 'true/false' : variable.type === 'number' ? '0' : '默认值'}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

const OutputVariableEditor: React.FC<OutputVariableEditorProps> = ({
  variables,
  onChange,
  nodes,
  currentNodeId,
  edges,
}) => {
  const handleAdd = () => {
    onChange([...variables, createEmptyVariable()]);
  };

  const handleUpdate = (id: string, newVariable: OutputVariable) => {
    onChange(variables.map(v => v.id === id ? newVariable : v));
  };

  const handleDelete = (id: string) => {
    onChange(variables.filter(v => v.id !== id));
  };

  const previewOutput = useMemo(() => {
    const result: Record<string, any> = {};
    variables.forEach(v => {
      if (v.name) {
        result[v.name] = v.sourcePath 
          ? `{{${v.sourcePath}}}` 
          : v.defaultValue ?? (v.type === 'string' ? '' : v.type === 'number' ? 0 : v.type === 'boolean' ? false : v.type === 'array' ? [] : {});
      }
    });
    return result;
  }, [variables]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">输出变量列表</label>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-3 w-3" />
          添加变量
        </button>
      </div>
      
      {variables.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          <Code className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">暂无输出变量</p>
          <p className="text-[10px] mt-1">点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-2">
          {variables.map((variable, index) => (
            <VariableRow
              key={variable.id}
              variable={variable}
              onChange={(v) => handleUpdate(variable.id, v)}
              onDelete={() => handleDelete(variable.id)}
              nodes={nodes}
              currentNodeId={currentNodeId}
              edges={edges}
              index={index}
            />
          ))}
        </div>
      )}
      
      {Object.keys(previewOutput).length > 0 && (
        <div className="mt-4">
          <label className="mb-1 block text-[10px] font-medium text-gray-500">输出预览</label>
          <div className="bg-gray-900 rounded-lg p-3">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(previewOutput, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutputVariableEditor;
