import React from 'react';
import { WorkflowNode } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';

interface EndNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const EndNodeConfig: React.FC<EndNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => (
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

export default EndNodeConfig;