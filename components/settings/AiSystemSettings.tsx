import React, { useState, useEffect } from 'react';
import { Bot, Code2, RefreshCw, AlertCircle, Check, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { useToastStore } from '../common/Toast';
import { translations } from '../../locales';
import { useLanguage } from '../../lib/language';

interface LlmConfig {
  id: string;
  name: string;
  provider: string;
  model: string;
  isActive: boolean;
  isDefault: boolean;
}

interface AiSettings {
  easyBotEnabled: boolean;
  processNodeAiEnabled: boolean;
  easyBotLlmConfigId: string | null;
  processNodeAiLlmConfigId: string | null;
}

const AiSystemSettings = () => {
  const { language } = useLanguage();
  const t = translations[language].aiSystem;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [llmConfigs, setLlmConfigs] = useState<LlmConfig[]>([]);
  const [settings, setSettings] = useState<AiSettings>({
    easyBotEnabled: true,
    processNodeAiEnabled: true,
    easyBotLlmConfigId: null,
    processNodeAiLlmConfigId: null,
  });
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, configsData] = await Promise.all([
        api.system.getAiSettings(),
        api.llm.configs.list(),
      ]);
      setSettings(settingsData);
      setLlmConfigs(configsData);
    } catch (error: any) {
      addToast('error', t.loadFailed + ': ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: Partial<AiSettings>) => {
    setSaving(true);
    try {
      const result = await api.system.updateSettings(data);
      setSettings(prev => ({ ...prev, ...result }));
      addToast('success', t.saveSuccess);
    } catch (error: any) {
      addToast('error', t.saveFailed + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getLlmConfigName = (configId: string | null) => {
    if (!configId) return t.useDefault;
    const config = llmConfigs.find(c => c.id === configId);
    return config ? `${config.name} (${config.model})` : t.useDefault;
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
            <Bot className="h-4 w-4 text-purple-500" />
          </h3>
          <p className="text-sm text-gray-500">{t.desc}</p>
        </div>
        {saving && (
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <RefreshCw className="h-3 w-3 animate-spin" />
            {t.saving}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* EasyBot Settings */}
        <div className="border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{t.easyBot.title}</div>
                <div className="text-xs text-gray-500">{t.easyBot.desc}</div>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ easyBotEnabled: !settings.easyBotEnabled })}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.easyBotEnabled ? "bg-purple-600" : "bg-gray-200"
              )}
            >
              <span className={clsx(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                settings.easyBotEnabled ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          {settings.easyBotEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.easyBotLlm}</label>
              <select
                value={settings.easyBotLlmConfigId || ''}
                onChange={(e) => updateSettings({ easyBotLlmConfigId: e.target.value || null })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none bg-white"
              >
                <option value="">{t.useDefault}</option>
                {llmConfigs.filter(c => c.isActive).map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.model}) {config.isDefault ? t.defaultSuffix : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">{t.easyBotLlmDesc}</p>
            </div>
          )}
        </div>

        {/* Process Node AI Settings */}
        <div className="border border-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Code2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">{t.processAi.title}</div>
                <div className="text-xs text-gray-500">{t.processAi.desc}</div>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ processNodeAiEnabled: !settings.processNodeAiEnabled })}
              className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                settings.processNodeAiEnabled ? "bg-blue-600" : "bg-gray-200"
              )}
            >
              <span className={clsx(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                settings.processNodeAiEnabled ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>

          {settings.processNodeAiEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.processAiLlm}</label>
              <select
                value={settings.processNodeAiLlmConfigId || ''}
                onChange={(e) => updateSettings({ processNodeAiLlmConfigId: e.target.value || null })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">{t.useDefault}</option>
                {llmConfigs.filter(c => c.isActive).map(config => (
                  <option key={config.id} value={config.id}>
                    {config.name} ({config.model}) {config.isDefault ? t.defaultSuffix : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-gray-400">{t.processAiLlmDesc}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-800 border border-amber-100 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          {t.tip}
        </div>
      </div>
    </div>
  );
};

export default AiSystemSettings;
