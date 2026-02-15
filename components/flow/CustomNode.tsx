import React, { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { clsx } from 'clsx';
import { Settings, Play, CheckCircle2, AlertCircle, Database, Globe, Box, Workflow, Trash2, Brain, Clock } from 'lucide-react';
import { WorkflowNode, NodeStatus, NodeType } from '../../types';

// Map node types to icons
const iconMap = {
  [NodeType.START]: Play,
  [NodeType.PROCESS]: Settings,
  [NodeType.API_REQUEST]: Globe,
  [NodeType.CONDITION]: Workflow,
  [NodeType.LLM]: Brain,
  [NodeType.DELAY]: Clock,
  [NodeType.DB_QUERY]: Database,
  [NodeType.END]: Box,
};

const CustomNode = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { deleteElements } = useReactFlow();
  const Icon = iconMap[data.type] || Box;

  // Determine status color/icon
  const getStatusIcon = () => {
    switch (data.status) {
      case NodeStatus.SUCCESS:
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case NodeStatus.ERROR:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case NodeStatus.RUNNING:
        return <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
      default:
        return null;
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteElements({ nodes: [{ id }] });
  };

  const isLlm = data.type === NodeType.LLM;

  return (
    <div
      className={clsx(
        "relative min-w-[240px] rounded-xl border bg-white shadow-sm transition-all duration-200 group",
        selected ? "border-black shadow-md ring-1 ring-black/5" : "border-gray-200 hover:border-gray-300 hover:shadow",
        data.status === NodeStatus.RUNNING && "node-running",
        data.status === NodeStatus.ERROR && "border-red-200 bg-red-50/10",
        isLlm && selected && "border-purple-600 ring-purple-100", // Special styling for LLM
      )}
    >
      {/* Header */}
      <div className={clsx("flex items-center gap-3 border-b border-gray-100 p-3", isLlm && "bg-purple-50/50")}>
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
            {/* Delete Button - Visible on Hover or Selected */}
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

      {/* Body */}
      <div className="p-3">
        <p className="text-xs text-gray-500 line-clamp-2">
            {data.description || "暂无描述"}
        </p>
        
        {/* Metrics (Only show if run) */}
        {(data.lastRun || data.status === NodeStatus.RUNNING) && (
             <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-400 font-mono bg-gray-50 p-1.5 rounded border border-gray-100">
                <span>{data.duration ? `${data.duration}ms` : '0ms'}</span>
                <span className="h-2 w-px bg-gray-300"></span>
                <span>{data.status}</span>
             </div>
        )}
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !-left-1.5 !bg-white !border-2 !border-gray-300 hover:!border-black transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !-right-1.5 !bg-white !border-2 !border-gray-300 hover:!border-black transition-colors"
      />
    </div>
  );
};

export default memo(CustomNode);