import React, { useState } from 'react';
import { X, Users, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface CreateTeamModalProps {
  onClose: () => void;
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ onClose }) => {
  const { createTeam } = useAppStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setName(val);
      if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-').slice(0, slug.length)) {
         setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;
    
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
        createTeam(name, slug);
        setIsLoading(false);
        onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
           <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <div className="bg-black text-white p-1 rounded-md">
                    <Users className="h-4 w-4" />
                </div>
                创建新团队
           </h3>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    团队名称 <span className="text-red-500">*</span>
                </label>
                <input 
                    type="text" 
                    value={name}
                    onChange={handleNameChange}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    placeholder="例如: Acme Engineering"
                    autoFocus
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    团队标识符 (Slug) <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center rounded-md border border-gray-300 bg-gray-50 px-3 py-2">
                    <span className="text-sm text-gray-500 mr-1">app.easyflow.com/</span>
                    <input 
                        type="text" 
                        value={slug}
                        onChange={(e) => setSlug(e.target.value)}
                        className="flex-1 bg-transparent text-sm font-medium text-gray-900 focus:outline-none placeholder:text-gray-400"
                        placeholder="team-slug"
                        required
                    />
                </div>
                <p className="mt-1 text-xs text-gray-500">用于团队的 URL 访问地址，仅支持小写字母、数字和连字符。</p>
            </div>
            
            <div className="bg-blue-50 rounded-md p-3 text-xs text-blue-700 border border-blue-100 flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                    创建团队后，您将自动成为该团队的 Owner。您可以稍后在“系统设置”中邀请其他成员加入。
                </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
                <button 
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                    取消
                </button>
                <button 
                    type="submit"
                    disabled={isLoading || !name || !slug}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm
                        ${isLoading || !name || !slug
                            ? 'bg-gray-300 cursor-not-allowed' 
                            : 'bg-black hover:bg-gray-800 hover:shadow-md active:scale-95'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            创建中...
                        </>
                    ) : (
                        <>
                            创建团队
                            <ArrowRight className="h-4 w-4 opacity-50" />
                        </>
                    )}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeamModal;