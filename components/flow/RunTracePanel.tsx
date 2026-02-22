import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronUp, ChevronDown, CheckCircle2, XCircle, Clock, Zap, Terminal, Activity, MousePointer2, ChevronRight, Copy, Check, Maximize2, Minimize2, PanelRight, PanelBottom, GripVertical } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeType } from '../../types';

const RunTracePanel = () => {
  const { traceLogs, isTraceOpen, setTraceOpen, setSelectedNode, tracePosition, setTracePosition, traceWidth, setTraceWidth } = useFlowStore();
  const listRef = useRef<HTMLDivElement>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [traceLogs]);

  useEffect(() => {
    const errorLogs = traceLogs.filter(log => log.status === 'error');
    if (errorLogs.length > 0) {
      setExpandedSteps(prev => {
        const next = new Set(prev);
        errorLogs.forEach(log => next.add(log.id));
        return next;
      });
    }
  }, [traceLogs]);

  useEffect(() => {
    if (!isResizing) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (tracePosition === 'right') {
        const newWidth = window.innerWidth - e.clientX;
        setTraceWidth(Math.max(300, Math.min(800, newWidth)));
      } else {
        const newHeight = window.innerHeight - e.clientY;
        setTraceWidth(Math.max(200, Math.min(600, newHeight)));
      }
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, tracePosition, setTraceWidth]);

  const toggleExpand = (logId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedSteps(new Set(traceLogs.map(log => log.id)));
  };

  const collapseAll = () => {
    setExpandedSteps(new Set());
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatJson = (data: any): string => {
    if (!data) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const togglePosition = () => {
    setTracePosition(tracePosition === 'bottom' ? 'right' : 'bottom');
  };

  if (!isTraceOpen && traceLogs.length === 0) return null;

  const isRight = tracePosition === 'right';

  return (
    <div 
        className={clsx(
            "z-30 flex flex-col border-gray-200 bg-white shadow-lg transition-all duration-300 ease-in-out",
            isRight 
              ? "absolute top-0 right-0 bottom-0 border-l" 
              : "absolute bottom-0 left-0 right-0 border-t",
            isMaximized && !isRight && "h-[calc(100vh-120px)]",
            isRight ? "" : (isTraceOpen ? "" : "h-10")
        )}
        style={isRight ? { width: isTraceOpen ? traceWidth : 0 } : { height: isTraceOpen ? traceWidth : 40 }}
    >
      {isRight && isTraceOpen && (
        <div 
          ref={resizeRef}
          className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-blue-400 bg-gray-200 transition-colors group"
          onMouseDown={() => setIsResizing(true)}
        >
          <GripVertical className="h-6 w-3 text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
        </div>
      )}
      
      <div 
        className={clsx(
          "flex h-10 shrink-0 cursor-pointer items-center justify-between bg-gray-50 px-4 hover:bg-gray-100 border-b border-gray-200",
          !isTraceOpen && "border-b-0"
        )}
      >
        <div className="flex items-center gap-2" onClick={() => setTraceOpen(!isTraceOpen)}>
            <Terminal className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-semibold text-gray-700">实时运行追踪</span>
            {traceLogs.length > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                    {traceLogs.length} 步
                </span>
            )}
        </div>
        <div className="flex items-center gap-1">
            {isTraceOpen && traceLogs.length > 0 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); expandAll(); }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 text-[10px]"
                  title="展开全部"
                >
                  全部展开
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); collapseAll(); }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 text-[10px] mr-2"
                  title="折叠全部"
                >
                  全部折叠
                </button>
                {!isRight && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMaximized(!isMaximized); }}
                    className="p-1 hover:bg-gray-200 rounded text-gray-500 mr-1"
                    title={isMaximized ? "还原" : "最大化"}
                  >
                    {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                )}
              </>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); togglePosition(); }}
              className={clsx(
                "p-1 hover:bg-gray-200 rounded text-gray-500",
                isRight ? "rotate-180" : ""
              )}
              title={isRight ? "显示在下方" : "显示在右侧"}
            >
              {isRight ? <PanelBottom className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
            </button>
            <div className="text-gray-400 ml-2" onClick={() => setTraceOpen(!isTraceOpen)}>
              {isTraceOpen ? (isRight ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />) : <ChevronUp className="h-4 w-4" />}
            </div>
        </div>
      </div>

      {isTraceOpen && (
        <div className="flex-1 overflow-hidden relative">
            {traceLogs.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-gray-400 gap-2">
                    <Activity className="h-6 w-6 opacity-20" />
                    <p className="text-xs">等待运行...</p>
                </div>
            ) : (
                <div ref={listRef} className="h-full overflow-y-auto scroll-smooth">
                    <div className="divide-y divide-gray-100">
                        {traceLogs.map((log) => {
                            const isExpanded = expandedSteps.has(log.id);
                            const hasData = log.input || log.output || (log.logs && log.logs.length > 0);
                            const isError = log.status === 'error';
                            
                            return (
                              <div key={log.id} className={clsx(isError && "bg-red-50/30")}>
                                <div 
                                  onClick={() => setSelectedNode(log.nodeId)}
                                  className="group cursor-pointer hover:bg-blue-50/50 transition-colors"
                                >
                                  <div className="flex items-center px-4 py-2.5 gap-3">
                                    <div className="w-20 shrink-0">
                                      <span className="font-mono text-[10px] text-gray-400">
                                        {new Date(log.startTime).toLocaleTimeString()}
                                      </span>
                                    </div>
                                    
                                    <div className="w-24 shrink-0">
                                      <div className={clsx(
                                          "flex items-center gap-1.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-medium border",
                                          log.status === 'success' ? "bg-green-50 text-green-700 border-green-100" :
                                          log.status === 'error' ? "bg-red-50 text-red-700 border-red-100" :
                                          "bg-blue-50 text-blue-700 border-blue-100"
                                      )}>
                                          {log.status === 'success' && <CheckCircle2 className="h-3 w-3" />}
                                          {log.status === 'error' && <XCircle className="h-3 w-3" />}
                                          {log.status === 'running' && <Zap className="h-3 w-3 animate-pulse" />}
                                          <span className="capitalize">{log.status === 'error' ? '失败' : log.status === 'success' ? '成功' : '运行中'}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                          <span className="text-[10px] uppercase text-gray-400 border border-gray-100 px-1.5 py-0.5 rounded bg-gray-50 font-medium">
                                              {log.type?.slice(0, 3) || 'SYS'}
                                          </span>
                                          <span className="font-medium text-gray-800 text-xs truncate">{log.nodeLabel}</span>
                                          <MousePointer2 className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 -rotate-45 shrink-0" />
                                      </div>
                                    </div>
                                    
                                    <div className="w-16 text-right shrink-0">
                                      <span className="font-mono text-[10px] text-gray-500">
                                          {log.duration ? `${log.duration}ms` : '-'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 max-w-sm">
                                      <span className={clsx(
                                        "text-[10px] truncate block",
                                        isError ? "text-red-600 font-medium" : "text-gray-500"
                                      )}>
                                        {log.message || '-'}
                                      </span>
                                    </div>
                                    
                                    {hasData && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(log.id);
                                        }}
                                        className={clsx(
                                          "p-1 hover:bg-gray-200 rounded transition-colors shrink-0",
                                          isError && "bg-red-100 hover:bg-red-200"
                                        )}
                                      >
                                        <ChevronRight className={clsx(
                                          "h-4 w-4 text-gray-400 transition-transform",
                                          isExpanded && "rotate-90"
                                        )} />
                                      </button>
                                    )}
                                    
                                    {!hasData && <div className="w-6" />}
                                  </div>
                                </div>
                                
                                {isExpanded && hasData && (
                                  <div className={clsx(
                                    "border-t px-4 py-3 ml-4",
                                    isError ? "bg-red-50/50 border-red-100" : "bg-gray-50/50 border-gray-100"
                                  )}>
                                    {log.input && (
                                      <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">输入</span>
                                          <button
                                            onClick={() => copyToClipboard(formatJson(log.input), `input-${log.id}`)}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            title="复制"
                                          >
                                            {copiedField === `input-${log.id}` ? (
                                              <Check className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Copy className="h-3 w-3 text-gray-400" />
                                            )}
                                          </button>
                                        </div>
                                        <div className="bg-blue-950 rounded-md p-2.5 font-mono text-[10px] text-blue-200 leading-relaxed overflow-x-auto border border-blue-900 max-h-40 overflow-y-auto">
                                          <pre className="whitespace-pre-wrap break-all">{formatJson(log.input)}</pre>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {log.output && (
                                      <div className="mb-3">
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">输出</span>
                                          <button
                                            onClick={() => copyToClipboard(formatJson(log.output), `output-${log.id}`)}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            title="复制"
                                          >
                                            {copiedField === `output-${log.id}` ? (
                                              <Check className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Copy className="h-3 w-3 text-gray-400" />
                                            )}
                                          </button>
                                        </div>
                                        <div className={clsx(
                                          "rounded-md p-2.5 font-mono text-[10px] leading-relaxed overflow-x-auto border overflow-y-auto",
                                          isError 
                                            ? "bg-red-950 text-red-200 border-red-900" 
                                            : "bg-green-950 text-green-200 border-green-900"
                                        )}>
                                          <pre className="whitespace-pre-wrap break-all">{formatJson(log.output)}</pre>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {log.logs && log.logs.length > 0 && (
                                      <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">日志 ({log.logs.length} 行)</span>
                                          <button
                                            onClick={() => copyToClipboard(log.logs.join('\n'), `logs-${log.id}`)}
                                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                                            title="复制全部日志"
                                          >
                                            {copiedField === `logs-${log.id}` ? (
                                              <Check className="h-3 w-3 text-green-500" />
                                            ) : (
                                              <Copy className="h-3 w-3 text-gray-400" />
                                            )}
                                          </button>
                                        </div>
                                        <div className={clsx(
                                          "rounded-md p-2.5 font-mono text-[10px] leading-relaxed overflow-x-auto border overflow-y-auto",
                                          isError ? "bg-red-950 text-red-200 border-red-900" : "bg-gray-900 text-gray-300 border-gray-800"
                                        )}>
                                          {log.logs.map((l, i) => (
                                            <div key={i} className="mb-0.5 last:mb-0">
                                              <span className="text-gray-600 mr-2 opacity-50">$</span>
                                              <span className={clsx(
                                                l.startsWith('[ERROR]') && "text-red-400",
                                                l.startsWith('[SUCCESS]') && "text-green-400",
                                                l.startsWith('[INFO]') && "text-blue-400",
                                                l.startsWith('[INPUT]') && "text-yellow-400",
                                                l.startsWith('[OUTPUT]') && "text-cyan-400"
                                              )}>{l}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                        })}
                    </div>
                    <div className="h-8" />
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default RunTracePanel;
