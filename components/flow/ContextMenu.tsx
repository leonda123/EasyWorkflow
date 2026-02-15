import React from 'react';
import { Copy, Trash2, ClipboardPaste } from 'lucide-react';

interface ContextMenuProps {
  top: number;
  left: number;
  type: 'node' | 'pane';
  hasCopiedNodes: boolean;
  onAction: (action: 'copy' | 'delete' | 'paste') => void;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ top, left, type, hasCopiedNodes, onAction, onClose }) => {
  // Close menu if clicking outside is handled by a transparent overlay or parent listener
  // Here we assume the parent handles closing on outside clicks

  return (
    <div 
        style={{ top, left }} 
        className="absolute z-50 w-36 bg-white rounded-lg shadow-xl border border-gray-200 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
    >
        {type === 'node' && (
            <>
                <button 
                    onClick={() => onAction('copy')} 
                    className="text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                    <Copy className="h-3.5 w-3.5 text-gray-500" /> 
                    复制
                </button>
                <button 
                    onClick={() => onAction('delete')} 
                    className="text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors border-t border-gray-100"
                >
                    <Trash2 className="h-3.5 w-3.5" /> 
                    删除
                </button>
            </>
        )}
        {type === 'pane' && (
            <button 
                onClick={() => onAction('paste')} 
                disabled={!hasCopiedNodes}
                className="text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
            >
                <ClipboardPaste className="h-3.5 w-3.5 text-gray-500" /> 
                粘贴
            </button>
        )}
    </div>
  );
};

export default ContextMenu;