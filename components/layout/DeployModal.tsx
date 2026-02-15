import React, { useState, useEffect } from 'react';
import { X, Rocket, GitCommit, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeployModalProps {
  currentVersion: string;
  onClose: () => void;
  onDeploy: (version: string, description: string) => void;
  nodeCount: number;
}

const DeployModal: React.FC<DeployModalProps> = ({ currentVersion, onClose, onDeploy, nodeCount }) => {
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-increment semantic version
  useEffect(() => {
    const parts = currentVersion.split('.').map(Number);
    if (parts.length === 3) {
        // Increment patch
        setVersion(`${parts[0]}.${parts[1]}.${parts[2] + 1}`);
    } else if (parts.length === 2) {
        setVersion(`${parts[0]}.${parts[1] + 1}.0`);
    } else {
        setVersion('1.0.0');
    }
  }, [currentVersion]);

  const handleSubmit = () => {
    if (!version.trim()) return;
    setIsSubmitting(true);
    // Simulate API delay
    setTimeout(() => {
        onDeploy(version, description);
        setIsSubmitting(false);
        onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
           <div className="flex items-center gap-2">
                <div className="bg-blue-600 text-white p-1.5 rounded-md shadow-sm">
                    <Rocket className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-base">发布新版本 (Deploy)</h3>
                    <p className="text-xs text-gray-500">将当前工作流推送到生产环境</p>
                </div>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-white/50 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
            
            {/* Version Input */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    版本号 (SemVer)
                </label>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="1.0.0"
                    />
                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-2 rounded border border-gray-200">Current: {currentVersion}</span>
                </div>
            </div>

            {/* Change Summary (Mocked Diff) */}
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div>
                        <h4 className="text-xs font-bold text-yellow-800 mb-1">变更摘要检测</h4>
                        <ul className="text-xs text-yellow-700 space-y-0.5 list-disc pl-4">
                            <li>检测到 {nodeCount} 个活跃节点</li>
                            <li>配置变更: API 请求参数更新</li>
                            <li>拓扑变更: 无</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    版本描述 / 变更日志
                </label>
                <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                    placeholder="描述本次更新的内容、修复的 Bug 或新增的功能..."
                />
            </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !version}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm
                    ${isSubmitting || !version
                        ? 'bg-blue-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-95'
                    }`}
            >
                {isSubmitting ? (
                    <>发布中...</>
                ) : (
                    <>
                        <CheckCircle2 className="h-4 w-4" />
                        确认发布
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DeployModal;