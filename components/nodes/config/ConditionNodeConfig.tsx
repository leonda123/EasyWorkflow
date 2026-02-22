import React, { useState, useEffect } from 'react';
import { Workflow, Code2, LayoutGrid, Plus, Trash2, Info } from 'lucide-react';
import { WorkflowNode, WorkflowEdge, ConditionConfig, ConditionGroup, ConditionBranch } from '../../../types';
import { EnhancedTextarea, EnhancedInput } from '../../common/NodeInputs';
import ConditionBuilder from './ConditionBuilder';
import { createEmptyGroup, generateExpressionFromGroups } from '../../../lib/conditionUtils';
import { clsx } from 'clsx';

interface ConditionNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
    edges?: WorkflowEdge[];
}

const generateBranchId = () => `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getDefaultBranches = (): ConditionBranch[] => [
  { id: generateBranchId(), label: 'true', type: 'if', condition: 'true', order: 0, handleId: 'true' },
  { id: generateBranchId(), label: 'else', type: 'else', order: 1, handleId: 'false' },
];

const ConditionNodeConfig: React.FC<ConditionNodeConfigProps> = ({ config, onChange, nodes, currentNodeId, edges = [] }) => {
    const conditionConfig: ConditionConfig = config?.conditionConfig || {
        mode: 'expression',
        expression: config?.conditionExpression || '',
        groups: [createEmptyGroup()],
        branches: getDefaultBranches(),
    };

    const [mode, setMode] = useState<'expression' | 'builder'>(conditionConfig.mode || 'expression');
    const [expression, setExpression] = useState(conditionConfig.expression || config?.conditionExpression || '');
    const [groups, setGroups] = useState<ConditionGroup[]>(
        conditionConfig.groups || [createEmptyGroup()]
    );
    const [branches, setBranches] = useState<ConditionBranch[]>(
        conditionConfig.branches || getDefaultBranches()
    );

    useEffect(() => {
        const newConfig: ConditionConfig = {
            mode,
            expression: mode === 'expression' ? expression : undefined,
            groups: mode === 'builder' ? groups : undefined,
            branches,
        };
        
        onChange('conditionConfig', newConfig);
        
        if (mode === 'expression') {
            onChange('conditionExpression', expression);
        } else {
            const generated = generateExpressionFromGroups(groups);
            onChange('conditionExpression', generated);
        }
    }, [mode, expression, groups, branches]);

    const handleModeChange = (newMode: 'expression' | 'builder') => {
        if (newMode === 'builder' && mode === 'expression' && expression) {
            setGroups([createEmptyGroup()]);
        }
        setMode(newMode);
    };

    const handleGroupsChange = (newGroups: ConditionGroup[]) => {
        setGroups(newGroups);
    };

    const addBranch = () => {
      const elseIndex = branches.findIndex(b => b.type === 'else');
      const newBranch: ConditionBranch = {
        id: generateBranchId(),
        label: `else if ${branches.filter(b => b.type === 'else_if').length + 1}`,
        type: 'else_if',
        condition: '',
        order: elseIndex >= 0 ? elseIndex : branches.length,
        handleId: `elseif-${Date.now()}`,
      };
      
      const newBranches = [...branches];
      if (elseIndex >= 0) {
        newBranches.splice(elseIndex, 0, newBranch);
        newBranches.forEach((b, i) => { b.order = i; });
      } else {
        newBranches.push(newBranch);
      }
      
      setBranches(newBranches);
    };

    const removeBranch = (branchId: string) => {
      if (branches.length <= 2) return;
      const branch = branches.find(b => b.id === branchId);
      if (branch?.type === 'if') return;
      
      const newBranches = branches.filter(b => b.id !== branchId).map((b, i) => ({ ...b, order: i }));
      setBranches(newBranches);
    };

    const updateBranch = (branchId: string, updates: Partial<ConditionBranch>) => {
      setBranches(branches.map(b => b.id === branchId ? { ...b, ...updates } : b));
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800">
                <div className="flex items-center gap-2 mb-1 font-semibold">
                    <Workflow className="h-4 w-4" />
                    条件分支 (IF/ELSE IF/ELSE)
                </div>
                <p className="opacity-90">
                    支持多分支条件判断，按顺序评估条件，第一个满足的分支将被执行。
                </p>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">条件模式</label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        onClick={() => handleModeChange('builder')}
                        className={clsx(
                            "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            mode === 'builder' 
                                ? "bg-white text-blue-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <LayoutGrid className="h-3 w-3" />
                        可视化构建器
                    </button>
                    <button
                        onClick={() => handleModeChange('expression')}
                        className={clsx(
                            "flex-1 px-3 py-1.5 text-[10px] font-medium rounded-md transition-all flex items-center justify-center gap-1",
                            mode === 'expression' 
                                ? "bg-white text-orange-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <Code2 className="h-3 w-3" />
                        表达式模式
                    </button>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <span className="text-xs font-medium text-gray-700">分支列表</span>
                <button
                  onClick={addBranch}
                  className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  添加 else if
                </button>
              </div>
              
              <div className="divide-y divide-gray-100">
                {branches.sort((a, b) => a.order - b.order).map((branch) => (
                  <div key={branch.id} className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-medium",
                        branch.type === 'if' && "bg-green-100 text-green-700",
                        branch.type === 'else_if' && "bg-blue-100 text-blue-700",
                        branch.type === 'else' && "bg-gray-100 text-gray-700"
                      )}>
                        {branch.type === 'else_if' ? 'ELSE IF' : branch.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        → {branch.handleId}
                      </span>
                      {branch.type !== 'if' && branch.type !== 'else' && (
                        <button
                          onClick={() => removeBranch(branch.id)}
                          className="ml-auto p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    
                    {branch.type !== 'else' && (
                      <EnhancedInput
                        value={branch.condition || ''}
                        onValueChange={(v) => updateBranch(branch.id, { condition: v })}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        edges={edges}
                        className="w-full px-2 py-1.5 text-xs font-mono border border-gray-200 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder={branch.type === 'if' ? "条件表达式，如: steps.node-1.data.count > 10" : "条件表达式"}
                      />
                    )}
                    {branch.type === 'else' && (
                      <p className="text-[10px] text-gray-500 italic">
                        默认分支：当所有条件都不满足时执行
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {mode === 'expression' ? (
                <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-gray-700">主条件表达式 (JavaScript)</label>
                    <EnhancedTextarea
                        value={expression}
                        onValueChange={setExpression}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        edges={edges}
                        className="w-full h-[100px] rounded-md border border-gray-200 bg-gray-50 p-3 text-xs font-mono outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none text-gray-800"
                        placeholder={`// 示例:\nsteps.node-1.data.count > 10`}
                        spellCheck={false}
                    />
                    <p className="text-[10px] text-gray-400">
                        此表达式用于 IF 分支，其他分支使用上方配置的条件
                    </p>
                </div>
            ) : (
                <div className="space-y-2 animate-in fade-in duration-200">
                    <label className="text-xs font-medium text-gray-700">可视化条件构建</label>
                    <ConditionBuilder
                        groups={groups}
                        onChange={handleGroupsChange}
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        edges={edges}
                        branches={branches}
                        onAssignToBranch={(expression, branchId) => {
                          updateBranch(branchId, { condition: expression });
                        }}
                    />
                    <p className="text-[10px] text-gray-400">
                        构建条件后可复制表达式或直接分配到 IF 分支
                    </p>
                </div>
            )}

            <div className="bg-blue-50 rounded-md p-3">
              <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-2">
                <Info className="h-3 w-3" />
                <span>使用说明</span>
              </div>
              <div className="space-y-1 text-[10px] text-blue-600">
                <p>• 分支按顺序评估，第一个满足条件的分支将被执行</p>
                <p>• IF 分支必须有条件，ELSE 分支无条件（默认执行）</p>
                <p>• 从节点右侧对应端口拖拽连线到目标节点</p>
                <p>• 条件表达式中可使用变量：{`{{steps.node.data}}`}, {`{{trigger.body}}`}</p>
              </div>
            </div>
        </div>
    );
};

export default ConditionNodeConfig;
