import React, { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { translations } from '../../locales';
import { useAppStore } from '../../store/useAppStore';

interface CreateWorkflowModalProps {
  onClose: () => void;
  onConfirm: (name: string, description: string) => void;
}

const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({ onClose, onConfirm }) => {
  const { language } = useAppStore();
  const t = translations[language];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsCreating(true);
    await onConfirm(name.trim(), description.trim());
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[450px] bg-white rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-black text-white p-1.5 rounded-md">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base">{t.createWorkflow.title}</h3>
              <p className="text-xs text-gray-500">{t.createWorkflow.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t.createWorkflow.nameLabel} <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={t.createWorkflow.namePlaceholder}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {t.createWorkflow.descLabel}
            </label>
            <textarea 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder={t.createWorkflow.descPlaceholder}
            />
          </div>

          <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100">
            <strong>{t.createWorkflow.tip}</strong>{t.createWorkflow.tipContent}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t.createWorkflow.cancel}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={isCreating || !name.trim()}
            className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.createWorkflow.creating}
              </>
            ) : (
              t.createWorkflow.create
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflowModal;
