import React, { useMemo } from 'react';
import { FileText, Variable, Upload, FileJson, AlertCircle, Copy, Check } from 'lucide-react';
import { FileParserConfig, NodeType } from '../../../types';

interface FileParserNodeConfigProps {
  config: any;
  onChange: (key: string, value: any) => void;
  nodeId: string;
  nodes: any[];
  edges: any[];
}

interface VariableOption {
  path: string;
  label: string;
  nodeId: string;
  nodeLabel: string;
  type: 'file' | 'data' | 'output';
}

const FileParserNodeConfig: React.FC<FileParserNodeConfigProps> = ({
  config,
  onChange,
  nodeId,
  nodes,
  edges,
}) => {
  const fileParserConfig: FileParserConfig = config.fileParserConfig || {
    fileSource: '',
    outputFormat: 'text',
    extractMetadata: true,
  };

  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = (field: string) => {
    const variablePath = `{{steps.${nodeId}${field}}}`;
    navigator.clipboard.writeText(variablePath);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfigChange = (key: keyof FileParserConfig, value: any) => {
    onChange('fileParserConfig', {
      ...fileParserConfig,
      [key]: value,
    });
  };

  const getUpstreamNodes = useMemo(() => {
    const upstreamNodeIds = new Set<string>();
    
    const findUpstream = (currentId: string, visited: Set<string>) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      
      edges.forEach(edge => {
        if (edge.target === currentId) {
          upstreamNodeIds.add(edge.source);
          findUpstream(edge.source, visited);
        }
      });
    };
    
    findUpstream(nodeId, new Set());
    return Array.from(upstreamNodeIds);
  }, [nodeId, edges]);

  const availableVariables: VariableOption[] = useMemo(() => {
    const variables: VariableOption[] = [];
    
    getUpstreamNodes.forEach(upstreamId => {
      const node = nodes.find(n => n.id === upstreamId);
      if (!node) return;
      
      const nodeLabel = node.data?.label || node.id;
      const nodeType = node.data?.type;
      
      if (nodeType === NodeType.START) {
        const formFields = node.data?.config?.formFields || [];
        const fileFields = formFields.filter((f: any) => f.type === 'file');
        
        if (fileFields.length > 0) {
          fileFields.forEach((field: any) => {
            variables.push({
              path: `{{steps.${node.id}.body.${field.key}}}`,
              label: `${nodeLabel} - ${field.label || field.key}`,
              nodeId: node.id,
              nodeLabel,
              type: 'file',
            });
          });
        } else {
          variables.push({
            path: `{{steps.${node.id}.body.file}}`,
            label: `${nodeLabel} - 上传文件`,
            nodeId: node.id,
            nodeLabel,
            type: 'file',
          });
        }
        
        variables.push({
          path: `{{steps.${node.id}.body}}`,
          label: `${nodeLabel} - 完整表单数据`,
          nodeId: node.id,
          nodeLabel,
          type: 'data',
        });
      } else if (nodeType === NodeType.FILE_PARSER) {
        variables.push({
          path: `{{steps.${node.id}.text}}`,
          label: `${nodeLabel} - 解析文本`,
          nodeId: node.id,
          nodeLabel,
          type: 'output',
        });
        variables.push({
          path: `{{steps.${node.id}}}`,
          label: `${nodeLabel} - 完整输出`,
          nodeId: node.id,
          nodeLabel,
          type: 'output',
        });
      } else if (nodeType === NodeType.API_REQUEST) {
        variables.push({
          path: `{{steps.${node.id}.body}}`,
          label: `${nodeLabel} - 响应数据`,
          nodeId: node.id,
          nodeLabel,
          type: 'data',
        });
      } else if (nodeType === NodeType.LLM) {
        variables.push({
          path: `{{steps.${node.id}.content}}`,
          label: `${nodeLabel} - 生成内容`,
          nodeId: node.id,
          nodeLabel,
          type: 'output',
        });
      } else {
        variables.push({
          path: `{{steps.${node.id}}}`,
          label: `${nodeLabel} - 输出数据`,
          nodeId: node.id,
          nodeLabel,
          type: 'output',
        });
      }
    });
    
    return variables;
  }, [getUpstreamNodes, nodes]);

  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableOption[]> = {};
    availableVariables.forEach(v => {
      if (!groups[v.nodeId]) {
        groups[v.nodeId] = [];
      }
      groups[v.nodeId].push(v);
    });
    return groups;
  }, [availableVariables]);

  const getVariableIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <Upload className="h-3 w-3 text-orange-500" />;
      case 'data':
        return <FileJson className="h-3 w-3 text-blue-500" />;
      default:
        return <Variable className="h-3 w-3 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-2">
          <FileText className="h-3 w-3" />
          文件来源
        </label>
        <p className="text-[10px] text-gray-500 mb-2">
          根据连线自动检测前置节点，选择文件变量
        </p>
        
        {Object.keys(groupedVariables).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(groupedVariables).map(([nodeId, vars]) => (
              <div key={nodeId} className="border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200">
                  <span className="text-[10px] font-medium text-gray-600">
                    {vars[0]?.nodeLabel || nodeId}
                  </span>
                </div>
                <div className="p-2 space-y-1">
                  {vars.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => handleConfigChange('fileSource', v.path)}
                      className={`w-full text-left px-2 py-1.5 rounded border text-xs transition-all ${
                        fileParserConfig.fileSource === v.path
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-transparent hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {getVariableIcon(v.type)}
                        <span>{v.label}</span>
                      </div>
                      <code className="text-[9px] text-gray-400 mt-0.5 block truncate">
                        {v.path}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-amber-600 bg-amber-50 rounded-md p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">未检测到前置节点</p>
              <p className="text-[10px] text-amber-600/80 mt-1">
                请确保已从其他节点连线到此文件解析节点
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-3">
          <label className="text-[10px] text-gray-500 mb-1 block">或手动输入变量路径</label>
          <input
            type="text"
            value={fileParserConfig.fileSource || ''}
            onChange={(e) => handleConfigChange('fileSource', e.target.value)}
            placeholder="{{steps.start-1.body.file}}"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          输出格式
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => handleConfigChange('outputFormat', 'text')}
            className={`flex-1 px-3 py-2 rounded-md border text-xs transition-all ${
              fileParserConfig.outputFormat === 'text'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            纯文本
          </button>
          <button
            onClick={() => handleConfigChange('outputFormat', 'structured')}
            className={`flex-1 px-3 py-2 rounded-md border text-xs transition-all ${
              fileParserConfig.outputFormat === 'structured'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 text-gray-700'
            }`}
          >
            结构化数据
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-1">
          结构化数据会保留表格格式（Excel）或分段信息
        </p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={fileParserConfig.extractMetadata ?? true}
            onChange={(e) => handleConfigChange('extractMetadata', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          提取文件元数据
        </label>
        <p className="text-[10px] text-gray-500 mt-1 ml-5">
          包括文件名、大小、页数等信息
        </p>
      </div>

      <div className="bg-gray-50 rounded-md p-3">
        <h4 className="text-xs font-medium text-gray-700 mb-2">支持的文件类型</h4>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            PDF (.pdf)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            Word (.docx)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Excel (.xlsx, .xls)
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            文本 (.txt, .md)
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-md p-3">
        <h4 className="text-xs font-medium text-blue-700 mb-2">输出变量（点击复制）</h4>
        <div className="space-y-1 text-[10px] text-blue-600">
          <button
            onClick={() => copyToClipboard('.output')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors group"
          >
            <code className="bg-blue-100 px-1 rounded">.output</code>
            <span className="font-medium">完整输出（推荐）</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedField === '.output' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </span>
          </button>
          <button
            onClick={() => copyToClipboard('.text')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors group"
          >
            <code className="bg-blue-100 px-1 rounded">.text</code>
            <span>提取的文本内容</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedField === '.text' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </span>
          </button>
          <button
            onClick={() => copyToClipboard('.data')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors group"
          >
            <code className="bg-blue-100 px-1 rounded">.data</code>
            <span>文本内容或结构化数据</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedField === '.data' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </span>
          </button>
          <button
            onClick={() => copyToClipboard('.metadata')}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-blue-100 transition-colors group"
          >
            <code className="bg-blue-100 px-1 rounded">.metadata</code>
            <span>文件元数据（名称、大小等）</span>
            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
              {copiedField === '.metadata' ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            </span>
          </button>
        </div>
        {copiedField && (
          <div className="mt-2 text-[10px] text-green-600 flex items-center gap-1">
            <Check className="h-3 w-3" />
            已复制: {`{{steps.${nodeId}${copiedField}}}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileParserNodeConfig;
