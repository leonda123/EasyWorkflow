import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { clsx } from 'clsx';
import { Search, ChevronRight, ChevronDown, Zap, Play, Hash, Type, Calendar, List, Wrench, X, Info } from 'lucide-react';
import { WorkflowNode, WorkflowEdge, NodeType } from '../../types';
import {
  getAllVariables,
  searchVariables,
  formatVariable,
  getNodeTypeIcon,
  getNodeTypeLabel,
  VariableOption,
  FormulaFunction,
} from '../../lib/variableUtils';

interface VariablePickerProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  currentNodeId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

const FunctionCategoryIcon = ({ category }: { category: string }) => {
  switch (category) {
    case 'string': return <Type className="h-3 w-3" />;
    case 'date': return <Calendar className="h-3 w-3" />;
    case 'array': return <List className="h-3 w-3" />;
    case 'math': return <Hash className="h-3 w-3" />;
    default: return <Wrench className="h-3 w-3" />;
  }
};

interface VariableItemProps {
  option: VariableOption; 
  depth?: number;
  onSelect: (path: string) => void;
}

const VariableItem: React.FC<VariableItemProps> = ({ option, depth = 0, onSelect }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = option.children && option.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      onSelect(formatVariable(option.path));
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={clsx(
          "w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs rounded transition-colors cursor-pointer",
          "hover:bg-blue-50 hover:text-blue-700",
          depth > 0 && "pl-6"
        )}
      >
        {hasChildren && (
          <span className="text-gray-400 flex-shrink-0">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}
        <span className="font-medium truncate flex-1">{option.label}</span>
        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[80px]">
          {option.path.split('.').pop()}
        </span>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect(formatVariable(option.path));
            }}
            className="flex-shrink-0 px-1.5 py-0.5 text-[10px] text-blue-600 hover:bg-blue-100 rounded transition-colors"
            title="选择此变量"
          >
            选择
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-gray-100 ml-3">
          {option.children!.map((child, idx) => (
            <VariableItem 
              key={`${child.path}-${idx}`} 
              option={child} 
              depth={depth + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FunctionItemProps {
  func: FormulaFunction;
  onSelect: (syntax: string) => void;
}

const FunctionItem: React.FC<FunctionItemProps> = ({ func, onSelect }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => onSelect(`{{${func.syntax}}}`)}
        onMouseEnter={() => setShowHelp(true)}
        onMouseLeave={() => setShowHelp(false)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-xs rounded transition-colors hover:bg-purple-50 hover:text-purple-700"
      >
        <FunctionCategoryIcon category={func.category} />
        <span className="font-mono font-medium">{func.name}()</span>
        <span className="text-[10px] text-gray-400 truncate ml-auto">{func.description}</span>
      </button>
      {showHelp && (
        <div className="absolute left-full top-0 ml-2 w-64 bg-gray-900 text-white rounded-lg p-3 text-xs z-50 shadow-xl">
          <div className="font-bold mb-1">{func.name}()</div>
          <div className="text-gray-300 mb-2">{func.description}</div>
          <div className="bg-gray-800 rounded p-2 font-mono text-[10px]">
            <div className="text-gray-400 mb-1">语法:</div>
            <div className="text-green-400">{func.syntax}</div>
            <div className="text-gray-400 mt-2 mb-1">示例:</div>
            <div className="text-blue-400">{func.example}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const VariablePicker: React.FC<VariablePickerProps> = ({
  nodes,
  edges,
  currentNodeId,
  onSelect,
  onClose,
  position,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'variables' | 'functions'>('variables');
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allVariables = useMemo(() => 
    getAllVariables(currentNodeId, nodes, edges),
    [currentNodeId, nodes, edges]
  );

  const filteredVariables = useMemo(() => 
    searchTerm ? searchVariables(allVariables, searchTerm) : allVariables,
    [allVariables, searchTerm]
  );

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!position) {
      setAdjustedPosition(null);
      return;
    }

    const calculatePosition = () => {
      const PICKER_WIDTH = 320;
      const PICKER_MIN_HEIGHT = 300;
      const PADDING = 16;
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let x = position.x;
      let y = position.y;
      
      if (x + PICKER_WIDTH > viewportWidth - PADDING) {
        x = viewportWidth - PICKER_WIDTH - PADDING;
      }
      
      if (x < PADDING) {
        x = PADDING;
      }
      
      const spaceBelow = viewportHeight - y - PADDING;
      const spaceAbove = y - PADDING;
      
      if (spaceBelow < PICKER_MIN_HEIGHT && spaceAbove > spaceBelow) {
        y = y - PICKER_MIN_HEIGHT - 8;
        if (y < PADDING) {
          y = PADDING;
        }
      } else if (y + PICKER_MIN_HEIGHT > viewportHeight - PADDING) {
        y = viewportHeight - PICKER_MIN_HEIGHT - PADDING;
      }
      
      setAdjustedPosition({ x, y });
    };

    calculatePosition();
    
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [position]);

  const handleSelect = useCallback((variable: string) => {
    onSelect(variable);
    onClose();
  }, [onSelect, onClose]);

  const hasNodeOutputs = filteredVariables.nodes.some(n => n.outputs.length > 0);

  const pickerStyle = adjustedPosition 
    ? { left: adjustedPosition.x, top: adjustedPosition.y }
    : position 
      ? { left: position.x, top: position.y }
      : undefined;

  return (
    <div 
      ref={containerRef}
      className="fixed z-[100] w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={pickerStyle}
    >
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="搜索变量或函数..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-white border border-gray-200 rounded-md outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setActiveTab('variables')}
            className={clsx(
              "flex-1 py-1 text-xs font-medium rounded transition-colors",
              activeTab === 'variables' 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            📦 变量
          </button>
          <button
            onClick={() => setActiveTab('functions')}
            className={clsx(
              "flex-1 py-1 text-xs font-medium rounded transition-colors",
              activeTab === 'functions' 
                ? "bg-white text-gray-900 shadow-sm" 
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            ⚡ 函数
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-80 overflow-y-auto">
        {activeTab === 'variables' ? (
          <div className="p-1">
            {/* Trigger Variables */}
            {filteredVariables.trigger.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  <Play className="h-3 w-3" />
                  触发器
                </div>
                {filteredVariables.trigger.map((option, idx) => (
                  <VariableItem 
                    key={`trigger-${idx}`} 
                    option={option} 
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Node Outputs */}
            {hasNodeOutputs && (
              <div className="mb-2">
                <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  📦 节点输出
                </div>
                {filteredVariables.nodes.map(({ node, outputs }) => (
                  outputs.length > 0 && (
                    <div key={node.id} className="mb-1">
                      <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-50 rounded">
                        <span>{getNodeTypeIcon(node.data.type)}</span>
                        <span className="truncate">{node.data.label}</span>
                        <span className="text-[10px] text-gray-400 ml-auto">
                          {getNodeTypeLabel(node.data.type)}
                        </span>
                      </div>
                      {outputs.map((option, idx) => (
                        <VariableItem 
                          key={`${node.id}-${idx}`} 
                          option={option} 
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Empty State */}
            {!hasNodeOutputs && filteredVariables.trigger.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">
                {searchTerm ? '没有找到匹配的变量' : '没有可用的前置节点变量'}
              </div>
            )}
          </div>
        ) : (
          <div className="p-1">
            {/* Functions by Category */}
            {['string', 'date', 'array', 'math', 'utility'].map(category => {
              const funcs = filteredVariables.functions.filter(f => f.category === category);
              if (funcs.length === 0) return null;
              
              const categoryLabels: Record<string, string> = {
                string: '字符串',
                date: '日期时间',
                array: '数组',
                math: '数学',
                utility: '工具'
              };

              return (
                <div key={category} className="mb-2">
                  <div className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                    <FunctionCategoryIcon category={category} />
                    {categoryLabels[category]}
                  </div>
                  {funcs.map((func, idx) => (
                    <FunctionItem 
                      key={`${category}-${idx}`} 
                      func={func} 
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              );
            })}

            {filteredVariables.functions.length === 0 && (
              <div className="p-4 text-center text-xs text-gray-400">
                没有找到匹配的函数
              </div>
            )}
          </div>
        )}
      </div>

      {/* Syntax Help */}
      {activeTab === 'variables' && (
        <div className="border-t border-gray-100 bg-blue-50 px-3 py-2">
          <div className="text-[10px] text-blue-600 space-y-1">
            <div className="font-medium">📝 语法说明</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-blue-500">
              <div>✅ <code className="bg-blue-100 px-0.5 rounded">{`{{steps.node.field}}`}</code></div>
              <div>✅ <code className="bg-blue-100 px-0.5 rounded">{`{{func(path)}}`}</code></div>
              <div className="text-red-500">❌ <code className="bg-red-100 px-0.5 rounded">{`{{func({{path}})}}`}</code></div>
              <div className="text-red-500">❌ <code className="bg-red-100 px-0.5 rounded">{`{{{path}}}`}</code></div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 text-[10px] text-gray-400 flex items-center justify-between">
        <span>输入 <kbd className="px-1 bg-gray-200 rounded text-[9px]">{`{{`}</kbd> 快速插入</span>
        <span>ESC 关闭</span>
      </div>
    </div>
  );
};

export default VariablePicker;
