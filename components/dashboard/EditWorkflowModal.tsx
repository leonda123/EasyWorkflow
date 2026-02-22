import React, { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { translations } from '../../locales';
import { WorkflowMetadata } from '../../types';

interface EditWorkflowModalProps {
  workflow: WorkflowMetadata;
  onClose: () => void;
}

const EditWorkflowModal: React.FC<EditWorkflowModalProps> = ({ workflow, onClose }) => {
  const { updateWorkflow, currentTeam, language } = useAppStore();
  const t = translations[language];
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !currentTeam) return;
    
    setIsSaving(true);
    try {
      await updateWorkflow(currentTeam.id, workflow.id, {
        name: name.trim(),
        description: description.trim(),
      });
      onClose();
    } catch (error) {
      console.error('Failed to update workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
      <div className="w-[480px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">{t.editWorkflow.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.editWorkflow.nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder={t.editWorkflow.namePlaceholder}
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">{t.editWorkflow.descLabel}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              placeholder={t.editWorkflow.descPlaceholder}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t.editWorkflow.cancel}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.editWorkflow.saving}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t.editWorkflow.save}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWorkflowModal;
