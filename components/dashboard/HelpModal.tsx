import React, { useState } from 'react';
import { X, Users, BookOpen, ShieldCheck, Play, Settings, Database, Globe, Brain, Clock, Box, Workflow, Key, Cpu, Mail, MessageSquare, Layers, FileText, Repeat, DatabaseBackup, GitBranch } from 'lucide-react';
import { clsx } from 'clsx';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../locales';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const language = useAppStore((state) => state.language);
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'workflow' | 'nodes' | 'permissions' | 'advanced'>('workflow');

  const tabs = [
    { id: 'workflow', label: t.help.tabs.workflow, icon: BookOpen },
    { id: 'nodes', label: t.help.tabs.nodes, icon: Box },
    { id: 'permissions', label: t.help.tabs.permissions, icon: ShieldCheck },
    { id: 'advanced', label: t.help.tabs.advanced, icon: Settings },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div className="h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
           <h3 className="font-bold text-gray-900 text-lg">{t.help.title}</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        <div className="flex border-b border-gray-100 px-6">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === tab.id 
                            ? "border-black text-black" 
                            : "border-transparent text-gray-500 hover:text-gray-700"
                    )}
                >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white">
            
            {activeTab === 'workflow' && (
                <div className="space-y-8">
                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">{t.help.workflow.createTitle}</h4>
                        <ul className="space-y-4 text-sm text-gray-600">
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">{t.help.workflow.create}</span>
                                <span>{t.help.workflow.createDesc}</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">{t.help.workflow.importExport}</span>
                                <span>{t.help.workflow.importExportDesc}</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">{t.help.workflow.publish}</span>
                                <span>{t.help.workflow.publishDesc}</span>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">{t.help.workflow.runDebugTitle}</h4>
                        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                            <div className="flex gap-2">
                                <Play className="h-4 w-4 mt-0.5" />
                                <div>
                                    <strong>{t.help.workflow.testRun}</strong> {t.help.workflow.testRunDesc}
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Key className="h-4 w-4 mt-0.5" />
                                <div>
                                    <strong>{t.help.workflow.apiTrigger}</strong> {t.help.workflow.apiTriggerDesc}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">{t.help.workflow.versionTitle}</h4>
                        <p className="text-sm text-gray-600">{t.help.workflow.versionDesc}</p>
                    </section>

                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">{t.help.workflow.apiKeyTitle}</h4>
                        <p className="text-sm text-gray-600">{t.help.workflow.apiKeyDesc}</p>
                    </section>

                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">{t.help.workflow.partialRunTitle}</h4>
                        <p className="text-sm text-gray-600">{t.help.workflow.partialRunDesc}</p>
                    </section>
                </div>
            )}

            {activeTab === 'nodes' && (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500 mb-4">
                        {t.help.nodes.intro}
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <NodeCard 
                            icon={Globe} color="text-blue-600" bg="bg-blue-50"
                            title={t.help.nodes.start.title} 
                            desc={t.help.nodes.start.desc}
                        />
                        <NodeCard 
                            icon={Globe} color="text-purple-600" bg="bg-purple-50"
                            title={t.help.nodes.api.title} 
                            desc={t.help.nodes.api.desc}
                        />
                        <NodeCard 
                            icon={Settings} color="text-orange-600" bg="bg-orange-50"
                            title={t.help.nodes.process.title} 
                            desc={t.help.nodes.process.desc}
                        />
                        <NodeCard 
                            icon={Workflow} color="text-orange-500" bg="bg-orange-50"
                            title={t.help.nodes.condition.title} 
                            desc={t.help.nodes.condition.desc}
                        />
                        <NodeCard 
                            icon={Brain} color="text-purple-600" bg="bg-purple-50"
                            title={t.help.nodes.llm.title} 
                            desc={t.help.nodes.llm.desc}
                        />
                        <NodeCard 
                            icon={Database} color="text-blue-500" bg="bg-blue-50"
                            title={t.help.nodes.db.title} 
                            desc={t.help.nodes.db.desc}
                        />
                        <NodeCard 
                            icon={Clock} color="text-yellow-600" bg="bg-yellow-50"
                            title={t.help.nodes.delay.title} 
                            desc={t.help.nodes.delay.desc}
                        />
                        <NodeCard 
                            icon={Box} color="text-gray-600" bg="bg-gray-50"
                            title={t.help.nodes.end.title} 
                            desc={t.help.nodes.end.desc}
                        />
                        <NodeCard 
                            icon={FileText} color="text-green-600" bg="bg-green-50"
                            title={t.help.nodes.fileParser.title} 
                            desc={t.help.nodes.fileParser.desc}
                        />
                        <NodeCard 
                            icon={Repeat} color="text-indigo-600" bg="bg-indigo-50"
                            title={t.help.nodes.loop.title} 
                            desc={t.help.nodes.loop.desc}
                        />
                        <NodeCard 
                            icon={DatabaseBackup} color="text-teal-600" bg="bg-teal-50"
                            title={t.help.nodes.presetData.title} 
                            desc={t.help.nodes.presetData.desc}
                        />
                        <NodeCard 
                            icon={GitBranch} color="text-violet-600" bg="bg-violet-50"
                            title={t.help.nodes.workflowCall.title} 
                            desc={t.help.nodes.workflowCall.desc}
                        />
                    </div>
                </div>
            )}

            {activeTab === 'permissions' && (
                <div className="space-y-6">
                    <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-500 font-semibold">
                            <tr>
                                <th className="p-3 border-b">{t.settings.role}</th>
                                <th className="p-3 border-b">{t.admin.stats}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="p-3 font-medium text-purple-700 bg-purple-50/30">{t.help.permissions.owner.title}</td>
                                <td className="p-3 text-gray-600">{t.help.permissions.owner.desc}</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-blue-700 bg-blue-50/30">{t.help.permissions.admin.title}</td>
                                <td className="p-3 text-gray-600">{t.help.permissions.admin.desc}</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-orange-700 bg-orange-50/30">{t.help.permissions.editor.title}</td>
                                <td className="p-3 text-gray-600">{t.help.permissions.editor.desc}</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-gray-700 bg-gray-50/30">{t.help.permissions.viewer.title}</td>
                                <td className="p-3 text-gray-600">{t.help.permissions.viewer.desc}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex gap-2">
                            <Users className="h-5 w-5 text-yellow-600" />
                            <div>
                                <h5 className="font-bold text-yellow-800 text-sm">{t.help.permissions.inviteTitle}</h5>
                                <p className="text-sm text-yellow-700 mt-1">
                                    {t.help.permissions.inviteDesc}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'advanced' && (
                <div className="space-y-6">
                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                                <Brain className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-gray-900 mb-1">{t.help.advanced.llmTitle}</h5>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.help.advanced.llmDesc}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                <Cpu className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-gray-900 mb-1">{t.help.advanced.aiSystemTitle}</h5>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.help.advanced.aiSystemDesc}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                                <MessageSquare className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-gray-900 mb-1">{t.help.advanced.mqTitle}</h5>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.help.advanced.mqDesc}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-green-50 text-green-600">
                                <Mail className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-gray-900 mb-1">{t.help.advanced.emailTitle}</h5>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.help.advanced.emailDesc}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-red-50 text-red-600">
                                <Key className="h-5 w-5" />
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-gray-900 mb-1">{t.help.advanced.globalKeyTitle}</h5>
                                <p className="text-xs text-gray-500 leading-relaxed">{t.help.advanced.globalKeyDesc}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

const NodeCard = ({ icon: Icon, color, bg, title, desc }: any) => (
    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
        <div className={clsx("p-2 rounded-lg shrink-0", bg, color)}>
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <h5 className="text-sm font-bold text-gray-900 mb-1">{title}</h5>
            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export default HelpModal;
