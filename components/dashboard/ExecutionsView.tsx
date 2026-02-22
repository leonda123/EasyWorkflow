import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Zap, Calendar, FileText, ChevronRight, X, Terminal, Copy, Check, ArrowRightLeft, FileInput, FileOutput, Search, Filter, Inbox, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';
import { ExecutionLog } from '../../types';
import { api } from '../../lib/api';
import { translations } from '../../locales';

const ExecutionsView = () => {
  const { executions, loadExecutions, currentTeam, workflows, language } = useAppStore();
  const [searchParams] = useSearchParams();
  const [selectedExec, setSelectedExec] = useState<ExecutionLog | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'input' | 'output' | 'logs'>('overview');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [workflowFilter, setWorkflowFilter] = useState<string>(() => searchParams.get('workflowId') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loadingDetail, setLoadingDetail] = useState(false);

  const t = translations[language].executions;
  const tc = translations[language].common;

  useEffect(() => {
    if (currentTeam) {
      setLoading(true);
      loadExecutions().finally(() => setLoading(false));
    }
  }, [currentTeam]);

  const loadExecutionDetail = async (executionId: string) => {
    if (!currentTeam) return;
    setLoadingDetail(true);
    try {
      const data = await api.executions.get(currentTeam.id, executionId);
      const formatted: ExecutionLog = {
        id: data.id,
        workflowId: data.workflowId,
        workflowName: data.workflowName || 'Unknown',
        status: data.status,
        startTime: new Date(data.startTime).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US'),
        duration: data.duration || 0,
        trigger: data.triggerType?.toLowerCase() || 'manual',
        input: data.inputData,
        output: data.outputData,
        steps: (data.steps || []).map((s: any) => ({
          nodeId: s.nodeId,
          nodeLabel: s.nodeLabel,
          status: s.status,
          duration: s.duration || 0,
          logs: Array.isArray(s.logs) ? s.logs : [],
          input: s.inputData,
          output: s.outputData,
        })),
      };
      setSelectedExec(formatted);
      setDetailTab('overview');
    } catch (error) {
      console.error('Failed to load execution detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const filteredExecutions = useMemo(() => {
    return executions.filter(exec => {
      if (workflowFilter !== 'all' && exec.workflowId !== workflowFilter) return false;
      if (searchQuery && !exec.workflowName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && exec.status !== statusFilter) return false;
      return true;
    });
  }, [executions, workflowFilter, searchQuery, statusFilter]);

  const uniqueWorkflows = useMemo(() => {
    const seen = new Set<string>();
    return executions
      .filter(exec => {
        if (seen.has(exec.workflowId)) return false;
        seen.add(exec.workflowId);
        return true;
      })
      .map(exec => ({ id: exec.workflowId, name: exec.workflowName }));
  }, [executions]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return t.statusSuccess;
      case 'failed': return t.statusFailed;
      case 'running': return t.statusRunning;
      default: return status;
    }
  };

  const getTriggerText = (trigger: string) => {
    switch (trigger) {
      case 'webhook': return 'Webhook';
      case 'schedule': return t.triggerSchedule;
      default: return t.triggerManual;
    }
  };

  return (
    <>
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">{t.title}</h2>
        </div>
        
        <div className="border-b border-gray-100 px-6 py-3 bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-md pl-3 pr-8 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">{t.allWorkflows}</option>
                {uniqueWorkflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 rotate-90 pointer-events-none" />
            </div>
            
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchWorkflow}
                className="w-full bg-white border border-gray-200 rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-md pl-8 pr-8 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">{t.allStatus}</option>
                <option value="success">{t.statusSuccess}</option>
                <option value="failed">{t.statusFailed}</option>
                <option value="running">{t.statusRunning}</option>
              </select>
              <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 rotate-90 pointer-events-none" />
            </div>
            
            {(workflowFilter !== 'all' || searchQuery || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setWorkflowFilter('all');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {t.clearFilter}
              </button>
            )}
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
            <span className="ml-3 text-sm text-gray-500">{tc.loading}</span>
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Inbox className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {executions.length === 0 ? t.noRecords : t.noMatching}
            </p>
            <p className="text-xs mt-1 text-gray-400">
              {executions.length === 0 ? t.noRecordsDesc : t.noMatchingDesc}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                        <th className="px-6 py-3 font-medium">{t.headerStatus}</th>
                        <th className="px-6 py-3 font-medium">{t.headerWorkflow}</th>
                        <th className="px-6 py-3 font-medium">{t.headerTrigger}</th>
                        <th className="px-6 py-3 font-medium">{t.headerStartTime}</th>
                        <th className="px-6 py-3 font-medium">{t.headerDuration}</th>
                        <th className="px-6 py-3 font-medium text-right">{t.headerActions}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredExecutions.map((exec) => (
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
                                    <span className="capitalize">{getStatusText(exec.status)}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{exec.workflowName}</td>
                            <td className="px-6 py-4">
                                <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                    <Zap className="h-3 w-3" />
                                    {getTriggerText(exec.trigger)}
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
                                    onClick={() => loadExecutionDetail(exec.id)}
                                    className="flex items-center gap-1 ml-auto text-blue-600 hover:text-blue-800 text-xs font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                >
                                    <FileText className="h-3 w-3" />
                                    {t.viewDetails}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        )}
        
        {!loading && filteredExecutions.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-3 bg-gray-50/50 text-xs text-gray-500">
            {t.totalRecords.replace('{count}', String(filteredExecutions.length))}
            {filteredExecutions.length !== executions.length && ` ${t.filteredFrom.replace('{count}', String(executions.length))}`}
          </div>
        )}
    </div>

    {selectedExec && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
            <div className="h-full w-[650px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
                
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-gray-500" />
                            {t.detailTitle}
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

                <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50">
                    {[
                        { id: 'overview', label: t.tabOverview, icon: Zap },
                        { id: 'input', label: t.tabInput, icon: FileInput },
                        { id: 'output', label: t.tabOutput, icon: FileOutput },
                        { id: 'logs', label: t.tabLogs, icon: Terminal },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setDetailTab(tab.id as any)}
                            className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                detailTab === tab.id 
                                    ? "bg-white text-gray-900 shadow-sm" 
                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            )}
                        >
                            <tab.icon className="h-3.5 w-3.5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loadingDetail ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="ml-3 text-sm text-gray-500">{t.loadingDetail}</span>
                        </div>
                    ) : (
                    <>
                    {detailTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.fieldStatus}</span>
                                    <div className={clsx(
                                        "mt-1 font-semibold text-sm capitalize flex items-center gap-1",
                                        selectedExec.status === 'success' ? "text-green-600" : "text-red-600"
                                    )}>
                                        {selectedExec.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                                        {getStatusText(selectedExec.status)}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.fieldStartTime}</span>
                                    <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.startTime}</div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">{t.fieldTotalDuration}</span>
                                    <div className="mt-1 font-medium text-xs text-gray-700">{selectedExec.duration}ms</div>
                                </div>
                            </div>

                            {selectedExec.input && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-700">{t.fieldInputData}</span>
                                        <button 
                                            onClick={() => setDetailTab('input')}
                                            className="text-[10px] text-blue-600 hover:underline"
                                        >
                                            {t.viewFull}
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 max-h-32 overflow-y-auto border border-gray-800">
                                        <pre>{JSON.stringify(selectedExec.input, null, 2)}</pre>
                                    </div>
                                </div>
                            )}

                            {selectedExec.output && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-700">{t.fieldOutputData}</span>
                                        <button 
                                            onClick={() => setDetailTab('output')}
                                            className="text-[10px] text-blue-600 hover:underline"
                                        >
                                            {t.viewFull}
                                        </button>
                                    </div>
                                    <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 max-h-32 overflow-y-auto border border-gray-800">
                                        <pre>{JSON.stringify(selectedExec.output, null, 2)}</pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {detailTab === 'input' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">{t.inputDataJson}</span>
                                <button 
                                    onClick={() => copyToClipboard(JSON.stringify(selectedExec.input, null, 2))}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied ? tc.copied : tc.copy}
                                </button>
                            </div>
                            {selectedExec.input ? (
                                <div className="bg-gray-900 rounded-md p-4 font-mono text-xs text-gray-300 overflow-y-auto border border-gray-800 max-h-[400px]">
                                    <pre>{JSON.stringify(selectedExec.input, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <FileInput className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                    {t.noInputData}
                                </div>
                            )}
                        </div>
                    )}

                    {detailTab === 'output' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">{t.outputDataJson}</span>
                                <button 
                                    onClick={() => copyToClipboard(JSON.stringify(selectedExec.output, null, 2))}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied ? tc.copied : tc.copy}
                                </button>
                            </div>
                            {selectedExec.output ? (
                                <div className="bg-gray-900 rounded-md p-4 font-mono text-xs text-gray-300 overflow-y-auto border border-gray-800 max-h-[400px]">
                                    <pre>{JSON.stringify(selectedExec.output, null, 2)}</pre>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                    <FileOutput className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                                    {t.noOutputData}
                                </div>
                            )}
                        </div>
                    )}

                    {detailTab === 'logs' && (
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
                                        
                                        {step.input && (
                                            <div className="mb-2">
                                                <div className="text-[10px] text-gray-500 mb-1 font-medium">{t.logInput}</div>
                                                <div className="bg-blue-950 rounded-md p-2 font-mono text-[10px] text-blue-200 leading-relaxed overflow-x-auto border border-blue-900">
                                                    <pre>{JSON.stringify(step.input, null, 2)}</pre>
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="bg-gray-900 rounded-md p-3 font-mono text-[10px] text-gray-300 leading-relaxed overflow-x-auto border border-gray-800 shadow-sm">
                                            {step.logs.map((log, i) => (
                                                <div key={i} className="mb-0.5 last:mb-0">
                                                    <span className="text-gray-600 mr-2 opacity-50">$</span>
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {step.output && (
                                            <div className="mt-2">
                                                <div className="text-[10px] text-gray-500 mb-1 font-medium">{t.logOutput}</div>
                                                <div className="bg-green-950 rounded-md p-2 font-mono text-[10px] text-green-200 leading-relaxed overflow-x-auto border border-green-900">
                                                    <pre>{JSON.stringify(step.output, null, 2)}</pre>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {(!selectedExec.steps || selectedExec.steps.length === 0) && (
                                <div className="text-center text-sm text-gray-400 py-8 italic">
                                    {t.noDetailedLogs}
                                </div>
                            )}
                        </div>
                    )}
                    </>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button 
                        onClick={() => setSelectedExec(null)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-md text-xs font-medium hover:bg-gray-100 text-gray-700"
                    >
                        {t.close}
                    </button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ExecutionsView;
