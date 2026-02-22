import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, RefreshCw, Trash2, AlertCircle, Lock } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { useToastStore } from '../common/Toast';

interface WorkflowApiKey {
  id: string;
  name: string;
  maskedKey: string;
  status: string;
  keyType: string;
  workflowId: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface WorkflowApiKeySettingsProps {
  teamId: string;
  workflowId: string;
  isAdmin: boolean;
}

const WorkflowApiKeySettings: React.FC<WorkflowApiKeySettingsProps> = ({ teamId, workflowId, isAdmin }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<WorkflowApiKey | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    loadApiKey();
  }, [teamId, workflowId]);

  const getStoredFullKey = (wfId: string) => {
    try {
      const stored = localStorage.getItem(`workflow_api_key_${wfId}`);
      return stored;
    } catch {
      return null;
    }
  };

  const storeFullKey = (wfId: string, key: string) => {
    try {
      localStorage.setItem(`workflow_api_key_${wfId}`, key);
    } catch {}
  };

  const clearStoredFullKey = (wfId: string) => {
    try {
      localStorage.removeItem(`workflow_api_key_${wfId}`);
    } catch {}
  };

  const loadApiKey = async () => {
    try {
      const data = await api.apiKeys.getWorkflow(teamId, workflowId);
      setApiKey(data);
      const storedKey = getStoredFullKey(workflowId);
      if (storedKey) {
        setFullKey(storedKey);
      }
    } catch (error: any) {
      console.error('Failed to load workflow API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    if (!isAdmin) {
      addToast('error', '只有团队管理员可以创建 API Key');
      return;
    }

    setSaving(true);
    try {
      const data = await api.apiKeys.createWorkflow(teamId, workflowId, {});
      setApiKey(data);
      setFullKey(data.key);
      storeFullKey(workflowId, data.key);
      addToast('success', '工作流 API Key 已生成');
    } catch (error: any) {
      addToast('error', '生成失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCustomKey = async () => {
    if (!isAdmin) {
      addToast('error', '只有团队管理员可以创建 API Key');
      return;
    }

    if (!customKey.trim()) {
      addToast('error', '请输入自定义 API Key');
      return;
    }
    if (customKey.length < 16) {
      addToast('error', 'API Key 长度至少为 16 个字符');
      return;
    }

    setSaving(true);
    try {
      const data = await api.apiKeys.createWorkflow(teamId, workflowId, { customKey: customKey.trim() });
      setApiKey(data);
      setFullKey(data.key);
      storeFullKey(workflowId, data.key);
      setCustomKey('');
      addToast('success', '自定义 API Key 已保存');
    } catch (error: any) {
      addToast('error', '保存失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = async (enabled: boolean) => {
    if (!isAdmin) {
      addToast('error', '只有团队管理员可以修改 API Key');
      return;
    }

    if (!apiKey) return;
    setSaving(true);
    try {
      await api.apiKeys.toggleWorkflow(teamId, workflowId, { enabled });
      setApiKey({ ...apiKey, status: enabled ? 'active' : 'disabled' });
      addToast('success', enabled ? 'API Key 已启用' : 'API Key 已禁用');
    } catch (error: any) {
      addToast('error', '操作失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async () => {
    if (!isAdmin) {
      addToast('error', '只有团队管理员可以删除 API Key');
      return;
    }

    if (!apiKey) return;
    if (!confirm('确定要删除此工作流的 API Key 吗？此操作不可逆。')) return;

    setSaving(true);
    try {
      await api.apiKeys.deleteWorkflow(teamId, workflowId);
      setApiKey(null);
      setFullKey(null);
      clearStoredFullKey(workflowId);
      addToast('success', '工作流 API Key 已删除');
    } catch (error: any) {
      addToast('error', '删除失败: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
          <div className="flex-1">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Key className="h-4 w-4 text-gray-500" />
          工作流专属 API Key
        </h4>
        {saving && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <RefreshCw className="h-3 w-3 animate-spin" />
            处理中...
          </div>
        )}
      </div>

      {!apiKey ? (
        <div className="space-y-3">
          {isAdmin ? (
            <>
              <button
                onClick={generateKey}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                随机生成
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="bg-white px-2 text-gray-400">或自定义</span>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="自定义 Key（至少 16 字符）"
                  className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-blue-500 outline-none"
                />
                <button
                  onClick={saveCustomKey}
                  disabled={saving || !customKey.trim()}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-4 text-xs text-gray-400">
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              仅团队管理员可管理
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={clsx(
                "p-1.5 rounded shrink-0",
                apiKey.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
              )}>
                <Key className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-gray-700 truncate">
                    {fullKey || apiKey.maskedKey}
                  </span>
                  <button
                    onClick={() => copyToClipboard(fullKey || apiKey.maskedKey)}
                    className="p-0.5 hover:bg-gray-200 rounded shrink-0"
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                  </button>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={clsx(
                    "text-[9px] px-1.5 py-0.5 rounded-full",
                    apiKey.status === 'active'
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {apiKey.status === 'active' ? '启用' : '禁用'}
                  </span>
                  <span className="text-[9px] text-gray-400">
                    {apiKey.keyType === 'custom' ? '自定义' : '随机'}
                  </span>
                </div>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleKey(apiKey.status !== 'active')}
                  disabled={saving}
                  className={clsx(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    apiKey.status === 'active' ? "bg-green-600" : "bg-gray-200"
                  )}
                >
                  <span className={clsx(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                    apiKey.status === 'active' ? "translate-x-5" : "translate-x-0.5"
                  )} />
                </button>
                <button
                  onClick={deleteKey}
                  disabled={saving}
                  className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="rounded bg-blue-50 p-2 text-[10px] text-blue-700 flex items-start gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>专属 Key 优先级高于全局 Key</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowApiKeySettings;
