import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, Loader2, RefreshCw, Zap, Maximize2, Minimize2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { useFlowStore } from '../../store/useFlowStore';
import { clsx } from 'clsx';
import { NodeType, NodeStatus } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const McpCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好！我是 MCP 智能助手。我可以帮你修改工作流、添加节点或优化配置。请告诉我你想做什么？',
      timestamp: Date.now()
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, setGraph } = useFlowStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 1. Prepare Context (Current Graph State)
      // Simplify data to save tokens: remove logs, large descriptions, UI state
      const graphContext = {
        nodes: nodes.map(n => ({
            id: n.id,
            type: n.data.type,
            label: n.data.label,
            position: n.position,
            // Keep minimal config
            config: n.data.config
        })),
        edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target
        }))
      };

      // 2. System Prompt
      const systemInstruction = `
        You are an advanced MCP (Model Context Protocol) Agent capable of modifying workflow graphs.
        
        Current Workflow Context (JSON):
        ${JSON.stringify(graphContext)}

        Available Node Types:
        - start (Trigger)
        - api (HTTP Request)
        - process (JS Code)
        - condition (If/Else)
        - llm (AI Model)
        - delay (Wait/Sleep)
        - db (Database Query)
        - end (Response)

        Task:
        Based on the User's Request, generate a NEW JSON object containing updated 'nodes' and 'edges'.
        
        Rules:
        1. PRESERVE existing node IDs and positions unless explicitly asked to reorganize or delete.
        2. When adding new nodes, generate unique IDs (e.g., 'node-<timestamp>').
        3. Determine intelligent positions (x, y) for new nodes so they don't overlap too much (e.g., add offset to previous node).
        4. Maintain logical connections (edges).
        5. Return ONLY the JSON object. No markdown blocks.
        6. If the user asks for a complex modification, do your best to implement the logic.
      `;

      const apiKey = process.env.API_KEY;
      let responseText = '';
      let newGraphData: any = null;

      if (apiKey) {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userMsg.content,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
            }
          });
          responseText = response.text || '';
          if (responseText) {
            newGraphData = JSON.parse(responseText);
          }
      } else {
          // --- MOCK LOGIC for Demo without API Key ---
          await new Promise(r => setTimeout(r, 1500));
          
          // Simple heuristics for demo purposes
          const lowerInput = userMsg.content.toLowerCase();
          let mockNodes: any[] = [...graphContext.nodes];
          let mockEdges: any[] = [...graphContext.edges];

          if (lowerInput.includes('clear') || lowerInput.includes('delete all')) {
             mockNodes = [];
             mockEdges = [];
             responseText = "已清空所有节点。";
          } else if (lowerInput.includes('add') || lowerInput.includes('create')) {
              // Add a generic node
              const newNodeId = `node-${Date.now()}`;
              const lastNode = mockNodes[mockNodes.length - 1];
              const newPos = lastNode ? { x: lastNode.position.x + 250, y: lastNode.position.y } : { x: 100, y: 100 };
              
              let type: NodeType = NodeType.PROCESS;
              let label = "New Node";
              
              if (lowerInput.includes('delay')) { type = NodeType.DELAY; label = "Delay"; }
              else if (lowerInput.includes('db')) { type = NodeType.DB_QUERY; label = "Database"; }
              else if (lowerInput.includes('llm') || lowerInput.includes('ai')) { type = NodeType.LLM; label = "AI Model"; }
              else if (lowerInput.includes('api')) { type = NodeType.API_REQUEST; label = "HTTP Request"; }

              mockNodes.push({
                  id: newNodeId,
                  type: 'custom', // React Flow type
                  data: { type, label, status: NodeStatus.IDLE, config: {} }, // Our data type
                  position: newPos
              } as any);

              // Connect to previous if exists
              if (lastNode) {
                  mockEdges.push({
                      id: `e-${lastNode.id}-${newNodeId}`,
                      source: lastNode.id,
                      target: newNodeId,
                      type: 'smoothstep',
                      animated: true,
                      style: { stroke: '#94a3b8', strokeWidth: 2 }
                  });
              }
              responseText = `已添加 ${label} 节点并连接。`;
          } else {
              responseText = "这是演示模式。请输入 'add delay node' 或 'clear all' 来测试效果。（真实效果需配置 API Key）";
          }

          if (mockNodes.length !== graphContext.nodes.length || mockEdges.length !== graphContext.edges.length) {
              newGraphData = { nodes: mockNodes, edges: mockEdges };
          }
      }

      // 3. Apply Changes
      if (newGraphData && newGraphData.nodes && newGraphData.edges) {
          // Need to reconstruct full node objects (adding back UI-specific fields if lost, though store handles simple objects)
          // Ensure structure matches WorkflowNode
          const reconstructedNodes = newGraphData.nodes.map((n: any) => ({
              ...n,
              type: 'custom', // Force custom type for UI rendering
              data: {
                  ...n.data, // Should contain label, type, config
                  type: n.data?.type || n.type || 'process', // Fallback
                  label: n.data?.label || n.label || 'Node',
                  status: NodeStatus.IDLE, // Reset status
              }
          }));

          setGraph(reconstructedNodes, newGraphData.edges);
          
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ 已根据您的要求更新工作流。\n• 节点数: ${newGraphData.nodes.length}\n• 连接数: ${newGraphData.edges.length}`,
            timestamp: Date.now()
          }]);
      } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: responseText || "无法理解您的指令或未生成有效变更。",
            timestamp: Date.now()
          }]);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ 处理请求时发生错误。',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Minimized Floating Button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-black text-white shadow-lg transition-transform hover:scale-105 hover:bg-gray-800 active:scale-95 animate-in zoom-in duration-300"
        title="MCP 智能助手"
      >
        <Bot className="h-7 w-7" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
        </span>
      </button>
    );
  }

  return (
    <div 
        className={clsx(
            "absolute z-40 flex flex-col overflow-hidden bg-white shadow-2xl transition-all duration-300 ease-in-out border border-gray-200",
            isExpanded 
                ? "top-4 right-4 bottom-20 left-1/2 rounded-xl" // Large mode
                : "bottom-6 right-6 h-[500px] w-[380px] rounded-2xl" // Default mode
        )}
    >
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-800 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-yellow-300" />
            <h3 className="text-sm font-bold">MCP 智能助手 (Copilot)</h3>
        </div>
        <div className="flex items-center gap-1">
             <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="rounded p-1 hover:bg-white/10 text-gray-300 transition-colors"
             >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
             </button>
             <button 
                onClick={() => setIsOpen(false)} 
                className="rounded p-1 hover:bg-white/10 text-gray-300 transition-colors"
             >
                <X className="h-4 w-4" />
             </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex w-full",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
                msg.role === 'user'
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800 border border-gray-100"
              )}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={clsx("text-[10px] mt-1 text-right", msg.role === 'user' ? "text-blue-100" : "text-gray-400")}>
                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-lg px-4 py-3 shadow-sm flex items-center gap-2 text-xs text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                    正在思考并生成 JSON...
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-3">
        {/* Suggestion Chips */}
        {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-1 no-scrollbar">
                <button onClick={() => setInput("Add a delay node after the last node")} className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-[10px] text-gray-600 hover:bg-gray-200 border border-gray-200">
                    + 增加延时节点
                </button>
                <button onClick={() => setInput("Connect a Database Query node to Start")} className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-[10px] text-gray-600 hover:bg-gray-200 border border-gray-200">
                    + 连接数据库节点
                </button>
                <button onClick={() => setInput("Clear all nodes")} className="whitespace-nowrap rounded-full bg-gray-100 px-3 py-1 text-[10px] text-gray-600 hover:bg-gray-200 border border-gray-200">
                    清空画布
                </button>
            </div>
        )}
        
        <div className="relative">
            <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入指令，例如：'添加一个数据库查询节点'..."
            rows={1}
            className="w-full resize-none rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[40px] max-h-[120px]"
            />
            <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-1.5 top-1.5 rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 transition-colors"
            >
            <Send className="h-4 w-4" />
            </button>
        </div>
        <div className="mt-1.5 text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
             <Zap className="h-3 w-3" />
             Powered by Gemini 2.5 • MCP Protocol
        </div>
      </div>
    </div>
  );
};

export default McpCopilot;