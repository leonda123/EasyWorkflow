import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Braces, Copy, Check, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { WorkflowNode, WorkflowEdge, ConditionRule, ConditionGroup, ConditionOperator, ConditionValueType } from '../../../types';
import { getAllVariables, getNodeTypeIcon, VariableOption } from '../../../lib/variableUtils';
import { 
  OPERATOR_LABELS, 
  OPERATORS_REQUIRING_VALUE, 
  OPERATORS_NO_VALUE,
  createEmptyRule, 
  createEmptyGroup,
  generateExpressionFromGroups 
} from '../../../lib/conditionUtils';
import VariablePicker from '../../common/VariablePicker';

interface ConditionBuilderProps {
  groups: ConditionGroup[];
  onChange: (groups: ConditionGroup[]) => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
}

const VALUE_TYPE_OPTIONS: { value: ConditionValueType; label: string }[] = [
  { value: 'string', label: '文本' },
  { value: 'number', label: '数字' },
  { value: 'boolean', label: '布尔' },
  { value: 'variable', label: '变量' },
];

const ALL_OPERATORS: ConditionOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'contains',
  'notContains',
  'isEmpty',
  'isNotEmpty',
  'startsWith',
  'endsWith',
  'inArray',
  'notInArray',
];

const RuleEditor: React.FC<{
  rule: ConditionRule;
  onChange: (rule: ConditionRule) => void;
  onDelete: () => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
  isFirst: boolean;
}> = ({ rule, onChange, onDelete, nodes, currentNodeId, edges, isFirst }) => {
  const [showVariablePicker, setShowVariablePicker] = useState(false);
  const [showValuePicker, setShowValuePicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState<{ x: number; y: number }>();
  
  const allVariables = useMemo(() => 
    getAllVariables(currentNodeId, nodes, edges),
    [currentNodeId, nodes, edges]
  );
  
  const flattenedVariables = useMemo(() => {
    const result: { path: string; label: string; nodeName?: string }[] = [];
    
    allVariables.trigger.forEach(v => {
      result.push({ path: v.path, label: v.label });
      if (v.children) {
        v.children.forEach(c => result.push({ path: c.path, label: c.label }));
      }
    });
    
    allVariables.nodes.forEach(({ node, outputs }) => {
      outputs.forEach(output => {
        result.push({ path: output.path, label: output.label, nodeName: node.data.label });
        if (output.children) {
          output.children.forEach(c => result.push({ path: c.path, label: c.label, nodeName: node.data.label }));
        }
      });
    });
    
    return result;
  }, [allVariables]);

  const selectedVariable = useMemo(() => 
    flattenedVariables.find(v => v.path === rule.variablePath),
    [flattenedVariables, rule.variablePath]
  );

  const handleVariableSelect = useCallback((variable: string) => {
    const cleanPath = variable.replace(/^\{\{|\}\}$/g, '');
    const found = flattenedVariables.find(v => v.path === cleanPath);
    onChange({
      ...rule,
      variablePath: cleanPath,
      variableLabel: found?.label,
    });
    setShowVariablePicker(false);
  }, [rule, onChange, flattenedVariables]);

  const handleValueSelect = useCallback((variable: string) => {
    onChange({
      ...rule,
      value: variable,
      valueType: 'variable',
    });
    setShowValuePicker(false);
  }, [rule, onChange]);

  const needsValue = OPERATORS_REQUIRING_VALUE.includes(rule.operator);

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 bg-white rounded-lg border border-gray-100">
      {!isFirst && (
        <span className="text-[10px] text-gray-400 font-medium w-8">AND</span>
      )}
      
      <div className="relative flex-1 min-w-0">
        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setPickerPosition({ x: rect.left, y: rect.bottom + 4 });
            setShowVariablePicker(true);
          }}
          className={clsx(
            "w-full text-left px-2 py-1.5 text-xs rounded border truncate",
            rule.variablePath 
              ? "border-blue-200 bg-blue-50 text-blue-700" 
              : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"
          )}
        >
          {selectedVariable ? (
            <span className="flex items-center gap-1">
              {selectedVariable.nodeName && (
                <span className="text-gray-400">{selectedVariable.nodeName} →</span>
              )}
              {selectedVariable.label}
            </span>
          ) : (
            '选择变量...'
          )}
        </button>
        {showVariablePicker && (
          <VariablePicker
            nodes={nodes}
            edges={edges}
            currentNodeId={currentNodeId}
            onSelect={handleVariableSelect}
            onClose={() => setShowVariablePicker(false)}
            position={pickerPosition}
          />
        )}
      </div>

      <select
        value={rule.operator}
        onChange={(e) => onChange({ ...rule, operator: e.target.value as ConditionOperator })}
        className="px-2 py-1.5 text-xs rounded border border-gray-200 bg-white outline-none focus:border-blue-500 min-w-[80px]"
      >
        {ALL_OPERATORS.map(op => (
          <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
        ))}
      </select>

      {needsValue && (
        <>
          <select
            value={rule.valueType}
            onChange={(e) => onChange({ ...rule, valueType: e.target.value as ConditionValueType, value: '' })}
            className="px-1.5 py-1.5 text-xs rounded border border-gray-200 bg-white outline-none focus:border-blue-500"
          >
            {VALUE_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="relative flex-1 min-w-0">
            {rule.valueType === 'boolean' ? (
              <select
                value={rule.value}
                onChange={(e) => onChange({ ...rule, value: e.target.value })}
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-200 bg-white outline-none focus:border-blue-500"
              >
                <option value="true">true</option>
                <option value="false">false</option>
              </select>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => onChange({ ...rule, value: e.target.value })}
                  placeholder={rule.valueType === 'variable' ? '选择变量...' : '输入值...'}
                  className={clsx(
                    "w-full px-2 py-1.5 text-xs rounded border outline-none focus:border-blue-500",
                    rule.valueType === 'variable' ? "pr-7 border-purple-200 bg-purple-50" : "border-gray-200"
                  )}
                />
                {rule.valueType === 'variable' && (
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setPickerPosition({ x: rect.left - 280, y: rect.bottom + 4 });
                      setShowValuePicker(true);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-purple-100 rounded"
                  >
                    <Braces className="h-3 w-3 text-purple-500" />
                  </button>
                )}
                {showValuePicker && (
                  <VariablePicker
                    nodes={nodes}
                    edges={edges}
                    currentNodeId={currentNodeId}
                    onSelect={handleValueSelect}
                    onClose={() => setShowValuePicker(false)}
                    position={pickerPosition}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={onDelete}
        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="删除条件"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const GroupEditor: React.FC<{
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  onDelete: () => void;
  nodes: WorkflowNode[];
  currentNodeId: string;
  edges: WorkflowEdge[];
  index: number;
}> = ({ group, onChange, onDelete, nodes, currentNodeId, edges, index }) => {
  const [expanded, setExpanded] = useState(true);

  const handleRuleChange = (ruleId: string, newRule: ConditionRule) => {
    onChange({
      ...group,
      rules: group.rules.map(r => r.id === ruleId ? newRule : r),
    });
  };

  const handleAddRule = () => {
    onChange({
      ...group,
      rules: [...group.rules, createEmptyRule()],
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    if (group.rules.length <= 1) {
      onDelete();
    } else {
      onChange({
        ...group,
        rules: group.rules.filter(r => r.id !== ruleId),
      });
    }
  };

  const handleLogicChange = (logic: 'AND' | 'OR') => {
    onChange({ ...group, logic });
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div 
        className="flex items-center justify-between px-3 py-2 bg-gray-50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-xs font-medium text-gray-700">
            条件组 {index + 1}
          </span>
          <span className="text-[10px] text-gray-400">
            ({group.rules.length} 个条件)
          </span>
        </div>
        
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <div className="flex bg-white rounded border border-gray-200 p-0.5">
            <button
              onClick={() => handleLogicChange('AND')}
              className={clsx(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                group.logic === 'AND' 
                  ? "bg-blue-500 text-white" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              AND
            </button>
            <button
              onClick={() => handleLogicChange('OR')}
              className={clsx(
                "px-2 py-0.5 text-[10px] font-medium rounded transition-colors",
                group.logic === 'OR' 
                  ? "bg-orange-500 text-white" 
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              OR
            </button>
          </div>
          
          {index > 0 && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="删除条件组"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      
      {expanded && (
        <div className="p-3 space-y-2 bg-white">
          {group.rules.map((rule, ruleIndex) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              onChange={(newRule) => handleRuleChange(rule.id, newRule)}
              onDelete={() => handleDeleteRule(rule.id)}
              nodes={nodes}
              currentNodeId={currentNodeId}
              edges={edges}
              isFirst={ruleIndex === 0}
            />
          ))}
          
          <button
            onClick={handleAddRule}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
          >
            <Plus className="h-3 w-3" />
            添加条件
          </button>
        </div>
      )}
    </div>
  );
};

const ConditionBuilder: React.FC<ConditionBuilderProps & { 
  onAssignToBranch?: (expression: string, branchId: string) => void;
  branches?: { id: string; label: string; type: string }[];
}> = ({
  groups,
  onChange,
  nodes,
  currentNodeId,
  edges,
  onAssignToBranch,
  branches = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [showBranchSelect, setShowBranchSelect] = useState(false);

  const handleGroupChange = (groupId: string, newGroup: ConditionGroup) => {
    onChange(groups.map(g => g.id === groupId ? newGroup : g));
  };

  const handleAddGroup = () => {
    onChange([...groups, createEmptyGroup()]);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groups.length <= 1) {
      onChange([createEmptyGroup()]);
    } else {
      onChange(groups.filter(g => g.id !== groupId));
    }
  };

  const generatedExpression = useMemo(() => 
    generateExpressionFromGroups(groups),
    [groups]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedExpression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleAssignToBranch = (branchId: string) => {
    if (onAssignToBranch) {
      onAssignToBranch(generatedExpression, branchId);
    }
    setShowBranchSelect(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {groups.map((group, index) => (
          <GroupEditor
            key={group.id}
            group={group}
            onChange={(newGroup) => handleGroupChange(group.id, newGroup)}
            onDelete={() => handleDeleteGroup(group.id)}
            nodes={nodes}
            currentNodeId={currentNodeId}
            edges={edges}
            index={index}
          />
        ))}
      </div>
      
      <button
        onClick={handleAddGroup}
        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
      >
        <Plus className="h-3 w-3" />
        添加条件组 (OR)
      </button>
      
      {generatedExpression && generatedExpression !== 'true' && (
        <div className="mt-4 p-3 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <div className="text-[10px] text-gray-400 font-medium">生成的表达式：</div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="复制表达式"
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                {copied ? '已复制' : '复制'}
              </button>
              {branches.length > 0 && onAssignToBranch && (
                <div className="relative">
                  <button
                    onClick={() => setShowBranchSelect(!showBranchSelect)}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-blue-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    title="分配到分支"
                  >
                    <ArrowRight className="h-3 w-3" />
                    分配到分支
                  </button>
                  {showBranchSelect && (
                    <div className="absolute right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[120px] z-10">
                      {branches.filter(b => b.type !== 'else').map(branch => (
                        <button
                          key={branch.id}
                          onClick={() => handleAssignToBranch(branch.id)}
                          className="w-full text-left px-3 py-1.5 text-[10px] text-gray-300 hover:bg-gray-700 hover:text-white"
                        >
                          {branch.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all max-h-[100px] overflow-y-auto">
            {generatedExpression}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ConditionBuilder;
