import React, { useMemo } from 'react';
import { Repeat, Info, ArrowRight } from 'lucide-react';
import { LoopConfig, NodeType } from '../../../types';
import { EnhancedInput } from '../../common/NodeInputs';

interface LoopNodeConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
  nodeId: string;
  nodes: any[];
  edges: any[];
}

const LoopNodeConfig: React.FC<LoopNodeConfigProps> = ({
  config,
  onChange,
  nodeId,
  nodes,
  edges,
}) => {
  const loopConfig: LoopConfig = config.loopConfig || {
    mode: 'count',
    count: 1,
    maxIterations: 100,
  };

  const updateLoopConfig = (updates: Partial<LoopConfig>) => {
    onChange('loopConfig', {
      ...loopConfig,
      ...updates,
    });
  };

  const loopBodyNodes = useMemo(() => {
    const loopStartEdge = edges.find(
      (e) => e.source === nodeId && e.sourceHandle === 'loop'
    );
    if (!loopStartEdge) return [];

    const visited = new Set<string>();
    const loopNodes: any[] = [];
    const queue = [loopStartEdge.target];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const node = nodes.find((n) => n.id === currentId);
      if (node) {
        loopNodes.push(node);
      }

      const outgoingEdges = edges.filter((e) => e.source === currentId);
      for (const edge of outgoingEdges) {
        if (edge.target !== nodeId && !visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    return loopNodes;
  }, [nodeId, nodes, edges]);

  const doneTargetNode = useMemo(() => {
    const doneEdge = edges.find(
      (e) => e.source === nodeId && e.sourceHandle === 'done'
    );
    if (!doneEdge) return null;
    return nodes.find((n) => n.id === doneEdge.target);
  }, [nodeId, nodes, edges]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
        <Repeat className="h-4 w-4" />
        <span>循环节点配置</span>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">循环模式</label>
        <select
          value={loopConfig.mode}
          onChange={(e) => updateLoopConfig({ mode: e.target.value as any })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="count">固定次数</option>
          <option value="array">数组遍历</option>
          <option value="condition">条件循环</option>
        </select>
      </div>

      {loopConfig.mode === 'count' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">循环次数</label>
          <EnhancedInput
            value={loopConfig.count?.toString() || '1'}
            onValueChange={(value) => {
              const num = parseInt(value, 10);
              updateLoopConfig({ count: isNaN(num) ? 1 : num });
            }}
            placeholder="输入数字或使用变量"
            nodes={nodes}
            currentNodeId={nodeId}
            edges={edges}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            支持变量: {`{{steps.node-1.data.count}}`}
          </p>
        </div>
      )}

      {loopConfig.mode === 'array' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">数组路径</label>
          <EnhancedInput
            value={loopConfig.arrayPath || ''}
            onValueChange={(value) => updateLoopConfig({ arrayPath: value })}
            placeholder="{{steps.node-1.data.items}}"
            nodes={nodes}
            currentNodeId={nodeId}
            edges={edges}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            指定要遍历的数组变量路径
          </p>
        </div>
      )}

      {loopConfig.mode === 'condition' && (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">继续条件</label>
          <EnhancedInput
            value={loopConfig.conditionExpression || ''}
            onValueChange={(value) => updateLoopConfig({ conditionExpression: value })}
            placeholder="{{loop.index < 10}}"
            nodes={nodes}
            currentNodeId={nodeId}
            edges={edges}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-gray-400 mt-1">
            条件为 true 时继续循环
          </p>
        </div>
      )}

      <div className="border-t border-gray-100 pt-4">
        <label className="block text-xs font-medium text-gray-600 mb-1">最大迭代次数</label>
        <input
          type="number"
          value={loopConfig.maxIterations || 100}
          onChange={(e) => updateLoopConfig({ maxIterations: parseInt(e.target.value, 10) || 100 })}
          min={1}
          max={10000}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          防止死循环的安全限制
        </p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="continueOnError"
          checked={loopConfig.continueOnError || false}
          onChange={(e) => updateLoopConfig({ continueOnError: e.target.checked })}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <label htmlFor="continueOnError" className="text-xs text-gray-600">
          单次失败时继续执行
        </label>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="text-xs font-medium text-gray-700 mb-2">循环体连接</div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <span className="text-[10px] text-gray-500">循环体端口 →</span>
            {loopBodyNodes.length > 0 ? (
              <div className="flex-1 flex flex-wrap gap-1">
                {loopBodyNodes.slice(0, 3).map((node) => (
                  <span key={node.id} className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700">
                    {node.data?.label || node.id}
                  </span>
                ))}
                {loopBodyNodes.length > 3 && (
                  <span className="text-[10px] text-gray-400">+{loopBodyNodes.length - 3}</span>
                )}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400 italic">未连接节点</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-[10px] text-gray-500">完成端口 →</span>
            {doneTargetNode ? (
              <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-green-200 text-green-700">
                {doneTargetNode.data?.label || doneTargetNode.id}
              </span>
            ) : (
              <span className="text-[10px] text-gray-400 italic">未连接节点</span>
            )}
          </div>
        </div>
        
        <p className="text-[10px] text-gray-400 mt-2">
          从右侧端口拖拽连线到目标节点来定义循环体和后续流程
        </p>
      </div>

      <div className="bg-blue-50 rounded-md p-3">
        <div className="flex items-center gap-1 text-xs font-medium text-blue-700 mb-2">
          <Info className="h-3 w-3" />
          <span>循环变量</span>
        </div>
        <div className="space-y-1 text-[10px] text-blue-600">
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.item}}'}</code>
            <span>当前元素</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.index}}'}</code>
            <span>当前索引（从 0 开始）</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.iteration}}'}</code>
            <span>当前迭代次数（从 1 开始）</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.count}}'}</code>
            <span>总循环次数</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.first}}'}</code>
            <span>是否为第一次迭代</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.last}}'}</code>
            <span>是否为最后一次迭代</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-blue-100 px-1 rounded">{'{{loop.results}}'}</code>
            <span>之前迭代的结果数组</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-md p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">输出变量</div>
        <div className="space-y-1 text-[10px] text-gray-600">
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-1 rounded">.results</code>
            <span>每次迭代的结果数组</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-1 rounded">.count</code>
            <span>循环次数</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-1 rounded">.firstResult</code>
            <span>第一次迭代结果</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="bg-gray-100 px-1 rounded">.lastResult</code>
            <span>最后一次迭代结果</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoopNodeConfig;
