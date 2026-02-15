import React, { useState } from 'react';
import { CheckCircle2, XCircle, Clock, Zap, Calendar, FileText, ChevronRight, X, Terminal } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';
import { ExecutionLog } from '../../types';

const ExecutionsView = () => {
  const { executions } = useAppStore();
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">执行记录 (History)</h2>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                        <th className="px-6 py-3 font-medium">状态</th>
                        <th className="px-6 py-3 font-medium">工作流名称</th>
                        <th className="px-6 py-3 font-medium">触发方式</th>
                        <th className="px-6 py-3 font-medium">开始时间</th>
                        <th className="px-6 py-3 font-medium">耗时</th>
                        <th className="px-6 py-3 font-medium text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {executions.map((exec) => (
                        <tr key={exec.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className={clsx(
                                    "flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium w-fit border",
                                    exec.status === 'success' ? "bg-green-50 text-green-700 border-green-200" :
                                    exec.status === 'failed' ? "bg-red-50 text-red-700 border-red-200" :
                                    "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                    {exec.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {exec.status === 'failed' && <XCircle className="h-3.5 w-3.5" />}
                                    {exec.status === 'running' && <Zap className="h-3.5 w-3.5" />}
                                    <span className="capitalize">{exec.status === 'success' ? '成功' : exec.status === 'failed' ? '失败' : '运行中'}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{exec.workflowName}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                    <Zap className="h-3 w-3" />
                                    {exec.trigger === 'webhook' ? 'Webhook' : exec.trigger === 'schedule' ? '定时任务' : '手动'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-3 w-3 text-gray-400" />
                                    {exec.startTime}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-xs font-mono">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    {exec.duration}ms
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <button 
                                    onClick={() => setSelectedExec(exec)}
                                    className="flex items-center gap-1 ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                >
                                    <FileText className="h-3 w-3" />
                                    查看日志
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>

    {/* Logs Modal */}
    {selectedExec && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
            <div className="h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-gray-500" />
                            执行详情
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-mono">{selectedExec.id}</p>
                    </div>
                    <button 
                        onClick={() => setSelectedExec(null)}
                        className="rounded-full p-1 hover:bg-gray-200 text-gray-500 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                         <div>
                             <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">状态</span>
                             <div className={clsx(
                                 "mt-1 font-semibold text-sm capitalize flex items-center gap-1",
                                 selectedExec.status === 'success' ? "text-green-600" : "text-red-600"
                             )}>
                                 {selectedExec.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                 {selectedExec.status}
                             </div>
                         </div>
                         <div>
                             <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">开始时间</span>
                             <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.startTime.split(' ')[1]}</div>
                         </div>
                         <div>
                             <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">总耗时</span>
                             <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.duration}ms</div>
                         </div>
                    </div>

                    {/* Steps Timeline */}
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-gray-200">
                        {(selectedExec.steps || []).map((step, idx) => (
                            <div key={idx} className="relative group">
                                <div className={clsx(
                                    "absolute left-[-20px] top-0 h-10 w-10 flex items-center justify-center rounded-full border-4 border-white shadow-sm z-10 transition-colors",
                                    step.status === 'success' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {step.status === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                </div>
                                <div className="ml-8">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-gray-900">{step.nodeLabel}</span>
                                        <span className="text-[10px] text-gray-400 font-mono bg-gray-50 px-1.5 rounded">{step.duration}ms</span>
                                    </div>
                                    <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 leading-relaxed overflow-x-auto border border-gray-800 shadow-sm">
                                        {step.logs.map((log, i) => (
                                            <div key={i} className="mb-0.5 last:mb-0">
                                                <span className="text-gray-600 mr-2 opacity-50">$</span>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(!selectedExec.steps || selectedExec.steps.length === 0) && (
                            <div className="text-center text-sm text-gray-400 py-8 italic">
                                未记录详细日志
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button 
                        onClick={() => setSelectedExec(null)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ExecutionsView;