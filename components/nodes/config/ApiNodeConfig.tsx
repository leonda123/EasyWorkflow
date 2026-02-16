import React, { useState } from 'react';
import { clsx } from 'clsx';
import { Download, X } from 'lucide-react';
import { WorkflowNode } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { translations } from '../../../locales';
import { EnhancedInput, EnhancedTextarea, KeyValueEditor } from '../../common/NodeInputs';

interface ApiNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
    nodes: WorkflowNode[];
    currentNodeId: string;
}

const ApiNodeConfig: React.FC<ApiNodeConfigProps> = ({ config, onChange, nodes, currentNodeId }) => {
    const { language } = useAppStore();
    const t = translations[language].editor.api;
    const [subTab, setSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'scripts'>('params');
    const [showImport, setShowImport] = useState(false);
    const [importContent, setImportContent] = useState('');
    const authConfig = config?.authConfig || {};

    const handleImport = () => {
        if (!importContent) return;
        
        let newConfig: any = {};
        
        try {
            // Try parsing as JSON (OpenAPI Operation Object)
            const json = JSON.parse(importContent);
            if (typeof json === 'object') {
                if (json.url) newConfig.url = json.url;
                if (json.method) newConfig.method = json.method.toUpperCase();
                if (json.headers) {
                    newConfig.headers = Object.entries(json.headers).map(([k, v], i) => ({ id: `h-${i}`, key: k, value: v }));
                }
                if (json.body) newConfig.body = typeof json.body === 'string' ? json.body : JSON.stringify(json.body, null, 2);
            }
        } catch (e) {
            // Not JSON, try basic cURL parsing (Simple regex based)
            if (importContent.trim().startsWith('curl')) {
                const urlMatch = importContent.match(/https?:\/\/[^\s"']+/);
                if (urlMatch) newConfig.url = urlMatch[0];
                
                if (importContent.includes('-X POST') || importContent.includes('--request POST')) newConfig.method = 'POST';
                else if (importContent.includes('-X PUT')) newConfig.method = 'PUT';
                else if (importContent.includes('-X DELETE')) newConfig.method = 'DELETE';
                else newConfig.method = 'GET';

                const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
                let match;
                const headers = [];
                while ((match = headerRegex.exec(importContent)) !== null) {
                    const [key, value] = match[1].split(/:\s?/);
                    headers.push({ id: `h-${Date.now()}-${headers.length}`, key, value });
                }
                if (headers.length > 0) newConfig.headers = headers;
            }
        }

        if (Object.keys(newConfig).length > 0) {
            Object.entries(newConfig).forEach(([k, v]) => onChange(k, v));
            alert(t.importTitle + ' Success');
            setShowImport(false);
            setImportContent('');
        } else {
            alert('Failed to parse input.');
        }
    };

    return (
      <div className="space-y-4">
        {/* Import Modal */}
        {showImport && (
            <div className="absolute inset-0 z-50 bg-white p-4 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-sm text-gray-900">{t.importTitle}</h4>
                    <button onClick={() => setShowImport(false)}><X className="h-4 w-4 text-gray-500" /></button>
                </div>
                <p className="text-xs text-gray-500 mb-2">{t.importDesc}</p>
                <textarea 
                    className="flex-1 w-full border border-gray-200 rounded p-2 text-xs font-mono resize-none focus:border-blue-500 outline-none"
                    placeholder={t.pasteCurl}
                    value={importContent}
                    onChange={e => setImportContent(e.target.value)}
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={() => setShowImport(false)} className="text-xs text-gray-500 px-3 py-1.5 hover:bg-gray-100 rounded">{translations[language].editor.cancel}</button>
                    <button onClick={handleImport} className="text-xs bg-black text-white px-3 py-1.5 rounded hover:bg-gray-800">{t.btnImport}</button>
                </div>
            </div>
        )}

        {/* Method & URL Line */}
        <div className="flex gap-2">
          <select 
            value={config?.method || 'GET'}
            onChange={(e) => onChange('method', e.target.value)}
            className={clsx(
              "w-24 rounded-md border px-2 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-black",
              config?.method === 'GET' && "text-green-700 border-green-200 bg-green-50",
              config?.method === 'POST' && "text-yellow-700 border-yellow-200 bg-yellow-50",
              config?.method === 'DELETE' && "text-red-700 border-red-200 bg-red-50",
              (!config?.method || ['PUT', 'PATCH'].includes(config.method)) && "text-blue-700 border-blue-200 bg-blue-50",
            )}
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <EnhancedInput 
            placeholder="https://api.example.com/v1/resource"
            value={config?.url || ''}
            onValueChange={(val) => onChange('url', val)}
            nodes={nodes}
            currentNodeId={currentNodeId}
            className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-black w-full"
          />
          <button 
            onClick={() => setShowImport(true)}
            className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black transition-colors"
            title={t.import}
          >
              <Download className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
             {[
                 { id: 'params', label: t.tabs.params },
                 { id: 'auth', label: t.tabs.auth },
                 { id: 'headers', label: t.tabs.headers },
                 { id: 'body', label: t.tabs.body },
                 { id: 'scripts', label: t.tabs.scripts } 
             ].map((t) => (
               <button
                 key={t.id}
                 onClick={() => setSubTab(t.id as any)}
                 className={clsx(
                   "px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors whitespace-nowrap",
                   subTab === t.id ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-600"
                 )}
               >
                 {t.label}
               </button>
             ))}
          </div>

          <div className="min-h-[200px]">
            {/* Params Tab */}
            {subTab === 'params' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <KeyValueEditor 
                    items={config?.params} 
                    onChange={(v) => onChange('params', v)} 
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                />
              </div>
            )}

            {/* Auth Tab */}
            {subTab === 'auth' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-gray-700">Authentication Type</label>
                    <select 
                        value={config?.authType || 'none'}
                        onChange={(e) => onChange('authType', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black bg-white"
                    >
                        <option value="none">{t.auth.none}</option>
                        <option value="bearer">{t.auth.bearer}</option>
                        <option value="basic">{t.auth.basic}</option>
                        <option value="oauth2">{t.auth.oauth2}</option>
                    </select>
                  </div>

                  {config?.authType === 'bearer' && (
                     <div>
                        <label className="mb-1 block text-xs font-medium text-gray-500">Token</label>
                        <EnhancedInput
                            type="password"
                            placeholder="eyJhbGciOiJIUzI1Ni..."
                            value={authConfig.token || ''}
                            onValueChange={(v) => onChange('authConfig', { ...authConfig, token: v })}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                        />
                     </div>
                  )}

                  {config?.authType === 'basic' && (
                     <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Username</label>
                            <EnhancedInput
                                placeholder="admin"
                                value={authConfig.username || ''}
                                onValueChange={(v) => onChange('authConfig', { ...authConfig, username: v })}
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500">Password</label>
                            <EnhancedInput
                                type="password"
                                placeholder="********"
                                value={authConfig.password || ''}
                                onValueChange={(v) => onChange('authConfig', { ...authConfig, password: v })}
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-xs outline-none focus:border-black"
                            />
                        </div>
                     </div>
                  )}

                  {config?.authType === 'oauth2' && (
                      <div className="space-y-3">
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.grantType}</label>
                              <select 
                                  value={authConfig.grantType || 'client_credentials'}
                                  onChange={e => onChange('authConfig', { ...authConfig, grantType: e.target.value })}
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs bg-white outline-none"
                              >
                                  <option value="client_credentials">Client Credentials</option>
                                  <option value="authorization_code">Authorization Code</option>
                              </select>
                          </div>
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.accessTokenUrl}</label>
                              <input 
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                  placeholder="https://api.example.com/oauth/token"
                                  value={authConfig.accessTokenUrl || ''}
                                  onChange={e => onChange('authConfig', { ...authConfig, accessTokenUrl: e.target.value })}
                              />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                              <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.clientId}</label>
                                  <input 
                                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                      value={authConfig.clientId || ''}
                                      onChange={e => onChange('authConfig', { ...authConfig, clientId: e.target.value })}
                                  />
                              </div>
                              <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.clientSecret}</label>
                                  <input 
                                      type="password"
                                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                      value={authConfig.clientSecret || ''}
                                      onChange={e => onChange('authConfig', { ...authConfig, clientSecret: e.target.value })}
                                  />
                              </div>
                          </div>
                          <div>
                              <label className="mb-1 block text-xs font-medium text-gray-500">{t.auth.scope}</label>
                              <input 
                                  className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-black"
                                  placeholder="read write"
                                  value={authConfig.scope || ''}
                                  onChange={e => onChange('authConfig', { ...authConfig, scope: e.target.value })}
                              />
                          </div>
                          <div className="bg-yellow-50 p-2 rounded text-[10px] text-yellow-800 border border-yellow-100">
                              Note: OAuth2 token will be automatically fetched before the request.
                          </div>
                      </div>
                  )}
              </div>
            )}

            {/* Headers Tab */}
            {subTab === 'headers' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                <KeyValueEditor 
                    items={config?.headers} 
                    onChange={(v) => onChange('headers', v)} 
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                />
              </div>
            )}

            {/* Body Tab */}
            {subTab === 'body' && (
               <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-200">
                 <div className="mb-2 flex justify-between items-center">
                    <span className="text-[10px] text-gray-400 font-medium">Content-Type: application/json</span>
                 </div>
                 <EnhancedTextarea
                   value={config?.body || ''}
                   onValueChange={(val) => onChange('body', val)}
                   nodes={nodes}
                   currentNodeId={currentNodeId}
                   placeholder="{\n  'key': 'value'\n}"
                   className="w-full h-48 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs font-mono outline-none focus:border-black focus:ring-1 focus:ring-black resize-none text-gray-800"
                 />
               </div>
            )}

            {/* Scripts Tab */}
            {subTab === 'scripts' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200 h-full overflow-y-auto pr-1">
                    <div className="bg-blue-50 border border-blue-100 p-2 rounded text-[10px] text-blue-700 mb-2">
                        {t.scripts.hint}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.scripts.preRequest}</label>
                        <EnhancedTextarea 
                            value={config?.preRequestScript || ''}
                            onValueChange={val => onChange('preRequestScript', val)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full h-32 rounded-md border border-gray-200 bg-gray-900 text-gray-300 p-2 text-xs font-mono outline-none resize-none focus:border-blue-500"
                            placeholder="// console.log('Preparing request...');"
                            spellCheck={false}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t.scripts.test}</label>
                        <EnhancedTextarea 
                            value={config?.testScript || ''}
                            onValueChange={val => onChange('testScript', val)}
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            className="w-full h-32 rounded-md border border-gray-200 bg-gray-900 text-gray-300 p-2 text-xs font-mono outline-none resize-none focus:border-blue-500"
                            placeholder="// if (response.status === 200) { ... }"
                            spellCheck={false}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
    );
};

export default ApiNodeConfig;