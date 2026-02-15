import React, { useState } from 'react';
import { X, Users, BookOpen, ShieldCheck, Play, Settings, Database, Globe, Brain, Zap, Clock, Box, Workflow, Key } from 'lucide-react';
import { clsx } from 'clsx';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'permissions' | 'workflow' | 'nodes'>('workflow');

  const tabs = [
      { id: 'workflow', label: '工作流管理', icon: BookOpen },
      { id: 'nodes', label: '节点说明', icon: Box },
      { id: 'permissions', label: '团队权限', icon: ShieldCheck },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div className="h-full w-[600px] bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
           <h3 className="font-bold text-gray-900 text-lg">帮助中心 & 文档</h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-200 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        {/* Tabs */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
            
            {/* --- Workflow Management --- */}
            {activeTab === 'workflow' && (
                <div className="space-y-8">
                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">创建与管理</h4>
                        <ul className="space-y-4 text-sm text-gray-600">
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">创建</span>
                                <span>在仪表盘点击“新建”按钮，系统将自动生成一个包含“草稿”状态的空工作流。</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">导入/导出</span>
                                <span>支持完整的 JSON 格式导入导出。这对于在不同团队间迁移工作流或进行版本备份非常有用。</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="font-bold text-gray-900 whitespace-nowrap w-20">发布</span>
                                <span>点击编辑器右上角的“发布”按钮。发布后，工作流版本号将递增，并记录快照。</span>
                            </li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="text-base font-bold text-gray-900 mb-3">运行与调试</h4>
                        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                            <div className="flex gap-2">
                                <Play className="h-4 w-4 mt-0.5" />
                                <div>
                                    <strong>试运行 (Test Run):</strong> 在编辑器中直接运行，实时查看每个节点的执行状态、耗时和日志。底部会自动弹出“实时运行追踪”面板。
                                </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Key className="h-4 w-4 mt-0.5" />
                                <div>
                                    <strong>API 触发:</strong> 生产环境中，建议使用 Webhook URL 配合 API Key 进行调用。详情请查看编辑器中的“API 文档”。
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {/* --- Nodes Reference --- */}
            {activeTab === 'nodes' && (
                <div className="space-y-6">
                    <p className="text-sm text-gray-500 mb-4">
                        EasyWorkflow 提供了一系列核心节点来构建自动化流程。所有节点均支持引用前序节点的输出变量（使用 <code>{'{{steps.nodeId.data}}'}</code> 语法）。
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <NodeCard 
                            icon={Globe} color="text-blue-600" bg="bg-blue-50"
                            title="触发器 (Start)" 
                            desc="工作流的入口。支持 Webhook (HTTP POST)、定时任务 (Cron) 或手动触发。也可以配置为公开表单。"
                        />
                        <NodeCard 
                            icon={Globe} color="text-purple-600" bg="bg-purple-50"
                            title="HTTP 请求 (API Request)" 
                            desc="调用外部 REST API (GET, POST, etc)。支持自定义 Headers, Body 和认证方式。"
                        />
                        <NodeCard 
                            icon={Settings} color="text-orange-600" bg="bg-orange-50"
                            title="数据处理 (Process)" 
                            desc="运行自定义 JavaScript 代码 (沙箱环境)。用于数据清洗、转换或复杂计算。"
                        />
                        <NodeCard 
                            icon={Workflow} color="text-orange-500" bg="bg-orange-50"
                            title="条件判断 (Condition)" 
                            desc="If/Else 逻辑分支。根据 JS 表达式的结果 (true/false) 决定后续流程的走向。"
                        />
                        <NodeCard 
                            icon={Brain} color="text-purple-600" bg="bg-purple-50"
                            title="大模型 (LLM)" 
                            desc="调用 AI 模型 (OpenAI/Azure)。支持自定义 Prompt，可选择返回纯文本或 JSON 格式。"
                        />
                        <NodeCard 
                            icon={Database} color="text-blue-500" bg="bg-blue-50"
                            title="数据库 (DB Query)" 
                            desc="直接执行 SQL 查询 (Postgres/MySQL)。常用于从业务库获取数据或写入日志。"
                        />
                        <NodeCard 
                            icon={Clock} color="text-yellow-600" bg="bg-yellow-50"
                            title="延时 (Delay)" 
                            desc="暂停工作流执行一段指定的时间 (秒/分钟)。"
                        />
                        <NodeCard 
                            icon={Box} color="text-gray-600" bg="bg-gray-50"
                            title="结束 (End)" 
                            desc="定义工作流的最终响应内容和 HTTP 状态码。对于同步 Webhook 调用至关重要。"
                        />
                    </div>
                </div>
            )}

            {/* --- Team Permissions --- */}
            {activeTab === 'permissions' && (
                <div className="space-y-6">
                    <table className="w-full text-sm text-left border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50 text-gray-500 font-semibold">
                            <tr>
                                <th className="p-3 border-b">角色</th>
                                <th className="p-3 border-b">权限说明</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr>
                                <td className="p-3 font-medium text-purple-700 bg-purple-50/30">Owner (拥有者)</td>
                                <td className="p-3 text-gray-600">拥有最高权限。可以管理团队设置、账单、删除团队、管理所有成员以及所有工作流。</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-blue-700 bg-blue-50/30">Admin (管理员)</td>
                                <td className="p-3 text-gray-600">可以邀请/移除成员（除 Owner 外），管理 API Keys，以及创建、编辑、删除所有工作流。</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-orange-700 bg-orange-50/30">Editor (编辑者)</td>
                                <td className="p-3 text-gray-600">可以创建和编辑工作流，查看运行日志。无法管理团队成员或全局设置。</td>
                            </tr>
                            <tr>
                                <td className="p-3 font-medium text-gray-700 bg-gray-50/30">Viewer (查看者)</td>
                                <td className="p-3 text-gray-600">仅具有只读权限。可以查看工作流配置和日志，但无法进行任何修改。</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                        <div className="flex gap-2">
                            <Users className="h-5 w-5 text-yellow-600" />
                            <div>
                                <h5 className="font-bold text-yellow-800 text-sm">如何邀请成员？</h5>
                                <p className="text-sm text-yellow-700 mt-1">
                                    进入 <strong>系统设置 &gt; 团队成员</strong>，点击右上角的“邀请成员”按钮。输入对方邮箱并选择角色即可。
                                </p>
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