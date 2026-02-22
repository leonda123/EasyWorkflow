import React, { useState, useEffect } from 'react';
import { X, Sparkles, Send, FileText, Link as LinkIcon, AlertCircle, Loader2, ArrowRight, Code, GitBranch, Zap, Webhook } from 'lucide-react';
import { useFlowStore } from '../../store/useFlowStore';
import { api } from '../../lib/api';
import { NodeType, NodeStatus } from '../../types';
import { clsx } from 'clsx';

interface AiGeneratorModalProps {
  onClose: () => void;
}

type GenerateNodeType = 'api' | 'process' | 'condition' | 'webhook';

const nodeTypeOptions = [
  { id: 'api', label: 'API 请求', icon: Webhook, description: 'HTTP 请求调用' },
  { id: 'process', label: '数据处理', icon: Code, description: '数据转换处理' },
  { id: 'condition', label: '条件判断', icon: GitBranch, description: '条件分支逻辑' },
];

const systemPrompts: Record<GenerateNodeType, string> = {
  api: `You are an expert API integration assistant. 
Your task is to parse the user's input (which could be a cURL command, API documentation snippet, or natural language description) 
and convert it into a structured configuration for an HTTP Request Node.

Return ONLY a JSON object with the following structure:
{
  "label": "A short, concise name for the node (e.g. 'Create User')",
  "description": "Brief description of what this request does",
  "method": "GET or POST or PUT or DELETE or PATCH",
  "url": "The API URL",
  "headers": [{"key": "header name", "value": "header value"}],
  "params": [{"key": "param name", "value": "param value"}],
  "body": "JSON string of the request body if applicable"
}

Required fields: label, method, url`,
  
  process: `You are an expert data processing assistant.
Your task is to parse the user's input and generate a data processing script.

Return ONLY a JSON object with the following structure:
{
  "label": "A short name for the node (e.g. 'Transform Data')",
  "description": "Brief description of what this process does",
  "language": "javascript or python",
  "code": "The processing code"
}

The code should:
- Accept input via 'inputs' variable
- Return the processed result
- Handle errors gracefully

Example for JavaScript:
{
  "label": "Filter Users",
  "description": "Filter users by age",
  "language": "javascript",
  "code": "const users = inputs.users || [];\nreturn users.filter(u => u.age >= 18);"
}`,

  condition: `You are an expert workflow logic assistant.
Your task is to parse the user's input and generate a condition expression.

Return ONLY a JSON object with the following structure:
{
  "label": "A short name for the node (e.g. 'Check Status')",
  "description": "Brief description of what this condition checks",
  "expression": "A JavaScript boolean expression"
}

The expression should:
- Use 'inputs' to access input data
- Return true or false
- Be a valid JavaScript expression

Examples:
- Check if status is active: "inputs.status === 'active'"
- Check if amount exceeds threshold: "inputs.amount > 1000"
- Check if user is admin: "inputs.user?.role === 'admin'"`,

  webhook: `You are an expert webhook configuration assistant.
Your task is to parse the user's input and generate a webhook trigger configuration.

Return ONLY a JSON object with the following structure:
{
  "label": "A short name for the node (e.g. 'GitHub Webhook')",
  "description": "Brief description of this webhook",
  "method": "GET or POST",
  "path": "URL path for the webhook (e.g. '/github-hook')"
}

Examples:
{
  "label": "GitHub Push Hook",
  "description": "Trigger on GitHub push events",
  "method": "POST",
  "path": "/github-push"
}`
};

const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({ onClose }) => {
  const [nodeType, setNodeType] = useState<GenerateNodeType>('api');
  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmAvailable, setLlmAvailable] = useState<boolean | null>(null);
  
  const { addNode } = useFlowStore();

  useEffect(() => {
    const checkLlm = async () => {
      try {
        const configs = await api.llm.configs.list();
        setLlmAvailable(configs.length > 0);
      } catch {
        setLlmAvailable(false);
      }
    };
    checkLlm();
  }, []);

  const handleGenerate = async () => {
    if (!inputValue.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      let generatedData: any = null;

      if (llmAvailable) {
        try {
          const response = await api.llm.chat(
            [{ role: 'user', content: inputValue }],
            { systemPrompt: systemPrompts[nodeType] }
          );
          
          let content = response.content;
          content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          generatedData = JSON.parse(content);
        } catch (parseError: any) {
          setError("AI 返回的数据格式无效，请重试。");
          setIsGenerating(false);
          return;
        }
      } else {
        await new Promise(r => setTimeout(r, 1500));
        
        if (nodeType === 'api') {
          const isPost = inputValue.toLowerCase().includes('post') || inputValue.includes('-d');
          generatedData = {
            label: isPost ? 'Generated POST Request' : 'Generated GET Request',
            description: 'AI Generated node based on input documentation.',
            method: isPost ? 'POST' : 'GET',
            url: inputValue.match(/https?:\/\/[^\s"']+/)?.[0] || 'https://api.example.com/resource',
            headers: [
              { key: 'Content-Type', value: 'application/json' },
              { key: 'Authorization', value: 'Bearer {{secrets.KEY}}' }
            ],
            params: [],
            body: isPost ? '{\n  "example": "value"\n}' : ''
          };
        } else if (nodeType === 'process') {
          generatedData = {
            label: 'Data Transform',
            description: 'Process and transform input data',
            language: 'javascript',
            code: '// Process input data\nconst data = inputs.data || [];\nreturn data.map(item => ({\n  ...item,\n  processed: true\n}));'
          };
        } else if (nodeType === 'condition') {
          generatedData = {
            label: 'Check Condition',
            description: 'Evaluate a condition',
            expression: 'inputs.success === true'
          };
        }
      }

      if (generatedData) {
        let newNode: any = null;
        
        if (nodeType === 'api') {
          newNode = {
            id: `api-${Date.now()}`,
            type: 'custom',
            position: { x: 250 + Math.random() * 100, y: 100 + Math.random() * 100 },
            data: {
              label: generatedData.label,
              description: generatedData.description,
              status: NodeStatus.IDLE,
              type: NodeType.API_REQUEST,
              config: {
                method: generatedData.method,
                url: generatedData.url,
                headers: generatedData.headers?.map((h: any, i: number) => ({ id: `${Date.now()}-${i}`, ...h })) || [],
                params: generatedData.params?.map((p: any, i: number) => ({ id: `${Date.now()}-${i}p`, ...p })) || [],
                body: generatedData.body || ''
              }
            }
          };
        } else if (nodeType === 'process') {
          newNode = {
            id: `process-${Date.now()}`,
            type: 'custom',
            position: { x: 250 + Math.random() * 100, y: 100 + Math.random() * 100 },
            data: {
              label: generatedData.label,
              description: generatedData.description,
              status: NodeStatus.IDLE,
              type: NodeType.PROCESS,
              config: {
                language: generatedData.language || 'javascript',
                code: generatedData.code || ''
              }
            }
          };
        } else if (nodeType === 'condition') {
          newNode = {
            id: `condition-${Date.now()}`,
            type: 'custom',
            position: { x: 250 + Math.random() * 100, y: 100 + Math.random() * 100 },
            data: {
              label: generatedData.label,
              description: generatedData.description,
              status: NodeStatus.IDLE,
              type: NodeType.CONDITION,
              config: {
                conditionExpression: generatedData.expression || 'true'
              }
            }
          };
        }

        if (newNode) {
          addNode(newNode);
          onClose();
        } else {
          throw new Error("Failed to generate node structure.");
        }
      } else {
        throw new Error("Failed to generate structure.");
      }

    } catch (err) {
      console.error(err);
      setError("生成失败，请检查输入内容是否完整。");
    } finally {
      setIsGenerating(false);
    }
  };

  const getPlaceholder = () => {
    switch (nodeType) {
      case 'api':
        return `例如:\ncurl -X POST https://api.stripe.com/v1/charges \\\n  -u sk_test_4eC39Hq: \\\n  -d amount=2000 \\\n  -d currency=usd\n\n或描述:\n创建一个用户注册的 POST 请求，发送用户名和密码到 /api/register`;
      case 'process':
        return `描述数据处理需求:\n\n例如:\n- 过滤年龄大于18岁的用户\n- 将日期格式从 YYYY-MM-DD 转换为 DD/MM/YYYY\n- 提取数组中的特定字段`;
      case 'condition':
        return `描述条件判断逻辑:\n\n例如:\n- 如果用户状态是 active 则继续\n- 如果订单金额超过1000元则标记为VIP\n- 如果响应状态码是200则成功`;
      default:
        return '请输入描述...';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[650px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
           <div className="flex items-center gap-2">
                <div className="bg-black text-white p-1.5 rounded-md">
                    <Sparkles className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-base">AI 智能生成调用节点</h3>
                    <p className="text-xs text-gray-500">输入描述或文档，自动创建工作流节点</p>
                </div>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            {!llmAvailable && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <strong>演示模式</strong>
                  <p className="mt-1">LLM 未配置，当前为演示模式。请让超级管理员在设置页面配置 LLM。</p>
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">选择节点类型</label>
              <div className="grid grid-cols-3 gap-2">
                {nodeTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setNodeType(option.id as GenerateNodeType)}
                    className={clsx(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-center",
                      nodeType === option.id
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <option.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{option.label}</span>
                    <span className="text-[10px] text-gray-400">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {nodeType === 'api' && (
              <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                  <button 
                      onClick={() => setInputMode('text')}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        inputMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                  >
                      <FileText className="h-3.5 w-3.5" />
                      粘贴文本 / cURL
                  </button>
                  <button 
                      onClick={() => setInputMode('url')}
                      className={clsx(
                        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                        inputMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      )}
                  >
                      <LinkIcon className="h-3.5 w-3.5" />
                      文档 URL
                  </button>
              </div>
            )}

            <div className="space-y-2">
                {inputMode === 'text' || nodeType !== 'api' ? (
                    <textarea 
                        className="w-full h-40 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-mono focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-400"
                        placeholder={getPlaceholder()}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                    />
                ) : (
                    <div className="space-y-4">
                        <input 
                            type="text"
                            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                            placeholder="https://docs.example.com/api/v1/users"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                        />
                         <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 border border-blue-100">
                             <strong>提示:</strong> AI 将自动解析 URL 和 API 定义。
                         </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-md border border-red-100 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                </div>
            )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
                取消
            </button>
            <button 
                onClick={handleGenerate}
                disabled={isGenerating || !inputValue.trim()}
                className={clsx(
                  "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm",
                  isGenerating || !inputValue.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-black hover:bg-gray-800 hover:shadow-md active:scale-95"
                )}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI 解析中...
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4" />
                        生成节点
                        <ArrowRight className="h-4 w-4 opacity-50" />
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AiGeneratorModal;
