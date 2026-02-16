import React from 'react';
import { Code2, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { WorkflowNode } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';

interface ProcessNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const ProcessNodeConfig: React.FC<ProcessNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => {
    const language = config?.language || 'javascript';

    const placeholders = {
        javascript: `// 使用 'inputs' 或 'steps' 获取前置数据\n// 示例: 数据转换\nconst { userId } = inputs.body;\n\nreturn {\n  processed: true,\n  userId: userId,\n  timestamp: Date.now()\n};`,
        python: `# 使用 'inputs' 或 'steps' 获取字典数据\n# 示例: 数据转换\nuser_id = inputs.get('body', {}).get('userId')\n\nreturn {\n  "processed": True,\n  "user_id": user_id,\n  "timestamp": "2024-01-01"\n}`
    };

    return (
        <div className="space-y-4 h-full flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Language Selector */}
            <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                    <Code2 className="h-3.5 w-3.5" /> 运行环境
                </label>
                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                        onClick={() => onChange('language', 'javascript')}
                        className={clsx(
                            "px-3 py-1 text-[10px] font-medium rounded-md transition-all flex items-center gap-1",
                            language === 'javascript' 
                                ? "bg-white text-yellow-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                        Node.js
                    </button>
                    <button
                        onClick={() => onChange('language', 'python')}
                        className={clsx(
                            "px-3 py-1 text-[10px] font-medium rounded-md transition-all flex items-center gap-1",
                            language === 'python' 
                                ? "bg-white text-blue-700 shadow-sm border border-gray-100" 
                                : "text-gray-500 hover:text-gray-900"
                        )}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Python 3
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative flex-1 flex flex-col">
                <div className="bg-gray-900 rounded-t-md px-3 py-2 flex items-center justify-between border-b border-gray-800">
                    <span className="text-[10px] text-gray-400 font-mono">
                        {language === 'javascript' ? 'index.js' : 'script.py'}
                    </span>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Terminal className="h-3 w-3" />
                        Sandbox Mode
                    </span>
                </div>
                <EnhancedTextarea
                    value={config?.code || ''}
                    onValueChange={(val) => onChange('code', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    className="flex-1 w-full rounded-b-md border border-gray-200 bg-gray-900 p-3 text-xs font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none text-gray-100 leading-relaxed min-h-[300px]"
                    placeholder={placeholders[language as keyof typeof placeholders]}
                    spellCheck={false}
                />
            </div>
            
            {/* Hint */}
            <div className={clsx(
                "rounded p-2 text-[10px] border",
                language === 'javascript' ? "bg-yellow-50 text-yellow-800 border-yellow-100" : "bg-blue-50 text-blue-800 border-blue-100"
            )}>
                <strong>提示:</strong> {language === 'javascript' ? '支持 ES6 语法。' : '支持 Python 3.10 标准库。'}
                使用 <code>return</code> 返回 JSON 可序列化对象。
            </div>
        </div>
    );
};

export default ProcessNodeConfig;