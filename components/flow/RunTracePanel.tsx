import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, CheckCircle2, XCircle, Clock, Zap, Terminal, Activity, MousePointer2 } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeType } from '../../types';

const RunTracePanel = () => {
  const { traceLogs, isTraceOpen, setTraceOpen, setSelectedNode } = useFlowStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [traceLogs]);

  if (!isTraceOpen && traceLogs.length === 0) return null;

  return (
    <div 
        className={clsx(
            "absolute bottom-0 left-0 right-0 z-30 flex flex-col border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out",
            isTraceOpen ? "h-64" : "h-10"
        )}
    >
      {/* Header / Toggle */}
      <div 
        onClick={() => setTraceOpen(!isTraceOpen)}
        className="flex h-10 shrink-0 cursor-pointer items-center justify-between bg-gray-50 px-4 hover:bg-gray-100 border-b border-gray-200"
      >
        <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">实时运行追踪 (Run Trace)</span>
            {traceLogs.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {traceLogs.length} 步
                </span>
            )}
        </div>
        <div className="flex items-center gap-2 text-gray-400">
            {isTraceOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
          {traceLogs.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-2">
                  <Activity className="h-6 w-6 opacity-20" />
                  <p className="text-xs">等待运行...</p>
              </div>
          ) : (
              <div ref={listRef} className="h-full overflow-y-auto p-0 scroll-smooth">
                  <table className="w-full text-left">
                      <thead className="sticky top-0 bg-white shadow-sm z-10 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                          <tr>
                              <th className="px-4 py-2 w-20">时间</th>
                              <th className="px-4 py-2 w-32">状态</th>
                              <th className="px-4 py-2">节点名称</th>
                              <th className="px-4 py-2 w-24 text-right">耗时</th>
                              <th className="px-4 py-2 w-48">信息</th>
                          </tr>
                      </thead>
                      <tbody className="text-xs divide-y divide-gray-50">
                          {traceLogs.map((log) => (
                              <tr 
                                key={log.id} 
                                onClick={() => setSelectedNode(log.nodeId)}
                                className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
                              >
                                  <td className="px-4 py-2 font-mono text-gray-400">
                                      {new Date(log.startTime).toLocaleTimeString()}
                                  </td>
                                  <td className="px-4 py-2">
                                      <div className={clsx(
                                          "flex items-center gap-1.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-medium border",
                                          log.status === 'success' ? "bg-green-50 text-green-700 border-green-100" :
                                          log.status === 'error' ? "bg-red-50 text-red-700 border-red-100" :
                                          "bg-blue-50 text-blue-700 border-blue-100"
                                      )}>
                                          {log.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                                          {log.status === 'error' && <XCircle className="h-3 w-3" />}
                                          {log.status === 'running' && <Zap className="h-3 w-3" />}
                                          <span className="capitalize">{log.status}</span>
                                      </div>
                                  </td>
                                  <td className="px-4 py-2 font-medium text-gray-800">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] uppercase text-gray-400 border border-gray-100 px-1 rounded bg-gray-50">
                                              {log.type.slice(0, 3)}
                                          </span>
                                          {log.nodeLabel}
                                          <MousePointer2 className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 -rotate-45" />
                                      </div>
                                  </td>
                                  <td className="px-4 py-2 text-right font-mono text-gray-500">
                                      {log.duration ? `${log.duration}ms` : '-'}
                                  </td>
                                  <td className="px-4 py-2 text-gray-500 truncate max-w-xs">
                                      {log.message || '-'}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
                  <div className="h-8"></div> {/* Spacer for bottom scroll */}
              </div>
          )}
      </div>
    </div>
  );
};

export default RunTracePanel;