import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, RefreshCw, Trash2, AlertCircle, ShieldCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { useToastStore } from '../common/Toast';
import { translations } from '../../locales';
import { useLanguage } from '../../lib/language';

interface GlobalApiKey {
  id: string;
  name: string;
  maskedKey: string;
  status: string;
  keyType: string;
  lastUsedAt: string | null;
  createdAt: string;
}

const GlobalApiKeySettings = () => {
  const { language } = useLanguage();
  const t = translations[language].globalApiKey;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState<GlobalApiKey | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [copied, setCopied] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    loadApiKey();
  }, []);

  const getStoredFullKey = () => {
    try {
      return localStorage.getItem('global_api_key');
    } catch {
      return null;
    }
  };

  const storeFullKey = (key: string) => {
    try {
      localStorage.setItem('global_api_key', key);
    } catch {}
  };

  const clearStoredFullKey = () => {
    try {
      localStorage.removeItem('global_api_key');
    } catch {}
  };

  const loadApiKey = async () => {
    try {
      const data = await api.apiKeys.getGlobal();
      setApiKey(data);
      const storedKey = getStoredFullKey();
      if (storedKey) {
        setFullKey(storedKey);
      }
    } catch (error: any) {
      console.error('Failed to load global API key:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setSaving(true);
    try {
      const data = await api.apiKeys.createGlobal({});
      setApiKey(data);
      setFullKey(data.key);
      storeFullKey(data.key);
      addToast('success', t.generateSuccess);
    } catch (error: any) {
      addToast('error', t.generateFailed + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveCustomKey = async () => {
    if (!customKey.trim()) {
      addToast('error', t.enterCustomKey);
      return;
    }
    if (customKey.length < 16) {
      addToast('error', t.keyLengthError);
      return;
    }

    setSaving(true);
    try {
      const data = await api.apiKeys.createGlobal({ customKey: customKey.trim() });
      setApiKey(data);
      setFullKey(data.key);
      storeFullKey(data.key);
      setCustomKey('');
      addToast('success', t.customSaveSuccess);
    } catch (error: any) {
      addToast('error', t.generateFailed + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleKey = async (enabled: boolean) => {
    if (!apiKey) return;
    setSaving(true);
    try {
      await api.apiKeys.toggleGlobal({ enabled });
      setApiKey({ ...apiKey, status: enabled ? 'active' : 'disabled' });
      addToast('success', enabled ? t.toggleSuccess : t.toggleFailed);
    } catch (error: any) {
      addToast('error', t.operationFailed + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteKey = async () => {
    if (!apiKey) return;
    if (!confirm(t.deleteConfirm)) return;

    setSaving(true);
    try {
      await api.apiKeys.deleteGlobal();
      setApiKey(null);
      setFullKey(null);
      clearStoredFullKey();
      addToast('success', t.deleteSuccess);
    } catch (error: any) {
      addToast('error', t.deleteFailed + ': ' + error.message);
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
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 rounded-lg"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
            {t.title}
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </h3>
          <p className="text-sm text-gray-500">{t.desc}</p>
        </div>
        {saving && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {t.processing}
          </div>
        )}
      </div>

      {!apiKey ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generateKey}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t.randomGenerate}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-500">{t.orCustom}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder={t.customPlaceholder}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <button
              onClick={saveCustomKey}
              disabled={saving || !customKey.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {t.save}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "p-2 rounded-md",
                apiKey.status === 'active' ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
              )}>
                <Key className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {fullKey || apiKey.maskedKey}
                  </span>
                  <button
                    onClick={() => copyToClipboard(fullKey || apiKey.maskedKey)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 text-gray-500" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={clsx(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    apiKey.status === 'active'
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  )}>
                    {apiKey.status === 'active' ? t.statusEnabled : t.statusDisabled}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {apiKey.keyType === 'custom' ? t.typeCustom : t.typeRandom}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleKey(apiKey.status !== 'active')}
                disabled={saving}
                className={clsx(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  apiKey.status === 'active' ? "bg-green-600" : "bg-gray-200"
                )}
              >
                <span className={clsx(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  apiKey.status === 'active' ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
              <button
                onClick={deleteKey}
                disabled={saving}
                className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="rounded bg-amber-50 p-3 text-xs text-amber-800 border border-amber-100 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              {t.tip}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalApiKeySettings;
