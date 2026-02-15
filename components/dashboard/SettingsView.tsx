import React, { useState } from 'react';
import { Lock, User, Bell, Globe, Key, ShieldCheck, Users, Plus, Mail, Trash2, X, Copy, Check, EyeOff, Eye, Ban, Calendar } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../locales';
import { clsx } from 'clsx';

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
    const { generateGlobalApiKey } = useAppStore();
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
                    <h3 className="text-sm font-bold text-gray-900">生成新密钥</h3>
                    <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">密钥名称 (备注)</label>
                        <input 
                            type="text" 
                            required
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                            placeholder="例如: CI/CD Pipeline"
                        />
                    </div>
                    <div className="flex justify-end pt-2 gap-2">
                        <button type="button" onClick={onClose} className="text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100">取消</button>
                        <button type="submit" className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800">确认生成</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SettingsView = () => {
  const { currentUser, currentTeam, teamMembers, removeMember, language, setLanguage, apiKeys, revokeGlobalApiKey } = useAppStore();
  const t = translations[language].settings;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const handleRemove = (id: string, name: string) => {
      if (confirm(`${t.removeConfirm} "${name}"?`)) {
          removeMember(id);
      }
  };

  const handleRevokeKey = (id: string, name: string) => {
      if(confirm(`确定要吊销密钥 "${name}" 吗？此操作不可逆。`)) {
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
                    {currentUser.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.username}</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{currentUser.name}</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t.email}</label>
                            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 bg-gray-50">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">{currentUser.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Global API Keys Management Module */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                        {t.globalKey}
                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                    </h3>
                    <p className="text-sm text-gray-500">{t.globalKeyDesc}</p>
                </div>
                <button 
                    onClick={() => setShowKeyModal(true)}
                    className="bg-black text-white text-xs px-3 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-1"
                >
                    <Plus className="h-3.5 w-3.5" />
                    {t.generateKey}
                </button>
            </div>

            <div className="space-y-3">
                {apiKeys.length === 0 ? (
                    <div className="text-center py-6 text-sm text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        暂无 API 密钥
                    </div>
                ) : (
                    apiKeys.map(key => (
                        <div key={key.id} className={clsx(
                            "flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg transition-colors gap-3",
                            key.status === 'active' ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
                        )}>
                            <div className="flex items-start gap-3">
                                <div className={clsx(
                                    "p-2 rounded-md shrink-0",
                                    key.status === 'active' ? "bg-purple-100 text-purple-700" : "bg-gray-200 text-gray-500"
                                )}>
                                    <Key className="h-4 w-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm font-medium text-gray-900">{key.name}</div>
                                        <span className={clsx(
                                            "text-[10px] px-2 py-0.5 rounded-full border",
                                            key.status === 'active' 
                                                ? "bg-green-50 text-green-700 border-green-200" 
                                                : "bg-gray-200 text-gray-600 border-gray-300"
                                        )}>
                                            {key.status === 'active' ? 'Active' : 'Revoked'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className={clsx(
                                            "text-xs font-mono px-1.5 rounded",
                                            key.status === 'active' ? "bg-gray-100 text-gray-600" : "text-gray-400 line-through"
                                        )}>
                                            {key.key.substring(0, 8)}****************{key.key.substring(key.key.length - 4)}
                                        </code>
                                        {key.status === 'active' && (
                                            <button 
                                                onClick={() => copyKey(key.id, key.key)}
                                                className="text-gray-400 hover:text-gray-600"
                                                title="复制完整密钥"
                                            >
                                                {copiedKeyId === key.id ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                <div className="text-[10px] text-gray-400 flex flex-col items-end gap-0.5">
                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created: {key.createdAt}</span>
                                    {key.lastUsed && <span>Last used: {key.lastUsed}</span>}
                                </div>
                                {key.status === 'active' && (
                                    <button 
                                        onClick={() => handleRevokeKey(key.id, key.name)}
                                        className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded border border-transparent hover:border-red-200 transition-all flex items-center gap-1"
                                    >
                                        <Ban className="h-3 w-3" />
                                        {t.revoke}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            <div className="mt-4 rounded bg-blue-50 p-3 text-xs text-blue-800 border border-blue-100">
                <strong>提示:</strong> {t.keyHint} <br/>
                如果需要为特定工作流设置专属 Key（推荐），请进入工作流编辑器 -> API 文档中生成。
            </div>
        </div>

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
                                            member.id === currentUser.id ? 'bg-black' : 'bg-blue-500'
                                        }`}>
                                            {member.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {member.name} 
                                                {member.id === currentUser.id && <span className="text-gray-400 font-normal ml-1">(You)</span>}
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
                                    {member.role !== 'owner' && member.id !== currentUser.id ? (
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

        {/* Notifications */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t.notifications}</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-gray-400" />
                        <div>
                            <div className="text-sm font-medium text-gray-900">{t.workflowAlert}</div>
                            <div className="text-xs text-gray-500">{t.workflowAlertDesc}</div>
                        </div>
                    </div>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                        <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:right-0 checked:border-blue-600"/>
                        <label htmlFor="toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-300 cursor-pointer checked:bg-blue-600"></label>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
    {showKeyModal && <CreateKeyModal onClose={() => setShowKeyModal(false)} />}
    </>
  );
};

export default SettingsView;