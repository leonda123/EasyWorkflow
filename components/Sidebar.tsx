import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Play, Settings, Globe, Workflow, Box, Search, GripVertical, Sparkles, Bookmark, Trash2, Tag, Layers, Edit2, X, Save, Brain, Clock, Database, FileJson, GitMerge, FileText, Repeat } from 'lucide-react';
import { NodeType, SavedNodeTemplate } from '../types';
import AiGeneratorModal from './ai/AiGeneratorModal';
import { useAppStore } from '../store/useAppStore';
import { translations } from '../locales';

interface DraggableNodeProps {
  id?: string;
  type: NodeType;
  label: string;
  description: string;
  icon: React.ElementType;
  savedData?: string; // JSON string of the full saved data
  tags?: string[];
  onDelete?: () => void;
  onEdit?: () => void;
}

const DraggableNode: React.FC<DraggableNodeProps> = ({ id, type, label, description, icon: Icon, savedData, tags, onDelete, onEdit }) => {
  const onDragStart = (event: React.DragEvent, nodeType: string, nodeLabel: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', nodeLabel);
    
    if (savedData) {
        event.dataTransfer.setData('application/reactflow/saved-node', savedData);
    }
    
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="group flex cursor-grab items-start gap-3 rounded-lg border border-transparent bg-white p-3 transition-all hover:border-gray-200 hover:shadow-sm active:cursor-grabbing relative"
      draggable
      onDragStart={(e) => onDragStart(e, type, label)}
    >
      <div className="mt-0.5 text-gray-400 group-hover:text-gray-900 transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate pr-4">{label}</div>
        <div className="text-xs text-gray-500 line-clamp-1">{description}</div>
        {tags && tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                {tags.slice(0, 3).map(tag => (
                    <span key={tag} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                        {tag}
                    </span>
                ))}
            </div>
        )}
      </div>
      <GripVertical className="ml-auto h-4 w-4 text-gray-300 opacity-0 group-hover:opacity-100" />
      
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
          {onEdit && (
             <button 
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-1 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded"
                title="编辑标签"
              >
                  <Edit2 className="h-3 w-3" />
              </button>
          )}
          {onDelete && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded"
                title="删除收藏"
              >
                  <Trash2 className="h-3 w-3" />
              </button>
          )}
      </div>
    </div>
  );
};

const iconMap = {
  [NodeType.START]: Play,
  [NodeType.PROCESS]: Settings,
  [NodeType.API_REQUEST]: Globe,
  [NodeType.CONDITION]: Workflow,
  [NodeType.LLM]: Brain,
  [NodeType.DELAY]: Clock,
  [NodeType.DB_QUERY]: Database,
  [NodeType.END]: Box,
  [NodeType.PRESET_DATA]: FileJson,
  [NodeType.WORKFLOW_CALL]: GitMerge,
  [NodeType.FILE_PARSER]: FileText,
};

const Sidebar = () => {
  const { savedNodes, deleteSavedNode, updateSavedNode, language } = useAppStore();
  const t = translations[language].editor;
  const tNodes = translations[language].editor.nodes;

  const [searchTerm, setSearchTerm] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'core' | 'saved'>('core');
  
  // Editing State
  const [editingNode, setEditingNode] = useState<SavedNodeTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [currentTagInput, setCurrentTagInput] = useState('');

  const coreTools = [
    { type: NodeType.START, label: tNodes.start, description: tNodes.startDesc, icon: Play },
    { type: NodeType.LLM, label: tNodes.llm, description: tNodes.llmDesc, icon: Brain },
    { type: NodeType.API_REQUEST, label: tNodes.api, description: tNodes.apiDesc, icon: Globe },
    { type: NodeType.DB_QUERY, label: tNodes.db, description: tNodes.dbDesc, icon: Database },
    { type: NodeType.FILE_PARSER, label: '文件解析', description: '解析PDF/Word/Excel等文件', icon: FileText },
    { type: NodeType.PROCESS, label: tNodes.process, description: tNodes.processDesc, icon: Settings },
    { type: NodeType.CONDITION, label: tNodes.condition, description: tNodes.conditionDesc, icon: Workflow },
    { type: NodeType.LOOP, label: '循环', description: '重复执行节点', icon: Repeat },
    { type: NodeType.DELAY, label: tNodes.delay, description: tNodes.delayDesc, icon: Clock },
    { type: NodeType.PRESET_DATA, label: '预设数据', description: '预设测试数据', icon: FileJson },
    { type: NodeType.WORKFLOW_CALL, label: '工作流调用', description: '调用其他工作流', icon: GitMerge },
    { type: NodeType.END, label: tNodes.end, description: tNodes.endDesc, icon: Box },
  ];

  const filteredCore = coreTools.filter(t => 
    t.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSaved = savedNodes.filter(n => 
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const startEditing = (node: SavedNodeTemplate) => {
      setEditingNode(node);
      setEditName(node.name);
      setEditTags([...node.tags]);
      setCurrentTagInput('');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && currentTagInput.trim()) {
          e.preventDefault();
          if(!editTags.includes(currentTagInput.trim())) {
              setEditTags([...editTags, currentTagInput.trim()]);
          }
          setCurrentTagInput('');
      }
  };

  const removeTag = (tag: string) => {
      setEditTags(editTags.filter(t => t !== tag));
  };

  const saveEdit = () => {
      if (editingNode) {
          updateSavedNode(editingNode.id, {
              name: editName,
              tags: editTags
          });
          setEditingNode(null);
      }
  };

  return (
    <>
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-gray-50/50 relative">
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 mb-4">
           <img src="/logo.png" alt="EasyWorkflow" className="h-6 w-6 rounded object-contain" />
           <span className="font-bold text-gray-900 tracking-tight">EasyWorkflow</span>
        </div>
        
        {/* AI Generate Button */}
        <button 
            onClick={() => setShowAiModal(true)}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-purple-700 transition-all hover:shadow active:scale-95"
        >
            <Sparkles className="h-4 w-4 text-yellow-200" />
            {t.aiGenerate}
        </button>

        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'core' ? t.searchComponents : t.searchSaved}
            className="w-full rounded-md border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm outline-none transition-all focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-md">
            <button 
                onClick={() => setActiveTab('core')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-sm transition-all",
                    activeTab === 'core' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
            >
                <Layers className="h-3.5 w-3.5" />
                {t.components}
            </button>
            <button 
                onClick={() => setActiveTab('saved')}
                className={clsx(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-sm transition-all",
                    activeTab === 'saved' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
            >
                <Bookmark className="h-3.5 w-3.5" />
                {t.favorites}
            </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
        {activeTab === 'core' ? (
             <div className="space-y-1">
                {filteredCore.map((tool) => (
                    <DraggableNode key={tool.type} {...tool} />
                ))}
             </div>
        ) : (
            <div className="space-y-1">
                {savedNodes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                        <Bookmark className="h-8 w-8 opacity-20" />
                        <p className="text-xs text-center whitespace-pre-line">{t.noFavorites}</p>
                    </div>
                ) : (
                    filteredSaved.map((node) => (
                        <DraggableNode 
                            key={node.id}
                            id={node.id}
                            type={node.nodeType}
                            label={node.name}
                            description={node.data.description || '自定义节点'}
                            icon={iconMap[node.nodeType] || Box}
                            tags={node.tags}
                            savedData={JSON.stringify(node.data)}
                            onDelete={() => {
                                if(confirm('确定要删除这个收藏吗?')) {
                                    deleteSavedNode(node.id);
                                }
                            }}
                            onEdit={() => startEditing(node)}
                        />
                    ))
                )}
            </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="text-xs text-gray-400 text-center">
          v0.2.1 • Enterprise
        </div>
      </div>

      {/* Edit Popover Overlay */}
      {editingNode && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 p-4 animate-in fade-in duration-200 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">{t.editFavorite}</h3>
                  <button onClick={() => setEditingNode(null)} className="text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                  </button>
              </div>
              
              <div className="space-y-4 flex-1">
                  <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t.name}</label>
                      <input 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                      />
                  </div>
                  <div>
                      <label className="text-xs font-medium text-gray-500 mb-1 block">{t.tags}</label>
                      <div className="border border-gray-200 rounded bg-white px-2 py-2 min-h-[40px] flex flex-wrap gap-1.5">
                          {editTags.map(tag => (
                              <span key={tag} className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                  {tag}
                                  <X className="h-3 w-3 cursor-pointer hover:text-red-500" onClick={() => removeTag(tag)}/>
                              </span>
                          ))}
                          <input 
                              className="text-xs outline-none flex-1 min-w-[50px] bg-transparent"
                              value={currentTagInput}
                              onChange={e => setCurrentTagInput(e.target.value)}
                              onKeyDown={handleAddTag}
                              placeholder="+"
                          />
                      </div>
                  </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2">
                   <button onClick={() => setEditingNode(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded">{t.cancel}</button>
                   <button onClick={saveEdit} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1">
                       <Save className="h-3 w-3" /> {t.save}
                   </button>
              </div>
          </div>
      )}
    </aside>

    {showAiModal && (
        <AiGeneratorModal onClose={() => setShowAiModal(false)} />
    )}
    </>
  );
};

export default Sidebar;