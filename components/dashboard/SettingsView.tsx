import React, { useState, useEffect } from 'react';
import { Lock, User, Bell, Globe, Key, ShieldCheck, Users, Plus, Mail, Trash2, X, Copy, Check, EyeOff, Eye, Ban, Calendar, Cpu, AlertTriangle, CheckCircle, Clock, Bot } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../locales';
import { clsx } from 'clsx';
import LlmSettings from '../settings/LlmSettings';
import MqSettings from '../settings/MqSettings';
import EmailSettings from '../settings/EmailSettings';
import AiSystemSettings from '../settings/AiSystemSettings';
import GlobalApiKeySettings from '../settings/GlobalApiKeySettings';
import { api } from '../../lib/api';

const EasyBotToggle = () => {
    const { mcpEnabled, setMcpEnabled } = useAppStore();
    
    return (
        <button
            onClick={() => setMcpEnabled(!mcpEnabled)}
            className={clsx(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                mcpEnabled ? "bg-purple-600" : "bg-gray-200"
            )}
        >
            <span
                className={clsx(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                    mcpEnabled ? "translate-x-6" : "translate-x-1"
                )}
            />
        </button>
    );
};

const NotificationSettings = () => {
    const { currentTeam, language } = useAppStore();
    const t = translations[language].settings;
    const tc = translations[language].common;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState({
        emailEnabled: false,
        email: '',
        onFailure: true,
        onSuccess: false,
        cooldownMinutes: 30,
    });

    useEffect(() => {
        if (currentTeam) {
            loadSettings();
        }
    }, [currentTeam]);

    const loadSettings = async () => {
        try {
            const result = await api.notifications.getSettings(currentTeam!.id);
            setSettings({
                emailEnabled: result.emailEnabled,
                email: result.email || '',
                onFailure: result.onFailure,
                onSuccess: result.onSuccess,
                cooldownMinutes: result.cooldownMinutes,
            });
        } catch (error) {
            console.error('Failed to load notification settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (data: Partial<typeof settings>) => {
        if (!currentTeam) return;
        setSaving(true);
        try {
            await api.notifications.updateSettings(currentTeam.id, data);
            setSettings(prev => ({ ...prev, ...data }));
        } catch (error) {
            console.error('Failed to update notification settings:', error);
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
                        {t.notificationSettings}
                        <Mail className="h-4 w-4 text-blue-500" />
                    </h3>
                    <p className="text-sm text-gray-500">{t.notificationSettingsDesc}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t.enableEmailNotification}</div>
                            <div className="text-xs text-gray-500">{t.enableEmailNotificationDesc}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => updateSettings({ emailEnabled: !settings.emailEnabled })}
                        className={clsx(
                            "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                            settings.emailEnabled ? "bg-blue-600" : "bg-gray-200"
                        )}
                    >
                        <span className={clsx(
                            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                            settings.emailEnabled ? "translate-x-6" : "translate-x-1"
                        )} />
                    </button>
                </div>

                {settings.emailEnabled && (
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.notificationEmail}</label>
                        <input
                            type="email"
                            value={settings.email}
                            onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                            onBlur={() => settings.email && updateSettings({ email: settings.email })}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                            placeholder="your@email.com"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-3">{t.alertStrategy}</label>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.onFailure}
                                onChange={(e) => updateSettings({ onFailure: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t.alertOnFailure}</div>
                                    <div className="text-xs text-gray-500">{t.alertOnFailureDesc}</div>
                                </div>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={settings.onSuccess}
                                onChange={(e) => updateSettings({ onSuccess: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t.alertOnSuccess}</div>
                                    <div className="text-xs text-gray-500">{t.alertOnSuccessDesc}</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.cooldownTime}</label>
                    <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <select
                            value={settings.cooldownMinutes}
                            onChange={(e) => updateSettings({ cooldownMinutes: parseInt(e.target.value) })}
                            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        >
                            <option value={5}>5 {t.minutes}</option>
                            <option value={15}>15 {t.minutes}</option>
                            <option value={30}>30 {t.minutes}</option>
                            <option value={60}>1 {t.hours}</option>
                            <option value={120}>2 {t.hours}</option>
                            <option value={1440}>24 {t.hours}</option>
                        </select>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{t.cooldownTimeDesc}</p>
                </div>
            </div>

            {saving && (
                <div className="mt-4 text-xs text-blue-600 flex items-center gap-1">
                    <div className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                    {t.saving}
                </div>
            )}
        </div>
    );
};

const InviteModal = ({ onClose }: { onClose: () => void }) => {
    const { inviteMember, language } = useAppStore();
    const t = translations[language].settings;
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inviteMember(email, role as any);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[400px] bg-white rounded-xl shadow-xl border border-gray-200 p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900">{t.invite}</h3>
                    <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.email}</label>
                        <input 
                            type="email" 
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                            placeholder="colleague@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.role}</label>
                        <select 
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                        >
                            <option value="admin">{t.roleAdmin}</option>
                            <option value="editor">{t.roleEditor}</option>
                            <option value="viewer">{t.roleViewer}</option>
                        </select>
                    </div>
                    <div className="flex justify-end pt-2">
                        <button type="submit" className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800">{t.sendInvite}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const CreateKeyModal = ({ onClose }: { onClose: () => void }) => {
    const { generateGlobalApiKey, language } = useAppStore();
    const t = translations[language].settings;
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!name.trim()) return;
        generateGlobalApiKey(name);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-[400px] bg-white rounded-xl shadow-xl border border-gray-200 p-6 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900">{t.generateKey}</h3>
                    <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.keyName}</label>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                            placeholder={t.keyNamePlaceholder}
                        />
                    </div>
                    <div className="flex justify-end pt-2 gap-2">
                        <button type="button" onClick={onClose} className="text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100">{t.cancel}</button>
                        <button type="submit" className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800">{t.confirmGenerate}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SettingsView = () => {
  const { currentUser, currentTeam, teamMembers, loadTeamMembers, removeMember, language, setLanguage, apiKeys, revokeGlobalApiKey } = useAppStore();
  const t = translations[language].settings;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.systemRole?.toLowerCase() === 'super_admin';

  useEffect(() => {
    if (currentTeam) {
      loadTeamMembers(currentTeam.id);
    }
  }, [currentTeam?.id]);

  const handleRemove = (id: string, name: string) => {
      if (confirm(`${t.removeConfirm} "${name}"?`)) {
          removeMember(id);
      }
  };

  const handleRevokeKey = (id: string, name: string) => {
      if(confirm(t.revokeKeyConfirm)) {
          revokeGlobalApiKey(id);
      }
  };

  const copyKey = (id: string, key: string) => {
      navigator.clipboard.writeText(key);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
  };

  return (
    <>
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 pb-10">
        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{t.profile}</h3>
            <p className="text-sm text-gray-500 mb-6">{t.profileDesc}</p>
            
            <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-black flex items-center justify-center text-white text-2xl font-bold">
                    {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.username}</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{currentUser?.name || 'User'}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{currentUser?.email || ''}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* AI System Settings - Super Admin Only */}
        {isSuperAdmin && <AiSystemSettings />}

        {/* Global API Key Settings - Super Admin Only */}
        {isSuperAdmin && <GlobalApiKeySettings />}

        {/* LLM Settings - Super Admin and Team Admin */}
        {(isSuperAdmin || currentTeam?.role === 'OWNER' || currentTeam?.role === 'ADMIN') && (
          <LlmSettings isSuperAdmin={isSuperAdmin} />
        )}

        {/* MQ Settings - Super Admin Only */}
        {isSuperAdmin && <MqSettings />}

        {/* Email Settings - Super Admin Only */}
        {isSuperAdmin && <EmailSettings />}

        {/* Notification Settings */}
        <NotificationSettings />

        {/* Language Settings (NEW) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                     <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        {t.language}
                        <Globe className="h-4 w-4 text-gray-500" />
                     </h3>
                     <p className="text-sm text-gray-500">{t.languageDesc}</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setLanguage('zh')}
                        className={clsx(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            language === 'zh' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        中文
                    </button>
                    <button 
                        onClick={() => setLanguage('en')}
                        className={clsx(
                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all",
                            language === 'en' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        English
                    </button>
                </div>
            </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
             <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        {t.teamMembers}
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{currentTeam.name}</span>
                    </h3>
                    <p className="text-sm text-gray-500">{t.teamMembersDesc}</p>
                </div>
                <button 
                    onClick={() => setShowInviteModal(true)}
                    className="bg-white border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                >
                    <Plus className="h-3 w-3" />
                    {t.invite}
                </button>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-4 py-2 font-medium text-gray-500">{t.user}</th>
                            <th className="px-4 py-2 font-medium text-gray-500">{t.role}</th>
                            <th className="px-4 py-2 font-medium text-gray-500 text-right">{t.action}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {teamMembers.map((member) => (
                            <tr key={member.id} className="group hover:bg-gray-50">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                            member.id === currentUser?.id ? 'bg-black' : 'bg-blue-500'
                                        }`}>
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {member.name} 
                                                {member.id === currentUser?.id && <span className="text-gray-400 font-normal ml-1">{t.you}</span>}
                                            </div>
                                            <div className="text-xs text-gray-500">{member.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize
                                        ${member.role === 'owner' ? 'bg-purple-50 text-purple-700' : 
                                          member.role === 'admin' ? 'bg-blue-50 text-blue-700' :
                                          member.role === 'editor' ? 'bg-orange-50 text-orange-700' :
                                          'bg-gray-100 text-gray-700'
                                        }
                                    `}>
                                        {member.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    {member.role !== 'owner' && member.id !== currentUser?.id ? (
                                        <button 
                                            onClick={() => handleRemove(member.id, member.name)}
                                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            title={t.remove}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-300">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    
    {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
    {showKeyModal && <CreateKeyModal onClose={() => setShowKeyModal(false)} />}
    </>
  );
};

export default SettingsView;