import React, { useState } from 'react';
import { Database, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff, Play } from 'lucide-react';
import { WorkflowNode, WorkflowEdge } from '../../../types';
import { EnhancedTextarea, EnhancedInput } from '../../common/NodeInputs';
import { clsx } from 'clsx';
import { api } from '../../../lib/api';

interface DbNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
    edges?: WorkflowEdge[];
}

const DbNodeConfig: React.FC<DbNodeConfigProps> = ({ config, onChange, nodes, currentNodeId, edges = [] }) => {
    const dbConfig = config?.dbConfig || {};
    const [showPassword, setShowPassword] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const defaultPorts: Record<string, number> = {
        mysql: 3306,
        postgresql: 5432,
        mssql: 1433,
    };

    const configMode = dbConfig.useConnectionString ? 'advanced' : 'simple';

    const updateDbConfig = (key: string, value: any) => {
        onChange('dbConfig', { ...dbConfig, [key]: value });
        setTestResult(null);
    };

    const handleTypeChange = (type: string) => {
        const newConfig = {
            ...dbConfig,
            type,
            port: dbConfig.port || defaultPorts[type] || 3306,
        };
        onChange('dbConfig', newConfig);
        setTestResult(null);
    };

    const handleConfigModeChange = (mode: string) => {
        updateDbConfig('useConnectionString', mode === 'advanced');
    };

    const buildConnectionString = () => {
        const { type, host, port, database, username, password } = dbConfig;
        if (type === 'mysql') {
            return `mysql://${username}:${password}@${host}:${port}/${database}`;
        } else if (type === 'postgresql') {
            return `postgresql://${username}:${password}@${host}:${port}/${database}`;
        } else if (type === 'mssql') {
            return `Server=${host},${port};Database=${database};User Id=${username};Password=${password};`;
        }
        return '';
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        
        try {
            const connectionConfig = configMode === 'advanced' 
                ? { connectionString: dbConfig.connectionString, type: dbConfig.type }
                : {
                    type: dbConfig.type,
                    host: dbConfig.host,
                    port: dbConfig.port,
                    database: dbConfig.database,
                    username: dbConfig.username,
                    password: dbConfig.password,
                };
            
            const result = await api.database.testConnection(connectionConfig);
            setTestResult({ success: true, message: '连接成功！' });
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || '连接失败' });
        } finally {
            setTesting(false);
        }
    };

    const isConfigValid = configMode === 'advanced' 
        ? !!dbConfig.connectionString
        : !!(dbConfig.host && dbConfig.database && dbConfig.username);

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800">
                <div className="flex items-center gap-2 mb-1 font-semibold">
                    <Database className="h-4 w-4" />
                    数据库查询节点
                </div>
                <p className="opacity-90">
                    连接数据库并执行 SQL 查询，支持 MySQL、PostgreSQL、SQL Server。
                </p>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">数据库类型</label>
                <select
                    value={dbConfig.type || 'mysql'}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-emerald-500"
                >
                    <option value="mysql">MySQL</option>
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mssql">SQL Server (MSSQL)</option>
                </select>
            </div>

            <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-700">配置模式</label>
                <select
                    value={configMode}
                    onChange={(e) => handleConfigModeChange(e.target.value)}
                    className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none focus:border-emerald-500"
                >
                    <option value="simple">表单配置</option>
                    <option value="advanced">连接字符串</option>
                </select>
            </div>

            {configMode === 'simple' ? (
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">连接名称 (可选)</label>
                        <input
                            type="text"
                            value={dbConfig.connectionName || ''}
                            onChange={(e) => updateDbConfig('connectionName', e.target.value)}
                            placeholder="我的数据库"
                            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">主机地址 *</label>
                            <EnhancedInput
                                value={dbConfig.host || ''}
                                onValueChange={(v) => updateDbConfig('host', v)}
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                edges={edges}
                                placeholder="localhost"
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-700">端口</label>
                            <input
                                type="number"
                                value={dbConfig.port || defaultPorts[dbConfig.type || 'mysql'] || 3306}
                                onChange={(e) => updateDbConfig('port', parseInt(e.target.value) || 3306)}
                                placeholder={String(defaultPorts[dbConfig.type || 'mysql'] || 3306)}
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">数据库名 *</label>
                        <EnhancedInput
                            value={dbConfig.database || ''}
                            onValueChange={(v) => updateDbConfig('database', v)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            edges={edges}
                            placeholder="mydb"
                            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">用户名 *</label>
                        <EnhancedInput
                            value={dbConfig.username || ''}
                            onValueChange={(v) => updateDbConfig('username', v)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            edges={edges}
                            placeholder="root"
                            className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">密码 *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={dbConfig.password || ''}
                                onChange={(e) => updateDbConfig('password', e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-md border border-gray-200 px-2 py-1.5 pr-8 text-xs outline-none focus:border-emerald-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-700">连接字符串 *</label>
                        <EnhancedTextarea
                            value={dbConfig.connectionString || ''}
                            onValueChange={(v) => updateDbConfig('connectionString', v)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            edges={edges}
                            placeholder={
                                dbConfig.type === 'mysql' 
                                    ? 'mysql://user:password@localhost:3306/mydb'
                                    : dbConfig.type === 'postgresql'
                                    ? 'postgresql://user:password@localhost:5432/mydb'
                                    : 'Server=localhost,1433;Database=mydb;User Id=user;Password=password;'
                            }
                            className="w-full h-20 rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-mono outline-none focus:border-emerald-500 resize-none"
                        />
                    </div>
                </div>
            )}

            <div className="flex gap-2">
                <button
                    onClick={testConnection}
                    disabled={!isConfigValid || testing}
                    className={clsx(
                        "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                        isConfigValid && !testing
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {testing ? (
                        <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            测试中...
                        </>
                    ) : (
                        <>
                            <Play className="h-3.5 w-3.5" />
                            测试连接
                        </>
                    )}
                </button>
            </div>

            {testResult && (
                <div className={clsx(
                    "flex items-center gap-2 p-2 rounded-md text-xs",
                    testResult.success 
                        ? "bg-green-50 text-green-700 border border-green-200" 
                        : "bg-red-50 text-red-700 border border-red-200"
                )}>
                    {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4" />
                    ) : (
                        <AlertCircle className="h-4 w-4" />
                    )}
                    {testResult.message}
                </div>
            )}

            <div className="border-t border-gray-100 pt-4">
                <label className="mb-1.5 block text-xs font-medium text-gray-700">SQL 查询语句</label>
                <EnhancedTextarea
                    value={dbConfig.query || ''}
                    onValueChange={(val) => updateDbConfig('query', val)}
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    edges={edges}
                    className="w-full h-[180px] rounded-md border border-gray-200 bg-gray-900 text-gray-100 p-3 text-xs font-mono outline-none focus:border-emerald-500 resize-none"
                    placeholder={`SELECT * FROM users\nWHERE id = {{trigger.body.userId}}\nLIMIT 10`}
                    spellCheck={false}
                />
                <p className="mt-1 text-[10px] text-gray-400">
                    支持 <code className="bg-gray-100 px-1 rounded">{'{{变量}}'}</code> 语法引用前置节点数据
                </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                    <strong>安全提示：</strong>数据库密码将加密存储。查询结果存储在 <code className="bg-amber-100 px-1 rounded">steps.当前节点.rows</code> 中。
                </div>
            </div>
        </div>
    );
};

export default DbNodeConfig;
