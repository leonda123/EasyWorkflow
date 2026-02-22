import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Braces, ChevronDown, ChevronRight, Database, ArrowRightLeft } from 'lucide-react';
import { clsx } from 'clsx';
import { WorkflowNode, WorkflowEdge, PresetField, PresetFieldType } from '../../../types';
import VariablePicker from '../../common/VariablePicker';
import { getAllVariables } from '../../../lib/variableUtils';

interface PresetFieldEditorProps {
  fields: PresetField[];
  onChange: (fields: PresetField[]) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
}

const TYPE_OPTIONS: { value: PresetFieldType; label: string }[] = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'object', label: '对象' },
  { value: 'array', label: '数组' },
];

const TYPE_LABELS: Record<PresetFieldType, string> = {
  string: '文本',
  number: '数字',
  boolean: '布尔',
  object: '对象',
  array: '数组',
};

const createEmptyField = (): PresetField => ({
  id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  key: '',
  type: 'string',
  value: '',
  isVariable: false,
});

const FieldRow: React.FC<{
  field: PresetField;
  onChange: (field: PresetField) => void;
  onDelete: () => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
  index: number;
}> = ({ field, onChange, onDelete, nodes, currentNodeId, edges, index }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number }>();

  const handleVariableSelect = useCallback((selected: string) => {
    const cleanPath = selected.replace(/^\{\{|\}\}$/g, '');
    onChange({ ...field, value: cleanPath, isVariable: true });
    setShowPicker(false);
  }, [field, onChange]);

  const allVariables = useMemo(() => 
    getAllVariables(currentNodeId, nodes, edges),
    [currentNodeId, nodes, edges]
  );

  const sourceVariableLabel = useMemo(() => {
    if (!field.isVariable || !field.value) return '';
    
    for (const trigger of allVariables.trigger) {
      if (trigger.path === field.value) return trigger.label;
      if (trigger.children) {
        const child = trigger.children.find(c => c.path === field.value);
        if (child) return child.label;
      }
    }
    
    for (const { node, outputs } of allVariables.nodes) {
      for (const output of outputs) {
        if (output.path === field.value) return `${node.data.label} → ${output.label}`;
        if (output.children) {
          const child = output.children.find(c => c.path === field.value);
          if (child) return `${node.data.label} → ${child.label}`;
        }
      }
    }
    
    return field.value;
  }, [field.value, field.isVariable, allVariables]);

  return (
    <div className="flex items-center gap-2 py-2 px-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
      <input
        type="text"
        value={field.key}
        onChange={(e) => onChange({ ...field, key: e.target.value })}
        placeholder="字段名"
        className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500"
      />
      
      <select
        value={field.type}
        onChange={(e) => onChange({ ...field, type: e.target.value as PresetFieldType })}
        className="px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500 bg-white min-w-[60px]"
      >
        {TYPE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      
      <ArrowRightLeft className="h-3 w-3 text-gray-300" />
      
      <div className="flex-1 relative">
        {field.isVariable ? (
          <button
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPickerPosition({ x: rect.left, y: rect.bottom + 4 });
              setShowPicker(true);
            }}
            className="w-full text-left px-2 py-1.5 text-xs rounded border border-purple-200 bg-purple-50 text-purple-700 truncate"
          >
            <span className="flex items-center gap-1">
              <Braces className="h-3 w-3" />
              {sourceVariableLabel || field.value}
            </span>
          </button>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={field.value}
              onChange={(e) => onChange({ ...field, value: e.target.value, isVariable: false })}
              placeholder="静态值"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded outline-none focus:border-blue-500 pr-7"
            />
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPickerPosition({ x: rect.left - 280, y: rect.bottom + 4 });
                setShowPicker(true);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-purple-500"
              title="选择变量"
            >
              <Braces className="h-3 w-3" />
            </button>
          </div>
        )}
        
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
      
      <button
        onClick={onDelete}
        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="删除字段"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const PresetFieldEditor: React.FC<PresetFieldEditorProps> = ({
  fields,
  onChange,
  nodes,
  currentNodeId,
  edges,
}) => {
  const handleAdd = () => {
    onChange([...fields, createEmptyField()]);
  };

  const handleUpdate = (id: string, newField: PresetField) => {
    onChange(fields.map(f => f.id === id ? newField : f));
  };

  const handleDelete = (id: string) => {
    onChange(fields.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700">字段配置</label>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="h-3 w-3" />
          添加字段
        </button>
      </div>
      
      {fields.length === 0 ? (
        <div className="text-center py-6 text-gray-400 border border-dashed border-gray-200 rounded-lg">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">暂无字段配置</p>
          <p className="text-[10px] mt-1">点击上方按钮添加字段</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              onChange={(f) => handleUpdate(field.id, f)}
              onDelete={() => handleDelete(field.id)}
              nodes={nodes}
              currentNodeId={currentNodeId}
              edges={edges}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PresetFieldEditor;
