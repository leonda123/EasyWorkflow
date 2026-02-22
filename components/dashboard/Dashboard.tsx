import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, LayoutGrid, List, Settings, Search, MoreHorizontal, Activity, GitBranch, Zap, Clock, User, LogOut, Upload, Trash2, Download, ChevronsUpDown, Check, Users, HelpCircle, CreditCard, ChevronRight, UserCircle, Globe, Edit2, Rocket, ToggleLeft, ToggleRight, Copy, BarChart3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useFlowStore } from '../../store/useFlowStore';
import { clsx } from 'clsx';
import { WorkflowMetadata, DashboardTab, Team } from '../../types';
import ExecutionsView from './ExecutionsView';
import SettingsView from './SettingsView';
import AdminUsersView from '../admin/AdminUsersView';
import DeploymentsView from './DeploymentsView';
import CreateTeamModal from './CreateTeamModal';
import CreateWorkflowModal from './CreateWorkflowModal';
import EditWorkflowModal from './EditWorkflowModal';
import HelpModal from './HelpModal';
import { translations } from '../../locales';

const TeamSwitcher = ({ onCreateClick }: { onCreateClick: () => void }) => {
    const { currentTeam, teams, switchTeam, language } = useAppStore();
    const t = translations[language].dashboard;
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative mb-6" ref={ref}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white p-2 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <div className={clsx("flex h-8 w-8 items-center justify-center rounded-md text-white font-bold text-xs shadow-sm", currentTeam.avatar)}>
                        {currentTeam.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-semibold text-gray-900 leading-tight">{currentTeam.name}</div>
                        <div className="text-[10px] text-gray-500 font-medium">Enterprise</div>
                    </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-gray-400" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {t.switchTeam}
                    </div>
                    <div className="p-1">
                        {teams.map(team => (
                            <button
                                key={team.id}
                                onClick={() => { switchTeam(team.id); setIsOpen(false); }}
                                className={clsx(
                                    "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm transition-colors",
                                    currentTeam.id === team.id ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={clsx("h-5 w-5 rounded text-[8px] flex items-center justify-center text-white font-bold", team.avatar)}>
                                        {team.name.substring(0, 1)}
                                    </div>
                                    <span>{team.name}</span>
                                </div>
                                {currentTeam.id === team.id && <Check className="h-3.5 w-3.5" />}
                            </button>
                        ))}
                    </div>
                    <div className="border-t border-gray-100 p-2 bg-gray-50">
                        <button 
                            onClick={() => { setIsOpen(false); onCreateClick(); }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-white hover:text-gray-900 transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            {t.createTeam}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const UserProfileMenu = ({ onOpenHelp }: { onOpenHelp: () => void }) => {
    const { currentUser, currentTeam, setDashboardTab, logout, language, setLanguage } = useAppStore();
    const t = translations[language].dashboard;
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        if(confirm('确定要退出登录吗?')) {
            logout();
        }
    };

    const toggleLanguage = () => {
        setLanguage(language === 'zh' ? 'en' : 'zh');
    };

    return (
        <div className="relative border-t border-gray-200 pt-4" ref={ref}>
             {/* Popover Menu */}
             {isOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-gray-200 bg-white shadow-2xl z-20 overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                         <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="overflow-hidden">
                                <div className="font-semibold text-gray-900 truncate">{currentUser?.name || 'User'}</div>
                                <div className="text-xs text-gray-500 truncate">{currentUser?.email || ''}</div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[10px] text-green-700 bg-green-50 px-2 py-1 rounded w-fit border border-green-100">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            {t.online}
                        </div>
                    </div>
                    
                    <div className="p-1">
                        <button onClick={() => { setDashboardTab('settings'); setIsOpen(false); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                            <UserCircle className="h-4 w-4 text-gray-400" />
                            {t.accountSettings}
                        </button>
                         {/* Removed Billing Button */}
                         <button 
                            onClick={() => { onOpenHelp(); setIsOpen(false); }}
                            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                         >
                            <HelpCircle className="h-4 w-4 text-gray-400" />
                            {t.help}
                        </button>
                    </div>

                    <div className="border-t border-gray-100 p-1 bg-gray-50">
                         <button onClick={toggleLanguage} className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                            <div className="flex items-center gap-3">
                                <Globe className="h-4 w-4 text-gray-400" />
                                <span>Language</span>
                            </div>
                            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200 px-1.5 rounded uppercase">
                                {language}
                            </span>
                        </button>
                        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut className="h-4 w-4" />
                            {t.logout}
                        </button>
                    </div>
                </div>
            )}

            {/* Trigger Button */}
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center gap-3 px-2 py-2 rounded-md transition-colors cursor-pointer select-none",
                    isOpen ? "bg-gray-100" : "hover:bg-gray-100"
                )}
            >
                <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    {currentUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="truncate text-sm font-medium text-gray-900">{currentUser?.name || 'User'}</div>
                    <div className="truncate text-xs text-gray-500">{currentUser?.email || ''}</div>
                </div>
                <Settings className={clsx("h-4 w-4 text-gray-400 transition-transform duration-200", isOpen && "rotate-45 text-gray-600")} />
            </div>
            
            <div className="mt-2 px-2 flex items-center gap-2 text-[10px] text-gray-400">
                <Users className="h-3 w-3" />
                <span>{currentTeam.membersCount} {t.members}</span>
            </div>
        </div>
    )
}

const DashboardSidebar = ({ onCreateTeam, onOpenHelp }: { onCreateTeam: () => void, onOpenHelp: () => void }) => {
  const { dashboardTab, language, currentUser } = useAppStore();
  const navigate = useNavigate();
  const t = translations[language].dashboard;

  const navItemClass = (tab: DashboardTab) => clsx(
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
    dashboardTab === tab 
        ? "bg-white border border-gray-200 text-gray-900 shadow-sm" 
        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent"
  );

  const isSuperAdmin = currentUser?.systemRole?.toLowerCase() === 'super_admin';

  const handleNavigation = (tab: DashboardTab) => {
    switch(tab) {
      case 'workflows':
        navigate('/');
        break;
      case 'deployments':
        navigate('/deployments');
        break;
      case 'executions':
        navigate('/executions');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'admin':
        navigate('/admin');
        break;
    }
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-gray-50/50 p-4 flex flex-col h-full">
        <TeamSwitcher onCreateClick={onCreateTeam} />

        <nav className="space-y-1 flex-1">
            <div className="px-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.platform}</div>
            <button onClick={() => handleNavigation('workflows')} className={navItemClass('workflows')}>
                <LayoutGrid className="h-4 w-4 text-blue-600" />
                {t.workflows}
            </button>
            <button onClick={() => handleNavigation('deployments')} className={navItemClass('deployments')}>
                <Rocket className="h-4 w-4 text-green-600" />
                {t.deployments}
            </button>
            <button onClick={() => handleNavigation('executions')} className={navItemClass('executions')}>
                <List className="h-4 w-4 text-orange-600" />
                {t.executions}
            </button>
            <button onClick={() => handleNavigation('settings')} className={navItemClass('settings')}>
                <Settings className="h-4 w-4 text-gray-600" />
                {t.settings}
            </button>
            {isSuperAdmin && (
                <button onClick={() => handleNavigation('admin')} className={navItemClass('admin')}>
                    <Users className="h-4 w-4 text-purple-600" />
                    {t.admin}
                </button>
            )}
        </nav>

        <UserProfileMenu onOpenHelp={onOpenHelp} />
    </aside>
  );
};

// ... WorkflowCard component remains unchanged ...
const WorkflowCard: React.FC<{ wf: WorkflowMetadata; onEdit: (wf: WorkflowMetadata) => void }> = ({ wf, onEdit }) => {
    const { deleteWorkflow, language } = useAppStore();
    const navigate = useNavigate();
    const t = translations[language].dashboard;
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm(`${t.confirmDelete} "${wf.name}"`)) {
            deleteWorkflow(wf.id);
        }
        setShowMenu(false);
    }
    
    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(wf);
        setShowMenu(false);
    }

    const handleExport = (e: React.MouseEvent) => {
        e.stopPropagation();
        const exportData = {
            meta: wf,
            nodes: wf.nodes || [], 
            edges: wf.edges || [],
            exportedAt: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${wf.name.replace(/\s+/g, '_')}_v${wf.version}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowMenu(false);
    };

    return (
        <div 
            onClick={() => navigate(`/workflows/${wf.id}`)}
            className="group relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md cursor-pointer"
        >
            <div>
                <div className="flex items-start justify-between mb-3">
                    <div className={clsx(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border",
                        wf.status === 'active' ? "bg-green-50 text-green-700 border-green-200" :
                        wf.status === 'inactive' ? "bg-gray-50 text-gray-600 border-gray-200" :
                        "bg-yellow-50 text-yellow-700 border-yellow-200"
                    )}>
                        {wf.status === 'active' ? t.statusActive : wf.status === 'inactive' ? t.statusInactive : t.statusDraft}
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100" 
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-6 z-10 w-32 rounded-md border border-gray-200 bg-white shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button 
                                    onClick={handleEdit}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                    <Edit2 className="h-3 w-3" />
                                    编辑
                                </button>
                                <button 
                                    onClick={handleExport}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                                >
                                    <Download className="h-3 w-3" />
                                    {t.export}
                                </button>
                                <button 
                                    onClick={handleDelete}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="h-3 w-3" />
                                    {t.delete}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">{wf.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 h-8">{wf.description}</p>
            </div>

            <div className="mt-6">
                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-3">
                    <div className="flex items-center gap-1.5" title="成功率">
                        <Activity className="h-3 w-3" />
                        <span className="font-medium text-gray-900">{wf.successRate}%</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="节点数">
                        <GitBranch className="h-3 w-3" />
                        <span>{wf.nodesCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="运行次数">
                        <Zap className="h-3 w-3" />
                        <span>{wf.runs}</span>
                    </div>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {t.updatedAt} {wf.updatedAt}
                </div>
            </div>
        </div>
    );
}

const Dashboard = () => {
  const { workflows, createWorkflow, importWorkflow, dashboardTab, currentTeam, language, setDashboardTab } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[language].dashboard;
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowMetadata | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/deployments') {
      setDashboardTab('deployments');
    } else if (path === '/executions') {
      setDashboardTab('executions');
    } else if (path === '/settings') {
      setDashboardTab('settings');
    } else if (path === '/admin') {
      setDashboardTab('admin');
    } else {
      setDashboardTab('workflows');
    }
  }, [location.pathname, setDashboardTab]);

  if (!currentTeam) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">{t.loading || '加载中...'}</p>
        </div>
      </div>
    );
  }

  // Filter workflows by Current Team ID
  const filteredWorkflows = workflows
    .filter(wf => wf.teamId === currentTeam.id)
    .filter(wf => 
        wf.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        wf.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            
            if (data.meta && data.nodes && data.edges) {
                // Construct new workflow object from export structure
                const newWorkflow: WorkflowMetadata = {
                    ...data.meta,
                    id: `wf-imported-${Date.now()}`,
                    teamId: currentTeam.id, // Assign to current team on import
                    name: `${data.meta.name} (Imported)`,
                    status: 'draft',
                    updatedAt: 'Just now',
                    nodes: data.nodes,
                    edges: data.edges
                };
                importWorkflow(newWorkflow);
                alert(t.importSuccess);
            } else {
                alert(t.fileError);
            }
        } catch (err) {
            console.error(err);
            alert(t.parseError);
        }
        if (importInputRef.current) importInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleCreateWorkflow = async (name: string, description: string) => {
    const workflowId = await createWorkflow(name, description);
    if (workflowId) {
      setShowCreateWorkflowModal(false);
      navigate(`/workflows/${workflowId}`);
    }
  };

  const renderContent = () => {
      switch(dashboardTab) {
          case 'deployments':
              return <DeploymentsView />;
          case 'executions':
              return <ExecutionsView />;
          case 'settings':
              return <SettingsView />;
          case 'admin':
              return <AdminUsersView />;
          case 'workflows':
          default:
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-300">
                    {/* Create New Card */}
                    <button 
                        onClick={() => setShowCreateWorkflowModal(true)}
                        className="group flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-transparent p-6 hover:border-blue-400 hover:bg-blue-50/50 transition-all min-h-[220px]"
                    >
                        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors mb-3">
                            <Plus className="h-6 w-6 text-gray-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-600 group-hover:text-blue-700">{t.createWorkflow}</span>
                    </button>

                    {/* Workflow List */}
                    {filteredWorkflows.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <LayoutGrid className="h-8 w-8 text-gray-300" />
                            </div>
                            <p>{t.noWorkflows}</p>
                        </div>
                    ) : (
                        filteredWorkflows.map(wf => (
                            <WorkflowCard key={wf.id} wf={wf} onEdit={setEditingWorkflow} />
                        ))
                    )}
                </div>
              );
      }
  }

  return (
    <>
    <div className="flex h-screen w-screen bg-white">
      <DashboardSidebar 
        onCreateTeam={() => setShowCreateTeamModal(true)} 
        onOpenHelp={() => setShowHelpModal(true)}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50/30">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                {dashboardTab === 'workflows' && (
                    <>
                        {t.workflows}
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {currentTeam.name}
                        </span>
                    </>
                )}
                {dashboardTab === 'deployments' && (
                    <>
                        {t.deployments}
                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            {currentTeam.name}
                        </span>
                    </>
                )}
                {dashboardTab === 'executions' && t.executions}
                {dashboardTab === 'settings' && t.settings}
                {dashboardTab === 'admin' && t.admin}
            </h1>
            
            {dashboardTab === 'workflows' && (
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder={t.searchWorkflows}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-9 w-64 rounded-md border border-gray-200 bg-gray-50 pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition-all"
                        />
                    </div>
                    
                    <button 
                        onClick={() => importInputRef.current?.click()}
                        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                    >
                        <Upload className="h-4 w-4" />
                        {t.import}
                        <input 
                            type="file" 
                            ref={importInputRef} 
                            onChange={handleImportFile} 
                            accept=".json" 
                            className="hidden" 
                        />
                    </button>

                    <button 
                        onClick={() => setShowCreateWorkflowModal(true)}
                        className="flex items-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-all shadow-sm active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        {t.new}
                    </button>
                </div>
            )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
            {renderContent()}
        </div>
      </main>
    </div>

    {/* Modals */}
    {showCreateTeamModal && (
        <CreateTeamModal onClose={() => setShowCreateTeamModal(false)} />
    )}
    {showCreateWorkflowModal && (
        <CreateWorkflowModal 
          onClose={() => setShowCreateWorkflowModal(false)}
          onConfirm={handleCreateWorkflow}
        />
    )}
    {showHelpModal && (
        <HelpModal onClose={() => setShowHelpModal(false)} />
    )}
    {editingWorkflow && (
        <EditWorkflowModal 
          workflow={editingWorkflow} 
          onClose={() => setEditingWorkflow(null)} 
        />
    )}
    </>
  );
};

export default Dashboard;