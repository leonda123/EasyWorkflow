import React, { useState, useEffect } from 'react';
import { Cpu, Plus, Trash2, X, Check, Zap, AlertCircle, RefreshCw, Star, StarOff, ChevronDown, ChevronRight, Info, Globe, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { useToastStore } from '../common/Toast';
import { useAppStore } from '../../store/useAppStore';
import { LlmConfig, LlmProvider, Team } from '../../types';
import { clsx } from 'clsx';

const LlmConfigModal = ({ 
  config, 
  onClose, 
  onSave,
  isSuperAdmin = false,
  currentTeamId,
  teams = []
}: { 
  config?: LlmConfig | null; 
  onClose: () => void; 
  onSave: () => void;
  isSuperAdmin?: boolean;
  currentTeamId?: string;
  teams?: Team[];
}) => {
  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [name, setName] = useState(config?.name || '');
  const [provider, setProvider] = useState(config?.provider || 'openai');
  const [baseUrl, setBaseUrl] = useState(config?.baseUrl || '');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(config?.model || '');
  const [maxTokens, setMaxTokens] = useState(config?.maxTokens || 4096);
  const [temperature, setTemperature] = useState(config?.temperature || 0.7);
  const [maxConcurrency, setMaxConcurrency] = useState((config as any)?.maxConcurrency || 5);
  const [queueEnabled, setQueueEnabled] = useState((config as any)?.queueEnabled ?? true);
  const [isGlobal, setIsGlobal] = useState((config as any)?.isGlobal ?? false);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() => {
    const existing = (config as any)?.teamIds;
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return existing.filter((id: string) => id && typeof id === 'string');
    }
    if (currentTeamId && typeof currentTeamId === 'string') {
      return [currentTeamId];
    }
    return [];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    api.llm.providers().then(setProviders);
  }, []);

  useEffect(() => {
    const selectedProvider = providers.find(p => p.id === provider);
    if (selectedProvider && !config) {
      setBaseUrl(selectedProvider.baseUrl);
      if (selectedProvider.models.length > 0) {
        setModel(selectedProvider.models[0]);
      }
    }
  }, [provider, providers, config]);

  const handleTest = async () => {
    if (!config?.id) {
      addToast('error', '请先保存配置后再测试');
      return;
    }
    
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await api.llm.configs.test(config.id);
      setTestResult(result);
      if (result.success) {
        addToast('success', '连接测试成功');
      } else {
        addToast('error', result.message);
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      addToast('error', '测试失败: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !baseUrl.trim() || !model.trim()) {
      addToast('error', '请填写必要字段');
      return;
    }

    const validTeamIds = selectedTeamIds.filter(id => id && typeof id === 'string' && id.trim() !== '');

    setIsSubmitting(true);
    try {
      const data: any = {
        name,
        provider,
        baseUrl,
        model,
        maxTokens,
        temperature,
        maxConcurrency,
        queueEnabled,
        ...(apiKey && { apiKey }),
      };

      if (isSuperAdmin) {
        data.isGlobal = isGlobal;
        if (!isGlobal && validTeamIds.length > 0) {
          data.teamIds = validTeamIds;
        }
      } else {
        if (validTeamIds.length > 0) {
          data.teamIds = validTeamIds;
        }
      }

      if (config?.id) {
        await api.llm.configs.update(config.id, data);
        addToast('success', '配置已更新');
      } else {
        if (!apiKey.trim()) {
          addToast('error', '请输入 API Key');
          setIsSubmitting(false);
          return;
        }
        await api.llm.configs.create(data);
        addToast('success', '配置已创建');
      }
      onSave();
      onClose();
    } catch (error: any) {
      addToast('error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === provider);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">
            {config ? '编辑 LLM 配置' : '添加 LLM 配置'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">配置名称 *</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="例如: OpenAI GPT-4"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">提供商 *</label>
            <select 
              value={provider}
              onChange={e => setProvider(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">API Base URL *</label>
            <input 
              type="url" 
              required
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              API Key {config ? '(留空保持不变)' : '*'}
            </label>
            <input 
              type="password" 
              required={!config}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">模型名称 *</label>
            {selectedProvider?.models.length ? (
              <select 
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {selectedProvider.models.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
                <option value="__custom__">自定义模型...</option>
              </select>
            ) : (
              <input 
                type="text" 
                required
                value={model}
                onChange={e => setModel(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="gpt-4"
              />
            )}
            {model === '__custom__' && (
              <input 
                type="text" 
                required
                onChange={e => setModel(e.target.value)}
                className="w-full mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="输入自定义模型名称"
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
              <input 
                type="number" 
                min={1}
                max={256000}
                value={maxTokens}
                onChange={e => setMaxTokens(parseInt(e.target.value) || 4096)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
              <input 
                type="number" 
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={e => setTemperature(parseFloat(e.target.value) || 0.7)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                高级配置
              </button>

              {showAdvanced && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-start gap-2 text-xs text-gray-500 bg-white rounded-md p-3 border border-gray-100">
                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <p><strong>调度配置说明：</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        <li><strong>最大并发数</strong>：同时处理的最大请求数量。超过此数量的请求将进入排队。</li>
                        <li><strong>启用排队</strong>：开启后，超出并发限制的请求会自动排队等待；关闭则直接拒绝。</li>
                        <li><strong>全局配置</strong>：设为全局配置后，所有团队都可使用此配置。</li>
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">最大并发数</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={maxConcurrency}
                        onChange={e => setMaxConcurrency(parseInt(e.target.value) || 5)}
                        className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none bg-white"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={queueEnabled}
                          onChange={e => setQueueEnabled(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                        启用排队
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={isGlobal}
                        onChange={e => { setIsGlobal(e.target.checked); if (e.target.checked) setSelectedTeamIds([]); }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      设为全局配置（所有团队可用）
                    </label>
                    
                    {!isGlobal && teams.length > 0 && (
                      <div>
                        <label className="block text-xs text-gray-600 mb-2">指定团队（可多选）</label>
                        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                          {teams.map(t => (
                            <label 
                              key={t.id} 
                              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTeamIds.includes(t.id)}
                                onChange={() => handleTeamToggle(t.id)}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                              />
                              <span className="text-sm text-gray-700">{t.name}</span>
                            </label>
                          ))}
                        </div>
                        {selectedTeamIds.length > 0 && (
                          <p className="text-[10px] text-gray-500 mt-1">已选择 {selectedTeamIds.length} 个团队</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {!isSuperAdmin && teams.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <label className="block text-xs font-medium text-gray-700 mb-2">指定团队（可多选）</label>
              <p className="text-[10px] text-gray-500 mb-2">选择可以使用此配置的团队</p>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md bg-white">
                {teams.map(t => (
                  <label 
                    key={t.id} 
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(t.id)}
                      onChange={() => handleTeamToggle(t.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-700">{t.name}</span>
                    {(t.role === 'OWNER' || t.role === 'ADMIN') && (
                      <span className="text-[10px] text-gray-400">({t.role === 'OWNER' ? '拥有者' : '管理员'})</span>
                    )}
                  </label>
                ))}
              </div>
              {selectedTeamIds.length > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">已选择 {selectedTeamIds.length} 个团队</p>
              )}
            </div>
          )}

          {testResult && (
            <div className={clsx(
              "p-3 rounded-lg flex items-start gap-2",
              testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            )}>
              {testResult.success ? (
                <Check className="h-4 w-4 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
              )}
              <span className={clsx("text-xs", testResult.success ? "text-green-700" : "text-red-700")}>
                {testResult.message}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-100">
            <div>
              {config?.id && (
                <button 
                  type="button"
                  onClick={handleTest}
                  disabled={isTesting}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {isTesting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  测试连接
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100"
              >
                取消
              </button>
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const LlmSettings = ({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) => {
  const [configs, setConfigs] = useState<LlmConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LlmConfig | null>(null);
  const addToast = useToastStore(state => state.addToast);
  const { currentTeam, teams, currentUser } = useAppStore();

  const isTeamAdmin = currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN';
  const canManage = isSuperAdmin || isTeamAdmin;

  const manageableTeams = isSuperAdmin 
    ? teams 
    : teams.filter(t => t.role === 'OWNER' || t.role === 'ADMIN');

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await api.llm.configs.list(currentTeam?.id);
      setConfigs(data);
    } catch (error: any) {
      addToast('error', '加载配置失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [currentTeam?.id]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除配置 "${name}" 吗？`)) return;
    
    try {
      await api.llm.configs.delete(id);
      addToast('success', '配置已删除');
      loadConfigs();
    } catch (error: any) {
      addToast('error', '删除失败: ' + error.message);
    }
  };

  const handleSetDefault = async (id: string, currentStatus?: boolean) => {
    try {
      await api.llm.configs.update(id, { isDefault: !currentStatus });
      addToast('success', currentStatus ? '已取消默认配置' : '已设为默认配置');
      loadConfigs();
    } catch (error: any) {
      addToast('error', '设置失败: ' + error.message);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.llm.configs.update(id, { isActive: !currentStatus });
      addToast('success', currentStatus ? '已禁用' : '已启用');
      loadConfigs();
    } catch (error: any) {
      addToast('error', '操作失败: ' + error.message);
    }
  };

  const canModifyConfig = (config: LlmConfig) => {
    if (isSuperAdmin) return true;
    if ((config as any).isGlobal) return false;
    return isTeamAdmin;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            大模型配置 (LLM)
            <Cpu className="h-4 w-4 text-purple-600" />
          </h3>
          <p className="text-sm text-gray-500">配置 AI 助手和智能生成节点使用的大模型</p>
        </div>
        {canManage && (
          <button 
            onClick={() => { setEditingConfig(null); setShowModal(true); }}
            className="bg-black text-white text-xs px-3 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            添加配置
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          加载中...
        </div>
      ) : configs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无 LLM 配置</p>
          <p className="text-xs mt-1">添加配置后即可使用 AI 助手和智能生成节点</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map(config => (
            <div 
              key={config.id}
              className={clsx(
                "flex items-center justify-between p-4 border rounded-lg transition-colors",
                config.isActive ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  "p-2 rounded-md shrink-0",
                  config.isActive ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-500"
                )}>
                  <Cpu className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">{config.name}</span>
                    {config.isDefault && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                        默认
                      </span>
                    )}
                    <span className={clsx(
                      "text-[10px] px-2 py-0.5 rounded-full border",
                      config.isActive 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-gray-200 text-gray-600 border-gray-300"
                    )}>
                      {config.isActive ? '启用' : '禁用'}
                    </span>
                    {(config as any).isGlobal && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        全局
                      </span>
                    )}
                    {(config as any).teamIds && (config as any).teamIds.length > 0 && !(config as any).isGlobal && (
                      <span className="text-[10px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {((config as any).teamNames?.length > 1 
                          ? `${(config as any).teamNames[0]} +${(config as any).teamNames.length - 1}`
                          : (config as any).teamNames?.[0] || `${(config as any).teamIds.length}个团队`)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div>模型: <code className="bg-gray-100 px-1 rounded">{config.model}</code></div>
                    <div>Base URL: <code className="bg-gray-100 px-1 rounded text-[10px]">{config.baseUrl}</code></div>
                  </div>
                </div>
              </div>
              
              {canModifyConfig(config) && (
                <div className="flex items-center gap-2">
                  {config.isDefault ? (
                    <button 
                      onClick={() => handleSetDefault(config.id, config.isDefault)}
                      className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                      title="取消默认"
                    >
                      <Star className="h-4 w-4 fill-blue-600" />
                    </button>
                  ) : config.isActive && (
                    <button 
                      onClick={() => handleSetDefault(config.id, config.isDefault)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      title="设为默认"
                    >
                      <StarOff className="h-4 w-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleToggleActive(config.id, config.isActive)}
                    className={clsx(
                      "p-1.5 rounded",
                      config.isActive 
                        ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                        : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                    )}
                    title={config.isActive ? '禁用' : '启用'}
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => { setEditingConfig(config); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="编辑"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(config.id, config.name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="删除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-800 border border-amber-100">
        {isSuperAdmin ? (
          <><strong>提示:</strong> 超级管理员可以创建全局配置（所有团队可用）或为特定团队创建配置。</>
        ) : isTeamAdmin ? (
          <><strong>提示:</strong> 团队管理员可以为本团队创建和管理 LLM 配置。全局配置由超级管理员管理。</>
        ) : (
          <><strong>提示:</strong> 只有团队管理员或超级管理员可以管理 LLM 配置。</>
        )}
      </div>

      {showModal && (
        <LlmConfigModal 
          config={editingConfig}
          onClose={() => { setShowModal(false); setEditingConfig(null); }}
          onSave={loadConfigs}
          isSuperAdmin={isSuperAdmin}
          currentTeamId={currentTeam?.id}
          teams={manageableTeams}
        />
      )}
    </div>
  );
};

export default LlmSettings;
