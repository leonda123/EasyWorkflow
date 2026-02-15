import React, { useState } from 'react';
import { X, Sparkles, Send, FileText, Link as LinkIcon, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { useFlowStore } from '../../store/useFlowStore';
import { NodeType, NodeStatus } from '../../types';

interface AiGeneratorModalProps {
  onClose: () => void;
}

const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({ onClose }) => {
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'file'>('text');
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addNode } = useFlowStore();

  const handleGenerate = async () => {
    if (!inputValue.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      // 1. Initialize Gemini Client
      // Note: In a real environment, process.env.API_KEY would be populated.
      // If missing, we'll fall back to a simulation for the demo.
      const apiKey = process.env.API_KEY;
      
      let generatedData: any = null;

      if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          
          const systemInstruction = `
            You are an expert API integration assistant. 
            Your task is to parse the user's input (which could be a cURL command, API documentation snippet, or natural language description) 
            and convert it into a structured configuration for an HTTP Request Node.
            
            Return ONLY a JSON object. No markdown formatting.
          `;

          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: inputValue,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "A short, concise name for the node (e.g. 'Create User')" },
                  description: { type: Type.STRING, description: "Brief description of what this request does" },
                  method: { type: Type.STRING, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
                  url: { type: Type.STRING },
                  headers: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        key: { type: Type.STRING },
                        value: { type: Type.STRING }
                      }
                    }
                  },
                  params: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                          key: { type: Type.STRING },
                          value: { type: Type.STRING }
                        }
                      }
                  },
                  body: { type: Type.STRING, description: "JSON string of the request body if applicable" }
                },
                required: ['label', 'method', 'url']
              }
            }
          });
          
          if (response.text) {
             generatedData = JSON.parse(response.text);
          }
      } else {
          // --- FALLBACK MOCK SIMULATION (For Demo without API Key) ---
          console.warn("No API Key found. Using mock generation.");
          await new Promise(r => setTimeout(r, 1500)); // Fake latency
          
          // Simple heuristic mock based on input
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
      }

      if (generatedData) {
          // 2. Add Node to Flow
          const newNode = {
            id: `api-${Date.now()}`,
            type: 'custom',
            position: { x: 250 + Math.random() * 100, y: 100 + Math.random() * 100 }, // Random offset
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

          // @ts-ignore
          addNode(newNode);
          onClose();
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
           <div className="flex items-center gap-2">
                <div className="bg-black text-white p-1.5 rounded-md">
                    <Sparkles className="h-4 w-4" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 text-base">AI 智能生成节点</h3>
                    <p className="text-xs text-gray-500">输入 API 文档或 cURL，自动创建 HTTP 请求节点</p>
                </div>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-colors">
             <X className="h-5 w-5" />
           </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            
            {/* Input Type Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg w-fit">
                <button 
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText className="h-3.5 w-3.5" />
                    粘贴文本 / cURL
                </button>
                <button 
                    onClick={() => setInputMode('url')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${inputMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LinkIcon className="h-3.5 w-3.5" />
                    文档 URL
                </button>
            </div>

            <div className="space-y-2">
                {inputMode === 'text' ? (
                    <textarea 
                        className="w-full h-48 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm font-mono focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all placeholder:text-gray-400"
                        placeholder={`例如:\ncurl -X POST https://api.stripe.com/v1/charges \\\n  -u sk_test_4eC39Hq: \\\n  -d amount=2000 \\\n  -d currency=usd`}
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
                             <strong>提示:</strong> AI 将自动抓取并解析网页中的 API 定义。
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

        {/* Footer */}
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
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm
                    ${isGenerating || !inputValue.trim() 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-black hover:bg-gray-800 hover:shadow-md active:scale-95 bg-gradient-to-r from-gray-900 to-gray-800'
                    }`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI 解析中...
                    </>
                ) : (
                    <>
                        <Sparkles className="h-4 w-4 fill-blue-400 text-blue-400" />
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