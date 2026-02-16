import React from 'react';
import { Workflow } from 'lucide-react';
import { WorkflowNode } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';

interface ConditionNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const ConditionNodeConfig: React.FC<ConditionNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => {
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
};

export default ConditionNodeConfig;