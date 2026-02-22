import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { clsx } from 'clsx';
import { Settings, Play, CheckCircle2, AlertCircle, Database, Globe, Box, Workflow, Trash2, Brain, Clock, FileJson, GitMerge, FileText, Repeat } from 'lucide-react';
import { WorkflowNode, NodeStatus, NodeType, ConditionBranch } from '../../types';

const iconMap = {
  [NodeType.START]: Play,
  [NodeType.PROCESS]: Settings,
  [NodeType.API_REQUEST]: Globe,
  [NodeType.CONDITION]: Workflow,
  [NodeType.LLM]: Brain,
  [NodeType.DELAY]: Clock,
  [NodeType.DB_QUERY]: Database,
  [NodeType.END]: Box,
  [NodeType.PRESET_DATA]: FileJson,
  [NodeType.WORKFLOW_CALL]: GitMerge,
  [NodeType.FILE_PARSER]: FileText,
  [NodeType.LOOP]: Repeat,
};

const getDefaultBranches = (): ConditionBranch[] => [
  { id: 'branch-true', label: 'true', type: 'if', condition: 'true', order: 0, handleId: 'true' },
  { id: 'branch-false', label: 'else', type: 'else', order: 1, handleId: 'false' },
];

const getBranchColor = (type: string, label: string): string => {
  if (type === 'if' || label === 'true') return '!border-green-400 !bg-green-50';
  if (type === 'else') return '!border-gray-400 !bg-gray-50';
  return '!border-blue-400 !bg-blue-50';
};

const getLoopHandleColor = (handleId: string): string => {
  if (handleId === 'loop') return '!border-blue-400 !bg-blue-50';
  if (handleId === 'done') return '!border-green-400 !bg-green-50';
  return '!border-gray-400 !bg-gray-50';
};

const loopHandles = [
  { id: 'loop', label: '循环体' },
  { id: 'done', label: '完成' },
];

const CustomNode = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { deleteElements } = useReactFlow();
  const Icon = iconMap[data.type] || Box;

  const getStatusIcon = () => {
    switch (data.status) {
      case NodeStatus.SUCCESS:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case NodeStatus.ERROR:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case NodeStatus.RUNNING:
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <span className="text-[10px] text-blue-600 font-medium">运行中</span>
          </div>
        );
      default:
        return null;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
  };

  const isLlm = data.type === NodeType.LLM;
  const isCondition = data.type === NodeType.CONDITION;
  const isLoop = data.type === NodeType.LOOP;
  const isRunning = data.status === NodeStatus.RUNNING;
  
  const branches: ConditionBranch[] = isCondition 
    ? (data.config?.conditionConfig?.branches || getDefaultBranches())
    : [];

  return (
    <div
      className={clsx(
        "relative min-w-[240px] rounded-xl border bg-white shadow-sm transition-all duration-200 group",
        selected ? "border-black shadow-md ring-1 ring-black/5" : "border-gray-200 hover:border-gray-300 hover:shadow",
        isRunning && "node-running",
        data.status === NodeStatus.ERROR && "border-red-200 bg-red-50/10",
        isLlm && selected && "border-purple-600 ring-purple-100",
      )}
    >
      {isRunning && (
        <div className="absolute inset-0 node-running-progress pointer-events-none" />
      )}
      
      <div className={clsx("flex items-center gap-3 border-b border-gray-100 p-3 relative", isLlm && "bg-purple-50/50")}>
        <div className={clsx(
          "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm",
          selected 
            ? (isLlm ? "bg-purple-600 text-white border-purple-600" : "bg-black text-white border-black") 
            : "bg-white text-gray-500 border-gray-200"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{data.label}</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
            {data.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
            {getStatusIcon()}
            <button 
                onClick={handleDelete}
                className={clsx(
                    "p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all",
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                title="删除节点"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>

      <div className="p-3">
        <p className="text-xs text-gray-500 line-clamp-2">
            {data.description || "暂无描述"}
        </p>
        
        {isCondition && branches.length > 0 && (
          <div className="mt-2 space-y-1">
            {branches.slice(0, 3).map((branch) => (
              <div key={branch.id} className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className={clsx(
                  "px-1 rounded font-medium",
                  branch.type === 'if' && "text-green-600 bg-green-50",
                  branch.type === 'else_if' && "text-blue-600 bg-blue-50",
                  branch.type === 'else' && "text-gray-600 bg-gray-100"
                )}>
                  {branch.type === 'else_if' ? 'else if' : branch.type}
                </span>
                {branch.condition && (
                  <span className="truncate font-mono text-[9px]">
                    {branch.condition.substring(0, 30)}{branch.condition.length > 30 ? '...' : ''}
                  </span>
                )}
              </div>
            ))}
            {branches.length > 3 && (
              <div className="text-[10px] text-gray-400">+{branches.length - 3} 更多分支</div>
            )}
          </div>
        )}
        
        {(data.lastRun || data.status === NodeStatus.RUNNING) && (
             <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400 font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                <span>{data.duration ? `${data.duration}ms` : '0ms'}</span>
                <span className="h-2 w-px bg-gray-300"></span>
                <span>{data.status}</span>
             </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !-left-1.5 !bg-white !border-2 !border-gray-300 hover:!border-black transition-colors"
      />
      
      {isCondition && branches.length > 0 ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {branches.map((branch, index) => (
            <div key={branch.id} className="relative flex items-center">
              <Handle
                type="source"
                position={Position.Right}
                id={branch.handleId}
                className={clsx(
                  "!w-3 !h-3 !-right-1.5 !bg-white !border-2 hover:!border-black transition-colors",
                  getBranchColor(branch.type, branch.label)
                )}
                style={{ position: 'relative', transform: 'none', top: 'auto' }}
              />
              <span className="absolute right-4 text-[8px] text-gray-400 whitespace-nowrap">
                {branch.label}
              </span>
            </div>
          ))}
        </div>
      ) : isLoop ? (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          {loopHandles.map((handle) => (
            <div key={handle.id} className="relative flex items-center">
              <Handle
                type="source"
                position={Position.Right}
                id={handle.id}
                className={clsx(
                  "!w-3 !h-3 !-right-1.5 !bg-white !border-2 hover:!border-black transition-colors",
                  getLoopHandleColor(handle.id)
                )}
                style={{ position: 'relative', transform: 'none', top: 'auto' }}
              />
              <span className="absolute right-4 text-[8px] text-gray-400 whitespace-nowrap">
                {handle.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !-right-1.5 !bg-white !border-2 !border-gray-300 hover:!border-black transition-colors"
        />
      )}
    </div>
  );
};

export default memo(CustomNode);