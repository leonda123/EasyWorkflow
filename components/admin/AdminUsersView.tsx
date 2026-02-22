import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Shield, UserCheck, UserX, Users, Activity, GitBranch, Zap, X, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { api } from '../../lib/api';
import { AdminUser, SystemStats } from '../../types';
import { clsx } from 'clsx';
import { translations } from '../../locales';

interface TeamOption {
    id: string;
    name: string;
}

const CreateUserModal = ({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) => {
    const { language } = useAppStore();
    const t = translations[language].admin;
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('USER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [teams, setTeams] = useState<TeamOption[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [createDefaultTeam, setCreateDefaultTeam] = useState(true);

    useEffect(() => {
        const loadTeams = async () => {
            try {
                const teamsData = await api.teams.list();
                setTeams(teamsData.map((t: any) => ({ id: t.id, name: t.name })));
            } catch (err) {
                console.error('Failed to load teams:', err);
            }
        };
        loadTeams();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.admin.users.create({
                name,
                email,
                password,
                role: role.toUpperCase(),
                teamId: selectedTeamId || undefined,
                createDefaultTeam: selectedTeamId ? false : createDefaultTeam,
            });
            onCreated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[440px] bg-white rounded-xl shadow-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900">{t.createUser}</h3>
                    <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.name}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.email}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.password}</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.role}</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                        >
                            <option value="USER">{t.userRole}</option>
                            <option value="SUPER_ADMIN">{t.superAdminRole}</option>
                        </select>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4">
                        <label className="block text-xs font-medium text-gray-700 mb-2">团队设置</label>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] text-gray-500 mb-1">加入现有团队（可选）</label>
                                <select
                                    value={selectedTeamId}
                                    onChange={(e) => {
                                        setSelectedTeamId(e.target.value);
                                        if (e.target.value) {
                                            setCreateDefaultTeam(false);
                                        }
                                    }}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                                >
                                    <option value="">不加入任何团队</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            {!selectedTeamId && (
                                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md">
                                    <input
                                        type="checkbox"
                                        id="createDefaultTeam"
                                        checked={createDefaultTeam}
                                        onChange={(e) => setCreateDefaultTeam(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                                    />
                                    <label htmlFor="createDefaultTeam" className="text-xs text-gray-700">
                                        自动创建个人团队
                                    </label>
                                    <span className="text-[10px] text-gray-500 ml-auto">
                                        {createDefaultTeam ? '将创建' : '不创建'}
                                    </span>
                                </div>
                            )}
                            
                            {selectedTeamId && (
                                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-md text-xs text-green-700">
                                    <Check className="h-3.5 w-3.5" />
                                    用户将加入选中的团队
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end pt-2 gap-2">
                        <button type="button" onClick={onClose} className="text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100">{t.cancel}</button>
                        <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50">
                            {loading ? t.creating : t.create}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditUserModal = ({ user, onClose, onUpdated }: { user: AdminUser; onClose: () => void; onUpdated: () => void }) => {
    const { language } = useAppStore();
    const t = translations[language].admin;
    const [name, setName] = useState(user.name);
    const [email, setEmail] = useState(user.email);
    const [role, setRole] = useState(user.role.toUpperCase());
    const [isActive, setIsActive] = useState(user.isActive);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.admin.users.update(user.id, { name, email, role: role.toUpperCase(), isActive });
            onUpdated();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[400px] bg-white rounded-xl shadow-xl border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900">{t.editUser}</h3>
                    <button onClick={onClose}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.name}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.email}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t.role}</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black bg-white"
                        >
                            <option value="USER">{t.userRole}</option>
                            <option value="SUPER_ADMIN">{t.superAdminRole}</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700">{t.accountActive}</label>
                    </div>
                    {error && <p className="text-xs text-red-500">{error}</p>}
                    <div className="flex justify-end pt-2 gap-2">
                        <button type="button" onClick={onClose} className="text-gray-600 px-4 py-2 rounded-md text-sm hover:bg-gray-100">{t.cancel}</button>
                        <button type="submit" disabled={loading} className="bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 disabled:opacity-50">
                            {loading ? t.saving : t.save}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminUsersView = () => {
    const { language } = useAppStore();
    const t = translations[language].admin;
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, statsRes] = await Promise.all([
                api.admin.users.list(page, 10, search || undefined),
                api.admin.stats(),
            ]);
            setUsers(usersRes.data);
            setTotalPages(usersRes.totalPages);
            setStats(statsRes);
        } catch (error) {
            console.error('Failed to load admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [page, search]);

    const handleDelete = async (user: AdminUser) => {
        if (confirm(`${t.confirmDelete} "${user.name}"?`)) {
            try {
                await api.admin.users.delete(user.id);
                loadData();
            } catch (error: any) {
                alert(error.message);
            }
        }
    };

    const handleToggleStatus = async (user: AdminUser) => {
        try {
            await api.admin.users.setStatus(user.id, !user.isActive);
            loadData();
        } catch (error: any) {
            alert(error.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.users.total}</div>
                                <div className="text-xs text-gray-500">{t.totalUsers}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <UserCheck className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.users.active}</div>
                                <div className="text-xs text-gray-500">{t.activeUsers}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <GitBranch className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.teams}</div>
                                <div className="text-xs text-gray-500">{t.totalTeams}</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Zap className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-gray-900">{stats.workflows}</div>
                                <div className="text-xs text-gray-500">{t.totalWorkflows}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t.searchUsers}
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="h-9 w-64 rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                    >
                        <Plus className="h-4 w-4" />
                        {t.createUser}
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">{t.loading}</div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-medium text-gray-500">{t.user}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t.role}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t.status}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t.stats}</th>
                                <th className="px-4 py-3 font-medium text-gray-500">{t.createdAt}</th>
                                <th className="px-4 py-3 font-medium text-gray-500 text-right">{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {user.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                <div className="text-xs text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            user.role === 'super_admin'
                                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                                : "bg-gray-100 text-gray-700 border border-gray-200"
                                        )}>
                                            {user.role === 'super_admin' ? (
                                                <>
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    {t.superAdminRole}
                                                </>
                                            ) : t.userRole}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                            user.isActive
                                                ? "bg-green-50 text-green-700"
                                                : "bg-red-50 text-red-700"
                                        )}>
                                            {user.isActive ? t.active : t.disabled}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        <div>{user.teamsCount || 0} {t.teams}</div>
                                        <div>{user.executionsCount || 0} {t.executions}</div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                                title={user.isActive ? t.disable : t.enable}
                                            >
                                                {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                            </button>
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                                title={t.edit}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user)}
                                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                                                title={t.delete}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-200 flex items-center justify-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50"
                        >
                            {t.previous}
                        </button>
                        <span className="text-sm text-gray-500">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 rounded border border-gray-200 text-sm disabled:opacity-50"
                        >
                            {t.next}
                        </button>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateUserModal onClose={() => setShowCreateModal(false)} onCreated={loadData} />
            )}
            {editingUser && (
                <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onUpdated={loadData} />
            )}
        </div>
    );
};

export default AdminUsersView;
