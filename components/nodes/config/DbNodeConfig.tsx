import React from 'react';
import { WorkflowNode } from '../../../types';
import { EnhancedTextarea } from '../../common/NodeInputs';

interface DbNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const DbNodeConfig: React.FC<DbNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => {
    const dbConfig = config?.dbConfig || { type: 'postgres' };
    
    const updateDb = (key: string, value: any) => {
        onChange('dbConfig', { ...dbConfig, [key]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">数据库类型</label>
                <select
                    value={dbConfig.type}
                    onChange={(e) => updateDb('type', e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm bg-white outline-none focus:border-black"
                >
                    <option value="postgres">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                    <option value="mssql">SQL Server</option>
                </select>
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">连接字符串</label>
                <input 
                   type="password"
                   placeholder="postgresql://user:password@localhost:5432/mydb"
                   value={dbConfig.connectionString || ''}
                   onChange={(e) => updateDb('connectionString', e.target.value)}
                   className="w-full rounded-md border border-gray-200 px-2 py-2 text-xs outline-none focus:border-black font-mono"
                />
            </div>

            <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">SQL 查询语句</label>
                <EnhancedTextarea 
                    value={dbConfig.query || ''}
                    onValueChange={(val) => updateDb('query', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    placeholder="SELECT * FROM users WHERE id = {{steps.prev.userId}};"
                    className="w-full h-40 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono focus:border-blue-500 outline-none resize-none text-gray-800"
                />
                <p className="mt-1 text-[10px] text-gray-400">支持使用 <code>{`{{variables}}`}</code> 进行参数注入。</p>
            </div>
        </div>
    );
};

export default DbNodeConfig;