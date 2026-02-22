import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, Activity, ToggleLeft, ToggleRight, Copy, Check, BarChart3, Zap, X, List, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { clsx } from 'clsx';
import { DeploymentInfo, WorkflowStats } from '../../types';
import { translations } from '../../locales';
import { api, BACKEND_URL } from '../../lib/api';
import WorkflowApiKeySettings from '../workflow/WorkflowApiKeySettings';

const formatRelativeTime = (dateStr?: string, language: string = 'zh'): string => {
  const t = translations[language].executions;
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return t.justNow;
  if (minutes < 60) return t.minutesAgo.replace('{count}', String(minutes));
  if (hours < 24) return t.hoursAgo.replace('{count}', String(hours));
  if (days < 7) return t.daysAgo.replace('{count}', String(days));
  return date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US');
};

const ToggleSwitch: React.FC<{
  status: 'active' | 'inactive';
  onChange: (status: 'active' | 'inactive') => void;
  language?: string;
}> = ({ status, onChange, language = 'zh' }) => {
  const td = translations[language].deployments;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(status === 'active' ? 'inactive' : 'active');
      }}
      className={clsx(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
        status === 'active' ? 'bg-green-500' : 'bg-gray-300'
      )}
      title={status === 'active' ? td.clickToDisable : td.clickToEnable}
    >
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          status === 'active' ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
};

const ActionButtons: React.FC<{
  deployment: DeploymentInfo;
  onViewStats: () => void;
  onViewExecutions: () => void;
  language?: string;
}> = ({ deployment, onViewStats, onViewExecutions, language = 'zh' }) => {
  const [copied, setCopied] = useState(false);
  const td = translations[language].deployments;
  const tc = translations[language].common;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(deployment.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onViewStats(); }}
        className="p-1.5 rounded-md hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
        title={td.viewStats}
      >
        <BarChart3 className="h-4 w-4" />
      </button>
      <button
        onClick={handleCopy}
        className={clsx(
          "p-1.5 rounded-md transition-colors",
          copied ? "bg-green-50 text-green-600" : "hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        )}
        title={copied ? tc.copied : td.copyWebhook}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onViewExecutions(); }}
        className="p-1.5 rounded-md hover:bg-purple-50 text-gray-500 hover:text-purple-600 transition-colors"
        title={td.viewExecutions}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
};

const DeploymentDetailPanel: React.FC<{
  deployment: DeploymentInfo;
  onClose: () => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => void;
  onViewExecutions: () => void;
}> = ({ deployment, onClose, onToggleStatus, onViewExecutions }) => {
  const { language, currentTeam } = useAppStore();
  const t = translations[language].dashboard;
  const td = translations[language].deployments;
  const te = translations[language].executions;
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const isAdmin = currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN';

  const getStartNodeConfig = () => {
    const definition = deployment.definition as any;
    const startNode = definition?.nodes?.find((n: any) => n.data?.type === 'start');
    return startNode?.data?.config || {};
  };

  const getEndNodeConfig = () => {
    const definition = deployment.definition as any;
    const endNode = definition?.nodes?.find((n: any) => n.data?.type === 'end');
    return endNode?.data?.config || {};
  };

  const getRequestBodyExample = () => {
    const config = getStartNodeConfig();
    const triggerType = config.triggerType || 'webhook';
    const formFields = config.formFields || [];
    
    if (triggerType === 'form' && formFields.length > 0) {
      const exampleBody: Record<string, any> = {};
      formFields.forEach((field: any) => {
        switch (field.type) {
          case 'number': exampleBody[field.key] = 123; break;
          case 'boolean': exampleBody[field.key] = true; break;
          case 'email': exampleBody[field.key] = 'user@example.com'; break;
          default: exampleBody[field.key] = field.placeholder || td.exampleValue;
        }
      });
      return JSON.stringify(exampleBody, null, 2);
    }
    
    return '{\n  "input": "value"\n}';
  };

  const getResponseExample = () => {
    const endConfig = getEndNodeConfig();
    const responseBody = endConfig.responseBody || '';
    
    if (responseBody) {
      let example = responseBody;
      example = example.replace(/\{\{steps\.[^}]+\}\}/g, `"${td.exampleValue}"`);
      example = example.replace(/\{\{now\(\)\}\}/g, `"${new Date().toISOString()}"`);
      example = example.replace(/\{\{length\([^)]+\)\}\}/g, '10');
      try {
        const parsed = JSON.parse(example);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return example;
      }
    }
    
    return `{
  "executionId": "exec_abc123",
  "status": "success"
}`;
  };

  const startConfig = getStartNodeConfig();
  const httpMethod = startConfig.webhookMethod || 'POST';

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsResult, execResult] = await Promise.all([
          api.workflows.getStats(deployment.workflowId),
          api.workflows.getExecutions(deployment.workflowId),
        ]);
        setStats(statsResult);
        setRecentExecutions(execResult.executions?.slice(0, 10) || []);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, [deployment.workflowId]);

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(deployment.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyApiKey = () => {
    if (deployment.apiKey) {
      navigator.clipboard.writeText(deployment.apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleToggle = () => {
    const newStatus = deployment.status === 'active' ? 'inactive' : 'active';
    onToggleStatus(deployment.workflowId, newStatus);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "h-2 w-2 rounded-full",
            deployment.status === 'active' ? "bg-green-500" : "bg-gray-400"
          )} />
          <h2 className="text-lg font-bold text-gray-900">{deployment.workflowName}</h2>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-gray-500">{td.detailStatus}</span>
            <button
              onClick={handleToggle}
              className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                deployment.status === 'active'
                  ? "bg-green-50 text-green-700 hover:bg-green-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              <ToggleSwitch status={deployment.status} onChange={() => {}} language={language} />
              {deployment.status === 'active' ? td.statusActive : td.statusDisabled}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">{td.detailVersion}</span>
              <p className="font-mono font-semibold text-gray-900 mt-1">v{deployment.version}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <span className="text-gray-500">{t.publishedBy}</span>
              <p className="font-semibold text-gray-900 mt-1">{deployment.publishedBy}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            {t.publishedAt}: {deployment.publishedAt}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailStats}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{stats?.totalCalls || deployment.totalCalls}</div>
              <div className="text-xs text-blue-600 mt-1">{t.totalCalls}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">
                {((stats?.successRate || deployment.successRate)).toFixed(1)}%
              </div>
              <div className="text-xs text-green-600 mt-1">{t.successRate}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-700">{stats?.avgDuration || deployment.avgDuration}ms</div>
              <div className="text-xs text-purple-600 mt-1">{t.avgDuration}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-700">{stats?.failedCalls || 0}</div>
              <div className="text-xs text-orange-600 mt-1">{td.detailFailures}</div>
            </div>
          </div>
        </div>

        {stats?.callsByDay && stats.callsByDay.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t.callsTrend}</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-end gap-2 h-24">
                {stats.callsByDay.slice(-7).map((day, i) => {
                  const maxCalls = Math.max(...stats.callsByDay.map(d => d.calls));
                  const height = maxCalls > 0 ? (day.calls / maxCalls) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full bg-blue-500 rounded-t transition-all"
                          style={{ height: `${Math.max(height, 4)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-400">
                        {new Date(day.date).toLocaleDateString(language === 'zh' ? 'zh' : 'en', { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailWebhook}</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.webhookUrl}</label>
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3">
                <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200">{httpMethod}</span>
                <code className="flex-1 text-xs text-green-400 font-mono truncate">
                  {deployment.webhookUrl}
                </code>
                <button
                  onClick={copyWebhookUrl}
                  className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailRequestExample}</h3>
          <div className="bg-gray-900 rounded-lg p-3">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {getRequestBodyExample()}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailResponseExample}</h3>
          <div className="bg-gray-900 rounded-lg p-3">
            <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {getResponseExample()}
            </pre>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailApiKey}</h3>
          <WorkflowApiKeySettings 
            teamId={currentTeam?.id || ''} 
            workflowId={deployment.workflowId}
            isAdmin={isAdmin}
          />
        </div>

        {recentExecutions.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{td.detailRecentExecutions}</h3>
            <div className="space-y-2">
              {recentExecutions.map((exec, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      "h-2 w-2 rounded-full",
                      exec.status === 'SUCCESS' ? "bg-green-500" : "bg-red-500"
                    )} />
                    <span className="text-gray-600">
                      {new Date(exec.startTime).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', { 
                        month: 'numeric', 
                        day: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "font-medium",
                      exec.status === 'SUCCESS' ? "text-green-600" : "text-red-600"
                    )}>
                      {exec.status === 'SUCCESS' ? te.statusSuccess : te.statusFailed}
                    </span>
                    <span className="text-gray-400">{exec.duration}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <button
          onClick={onViewExecutions}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
        >
          <List className="h-4 w-4" />
          {td.viewAllExecutions}
        </button>
      </div>
    </div>
  );
};

type SortField = 'name' | 'status' | 'totalCalls' | 'successRate' | 'avgDuration' | 'lastCalledAt';
type SortOrder = 'asc' | 'desc';

const DeploymentsView: React.FC = () => {
  const { currentTeam, language } = useAppStore();
  const navigate = useNavigate();
  const t = translations[language].dashboard;
  const td = translations[language].deployments;
  const [searchTerm, setSearchTerm] = useState('');
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortField, setSortField] = useState<SortField>('lastCalledAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  useEffect(() => {
    const loadDeployments = async () => {
      if (!currentTeam) return;
      setLoading(true);
      try {
        const result = await api.workflows.getDeployments(currentTeam.id);
        setDeployments(result.deployments || []);
      } catch (error) {
        console.error('Failed to load deployments:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDeployments();
  }, [currentTeam]);

  const handleToggleStatus = async (workflowId: string, status: 'active' | 'inactive') => {
    try {
      await api.workflows.updateStatus(currentTeam!.id, workflowId, status);
      setDeployments(prev =>
        prev.map(d =>
          d.workflowId === workflowId ? { ...d, status } : d
        )
      );
      if (selectedDeployment?.workflowId === workflowId) {
        setSelectedDeployment(prev => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-blue-500" />
      : <ArrowDown className="h-3 w-3 text-blue-500" />;
  };

  const filteredAndSortedDeployments = deployments
    .filter(d => {
      const matchesSearch = d.workflowName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.workflowName.localeCompare(b.workflowName);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'totalCalls':
          comparison = a.totalCalls - b.totalCalls;
          break;
        case 'successRate':
          comparison = a.successRate - b.successRate;
          break;
        case 'avgDuration':
          comparison = a.avgDuration - b.avgDuration;
          break;
        case 'lastCalledAt':
          const aTime = a.lastCalledAt ? new Date(a.lastCalledAt).getTime() : 0;
          const bTime = b.lastCalledAt ? new Date(b.lastCalledAt).getTime() : 0;
          comparison = aTime - bTime;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const totalDeployments = deployments.length;
  const activeDeployments = deployments.filter(d => d.status === 'active').length;
  const inactiveDeployments = deployments.filter(d => d.status === 'inactive').length;
  const todayCalls = deployments.reduce((sum, d) => sum + d.totalCalls, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{totalDeployments}</div>
              <div className="text-xs text-gray-500">{t.totalDeployments}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{activeDeployments}</div>
              <div className="text-xs text-gray-500">{t.activeDeployments}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <ToggleLeft className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{inactiveDeployments}</div>
              <div className="text-xs text-gray-500">{t.inactiveDeployments}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Zap className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{todayCalls.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{t.callsToday}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t.searchDeployments}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm outline-none focus:border-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="all">{td.allStatus}</option>
            <option value="active">{td.statusActive}</option>
            <option value="inactive">{td.statusDisabled}</option>
          </select>
        </div>
      </div>

      {filteredAndSortedDeployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Rocket className="h-8 w-8 text-gray-300" />
          </div>
          <p>{t.noDeployments}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {td.goToPublish}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th 
                  className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    {td.headerName}
                    <SortIcon field="name" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-1">
                    {td.headerStatus}
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {td.headerVersion}
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalCalls')}
                >
                  <div className="flex items-center justify-center gap-1">
                    {td.headerCalls}
                    <SortIcon field="totalCalls" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('successRate')}
                >
                  <div className="flex items-center justify-center gap-1">
                    {td.headerSuccessRate}
                    <SortIcon field="successRate" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('avgDuration')}
                >
                  <div className="flex items-center justify-center gap-1">
                    {td.headerAvgDuration}
                    <SortIcon field="avgDuration" />
                  </div>
                </th>
                <th 
                  className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastCalledAt')}
                >
                  <div className="flex items-center justify-center gap-1">
                    {td.headerLastCall}
                    <SortIcon field="lastCalledAt" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {td.headerActions}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedDeployments.map((deployment) => (
                <tr
                  key={deployment.id}
                  onClick={() => setSelectedDeployment(deployment)}
                  className={clsx(
                    "border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors",
                    selectedDeployment?.id === deployment.id && "bg-blue-50"
                  )}
                >
                  <td className="py-4 px-4">
                    <div className="font-medium text-gray-900">{deployment.workflowName}</div>
                    {deployment.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{deployment.description}</div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <ToggleSwitch
                      status={deployment.status}
                      onChange={(status) => handleToggleStatus(deployment.workflowId, status)}
                      language={language}
                    />
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-mono text-sm text-gray-600">v{deployment.version}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-gray-900">{deployment.totalCalls.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={clsx(
                      "font-medium",
                      deployment.successRate >= 95 ? "text-green-600" :
                      deployment.successRate >= 80 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {deployment.successRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-gray-600">
                    {deployment.avgDuration}ms
                  </td>
                  <td className="py-4 px-4 text-center text-gray-500 text-sm">
                    {formatRelativeTime(deployment.lastCalledAt, language)}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <ActionButtons
                      deployment={deployment}
                      onViewStats={() => setSelectedDeployment(deployment)}
                      onViewExecutions={() => navigate(`/executions?workflowId=${deployment.workflowId}`)}
                      language={language}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {selectedDeployment && (
        <DeploymentDetailPanel
          deployment={selectedDeployment}
          onClose={() => setSelectedDeployment(null)}
          onToggleStatus={handleToggleStatus}
          onViewExecutions={() => navigate('/executions')}
        />
      )}
    </div>
  );
};

export default DeploymentsView;
