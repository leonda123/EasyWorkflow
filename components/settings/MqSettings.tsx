import React, { useState, useEffect } from 'react';
import { MessageSquare, Wifi, Loader2, CheckCircle, XCircle, RefreshCw, Server, Settings2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { translations } from '../../locales';
import { useLanguage } from '../../lib/language';

interface MqConfig {
  id: string;
  host: string;
  port: number;
  username: string;
  vhost: string;
  enabled: boolean;
  connected: boolean;
  maxRetries: number;
  retryDelay: number;
  prefetchCount: number;
  messageTtl: number;
  hasPassword: boolean;
  lastCheckAt?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  details?: {
    host: string;
    port: number;
    vhost: string;
  };
}

const MqSettings = () => {
  const { language } = useLanguage();
  const t = translations[language].mqSettings;
  const [config, setConfig] = useState<Partial<MqConfig>>({
    host: 'localhost',
    port: 5672,
    username: 'guest',
    password: '',
    vhost: '/',
    enabled: true,
    maxRetries: 3,
    retryDelay: 5000,
    prefetchCount: 10,
    messageTtl: 86400000,
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [status, setStatus] = useState<{ enabled: boolean; connected: boolean; queueLength: number } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadConfig();
    loadStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await api.mq.getConfig();
      setConfig({
        ...result,
        password: '',
      });
    } catch (error) {
      console.error('Failed to load MQ config:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatus = async () => {
    try {
      const result = await api.mq.getStatus();
      setStatus(result);
    } catch (error) {
      console.error('Failed to load MQ status:', error);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.mq.testConnection({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password || undefined,
        vhost: config.vhost,
      });
      setTestResult(result);
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || t.connectionFailed,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.mq.updateConfig({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password || undefined,
        vhost: config.vhost,
        maxRetries: config.maxRetries,
        retryDelay: config.retryDelay,
        prefetchCount: config.prefetchCount,
        messageTtl: config.messageTtl,
      });
      await loadStatus();
    } catch (error) {
      console.error('Failed to save MQ config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
    setSaving(true);
    try {
      await api.mq.toggle(enabled);
      await loadStatus();
    } catch (error) {
      console.error('Failed to toggle MQ:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReconnect = async () => {
    setSaving(true);
    try {
      await api.mq.reconnect();
      await loadStatus();
    } catch (error) {
      console.error('Failed to reconnect MQ:', error);
    } finally {
      setSaving(false);
    }
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
            <MessageSquare className="h-4 w-4 text-orange-500" />
          </h3>
          <p className="text-sm text-gray-500">
            {t.desc}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status && (
            <div className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
              status.connected 
                ? "bg-green-50 text-green-700" 
                : status.enabled 
                  ? "bg-red-50 text-red-700" 
                  : "bg-gray-100 text-gray-600"
            )}>
              <span className={clsx(
                "h-1.5 w-1.5 rounded-full",
                status.connected ? "bg-green-500" : status.enabled ? "bg-red-500" : "bg-gray-400"
              )} />
              {status.connected ? t.statusConnected : status.enabled ? t.statusDisconnected : t.statusDisabled}
            </div>
          )}
          <button
            onClick={() => handleToggle(!config.enabled)}
            className={clsx(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              config.enabled ? "bg-orange-600" : "bg-gray-200"
            )}
          >
            <span className={clsx(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              config.enabled ? "translate-x-6" : "translate-x-1"
            )} />
          </button>
        </div>
      </div>

      {config.enabled && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Server className="h-3 w-3 inline mr-1" />
                {t.host}
              </label>
              <input
                type="text"
                value={config.host}
                onChange={(e) => setConfig({ ...config, host: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                placeholder="localhost"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t.port}
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5672 })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                placeholder="5672"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t.username}
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                placeholder="guest"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t.password}
              </label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig({ ...config, password: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                placeholder={config.hasPassword ? t.passwordSet : '••••••••'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t.virtualHost}
            </label>
            <input
              type="text"
              value={config.vhost}
              onChange={(e) => setConfig({ ...config, vhost: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
              placeholder="/"
            />
            <p className="mt-1 text-[10px] text-gray-400">
              {t.virtualHostDesc}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              {t.testConnection}
            </button>

            <button
              onClick={handleReconnect}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className={clsx("h-4 w-4", saving && "animate-spin")} />
              {t.reconnect}
            </button>

            {testResult && (
              <div className={clsx(
                "flex items-center gap-2 text-sm",
                testResult.success ? "text-green-600" : "text-red-600"
              )}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult.message}
              </div>
            )}
          </div>

          {status && status.queueLength > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t.pendingTasks.replace('{count}', String(status.queueLength))}
            </div>
          )}

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            <Settings2 className="h-3 w-3" />
            {t.advancedConfig}
          </button>

          {showAdvanced && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start gap-2 text-xs text-gray-500 bg-white rounded-md p-3 border border-gray-100">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p><strong>{t.configDescTitle}</strong></p>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>{t.configDesc1}</li>
                    <li>{t.configDesc2}</li>
                    <li>{t.configDesc3}</li>
                    <li>{t.configDesc4}</li>
                  </ul>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t.maxRetries}</label>
                  <input
                    type="number"
                    value={config.maxRetries}
                    onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 3 })}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t.retryDelay}</label>
                  <input
                    type="number"
                    value={config.retryDelay}
                    onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) || 5000 })}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t.prefetch}</label>
                  <input
                    type="number"
                    value={config.prefetchCount}
                    onChange={(e) => setConfig({ ...config, prefetchCount: parseInt(e.target.value) || 10 })}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t.messageTtl}</label>
                  <input
                    type="number"
                    value={config.messageTtl}
                    onChange={(e) => setConfig({ ...config, messageTtl: parseInt(e.target.value) || 86400000 })}
                    className="w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-800 border border-amber-100">
        {t.tip}
      </div>
    </div>
  );
};

export default MqSettings;
