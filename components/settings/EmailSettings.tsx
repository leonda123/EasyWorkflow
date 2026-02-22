import React, { useState, useEffect } from 'react';
import { Mail, Wifi, Loader2, CheckCircle, XCircle, Send, Server, Shield, User, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '../../lib/api';
import { translations } from '../../locales';
import { useLanguage } from '../../lib/language';

interface EmailConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  vhost: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
  verified: boolean;
  hasPassword: boolean;
  lastTestAt?: string;
}

interface TestResult {
  success: boolean;
  message: string;
}

const EmailSettings = () => {
  const { language } = useLanguage();
  const t = translations[language].emailSettings;
  const [config, setConfig] = useState<Partial<EmailConfig>>({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'EasyWorkflow',
    enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendTestResult, setSendTestResult] = useState<TestResult | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await api.email.getConfig();
      setConfig({
        ...result,
        password: '',
      });
    } catch (error) {
      console.error('Failed to load email config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.email.testConnection({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: config.password || undefined,
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
      await api.email.updateConfig({
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        password: config.password || undefined,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        enabled: config.enabled,
      });
    } catch (error) {
      console.error('Failed to save email config:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setConfig(prev => ({ ...prev, enabled }));
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) return;
    
    setSendingTest(true);
    setSendTestResult(null);
    try {
      const result = await api.email.sendTestEmail(testEmailAddress);
      setSendTestResult(result);
    } catch (error: any) {
      setSendTestResult({
        success: false,
        message: error.message || t.sendFailed,
      });
    } finally {
      setSendingTest(false);
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
            <Mail className="h-4 w-4 text-blue-500" />
          </h3>
          <p className="text-sm text-gray-500">
            {t.desc}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {config.verified && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3" />
              {t.verified}
            </div>
          )}
          <button
            onClick={() => handleToggle(!config.enabled)}
            className={clsx(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              config.enabled ? "bg-blue-600" : "bg-gray-200"
            )}
          >
            <span className={clsx(
              "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
              config.enabled ? "translate-x-6" : "translate-x-1"
            )} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Server className="h-3 w-3 inline mr-1" />
              {t.smtpServer}
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="smtp.example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t.port}
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 587 })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="587"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <User className="h-3 w-3 inline mr-1" />
              {t.username}
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="your-email@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              <Shield className="h-3 w-3 inline mr-1" />
              {t.password}
            </label>
            <input
              type="password"
              value={config.password}
              onChange={(e) => setConfig({ ...config, password: e.target.value })}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder={config.hasPassword ? t.passwordSet : '••••••••'}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="secure"
            checked={config.secure}
            onChange={(e) => setConfig({ ...config, secure: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="secure" className="text-xs text-gray-700">
            {t.useSSL}
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">{t.senderInfo}</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.senderEmail}</label>
              <input
                type="email"
                value={config.fromEmail}
                onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="noreply@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t.senderName}</label>
              <input
                type="text"
                value={config.fromName}
                onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="EasyWorkflow"
              />
            </div>
          </div>
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

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-700 mb-2">{t.testEmail}</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="test@example.com"
            />
            <button
              onClick={handleSendTestEmail}
              disabled={sendingTest || !testEmailAddress}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {sendingTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t.send}
            </button>
          </div>
          {sendTestResult && (
            <div className={clsx(
              "mt-2 flex items-center gap-2 text-sm",
              sendTestResult.success ? "text-green-600" : "text-red-600"
            )}>
              {sendTestResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {sendTestResult.message}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? t.saving : t.save}
          </button>
        </div>
      </div>

      <div className="mt-4 rounded bg-blue-50 p-3 text-xs text-blue-800 border border-blue-100">
        {t.tip}
      </div>
    </div>
  );
};

export default EmailSettings;
