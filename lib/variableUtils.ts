import { WorkflowNode, WorkflowEdge, NodeType, FormField } from '../types';

export interface VariableOption {
  path: string;
  label: string;
  description?: string;
  type: 'trigger' | 'node' | 'function';
  nodeId?: string;
  nodeName?: string;
  nodeType?: NodeType;
  children?: VariableOption[];
}

export interface FormulaFunction {
  name: string;
  description: string;
  syntax: string;
  example: string;
  category: 'string' | 'date' | 'array' | 'utility' | 'math';
}

export const FORMULA_FUNCTIONS: FormulaFunction[] = [
  { name: 'now', description: '当前时间戳', syntax: 'now()', example: '{{now()}}', category: 'date' },
  { name: 'formatDate', description: '格式化日期', syntax: 'formatDate(date, format)', example: '{{formatDate(now(), "YYYY-MM-DD")}}', category: 'date' },
  { name: 'upper', description: '转大写', syntax: 'upper(str)', example: '{{upper(steps.n1.name)}}', category: 'string' },
  { name: 'lower', description: '转小写', syntax: 'lower(str)', example: '{{lower(steps.n1.name)}}', category: 'string' },
  { name: 'trim', description: '去除首尾空格', syntax: 'trim(str)', example: '{{trim(steps.n1.name)}}', category: 'string' },
  { name: 'concat', description: '字符串连接', syntax: 'concat(str1, str2, ...)', example: '{{concat("Hello ", steps.n1.name)}}', category: 'string' },
  { name: 'substring', description: '截取字符串', syntax: 'substring(str, start, end)', example: '{{substring(steps.n1.name, 0, 10)}}', category: 'string' },
  { name: 'replace', description: '替换字符串', syntax: 'replace(str, search, replace)', example: '{{replace(steps.n1.text, "old", "new")}}', category: 'string' },
  { name: 'length', description: '数组/字符串长度', syntax: 'length(arr)', example: '{{length(steps.n1.items)}}', category: 'array' },
  { name: 'first', description: '数组第一个元素', syntax: 'first(arr)', example: '{{first(steps.n1.items)}}', category: 'array' },
  { name: 'last', description: '数组最后一个元素', syntax: 'last(arr)', example: '{{last(steps.n1.items)}}', category: 'array' },
  { name: 'join', description: '数组连接为字符串', syntax: 'join(arr, separator)', example: '{{join(steps.n1.tags, ",")}}', category: 'array' },
  { name: 'split', description: '字符串分割为数组', syntax: 'split(str, separator)', example: '{{split(steps.n1.text, ",")}}', category: 'array' },
  { name: 'default', description: '默认值', syntax: 'default(val, defaultVal)', example: '{{default(steps.n1.name, "N/A")}}', category: 'utility' },
  { name: 'random', description: '随机数 (0-1)', syntax: 'random()', example: '{{random()}}', category: 'math' },
  { name: 'randomInt', description: '随机整数', syntax: 'randomInt(min, max)', example: '{{randomInt(1, 100)}}', category: 'math' },
  { name: 'uuid', description: '生成 UUID', syntax: 'uuid()', example: '{{uuid()}}', category: 'utility' },
  { name: 'base64', description: 'Base64 编码', syntax: 'base64(str)', example: '{{base64(steps.n1.data)}}', category: 'utility' },
  { name: 'base64Decode', description: 'Base64 解码', syntax: 'base64Decode(str)', example: '{{base64Decode(steps.n1.encoded)}}', category: 'utility' },
  { name: 'json', description: 'JSON 解析', syntax: 'json(str)', example: '{{json(steps.n1.raw)}}', category: 'utility' },
  { name: 'stringify', description: 'JSON 序列化', syntax: 'stringify(obj)', example: '{{stringify(steps.n1.data)}}', category: 'utility' },
  { name: 'abs', description: '绝对值', syntax: 'abs(num)', example: '{{abs(steps.n1.value)}}', category: 'math' },
  { name: 'round', description: '四舍五入', syntax: 'round(num, decimals)', example: '{{round(steps.n1.value, 2)}}', category: 'math' },
  { name: 'floor', description: '向下取整', syntax: 'floor(num)', example: '{{floor(steps.n1.value)}}', category: 'math' },
  { name: 'ceil', description: '向上取整', syntax: 'ceil(num)', example: '{{ceil(steps.n1.value)}}', category: 'math' },
];

export function getPreviousNodes(
  currentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const visited = new Set<string>();
  const result: WorkflowNode[] = [];

  function findUpstream(nodeId: string) {
    for (const edge of edges) {
      if (edge.target === nodeId && !visited.has(edge.source)) {
        visited.add(edge.source);
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode) {
          result.push(sourceNode);
          findUpstream(edge.source);
        }
      }
    }
  }

  findUpstream(currentNodeId);
  return result;
}

export function getNodeOutputs(node: WorkflowNode): VariableOption[] {
  const baseOutputs: VariableOption[] = [];
  const nodeId = node.id;
  const nodeLabel = node.data.label;
  const nodeType = node.data.type;
  const nodeConfig = node.data.config || {};

  switch (nodeType) {
    case NodeType.START:
      const triggerType = nodeConfig.triggerType || 'webhook';
      
      baseOutputs.push(
        { path: `steps.${nodeId}.body`, label: '请求体', description: '请求体数据', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.query`, label: 'Query 参数', description: 'URL 查询参数', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.headers`, label: '请求头', description: 'HTTP 请求头', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.method`, label: '请求方法', description: 'HTTP 方法', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );

      if (triggerType === 'form' && nodeConfig.formFields && Array.isArray(nodeConfig.formFields)) {
        const formFieldChildren: VariableOption[] = nodeConfig.formFields.map((field: FormField) => {
          if (field.type === 'file') {
            return {
              path: `steps.${nodeId}.body.${field.key}`,
              label: field.label,
              description: `文件字段${field.required ? ' *必填' : ''}${field.multiple ? ' (多文件)' : ''}`,
              type: 'node' as const,
              nodeId,
              nodeName: nodeLabel,
              nodeType,
              children: [
                { 
                  path: `steps.${nodeId}.body.${field.key}`, 
                  label: '文件对象', 
                  description: '完整文件对象',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.name`, 
                  label: '文件名', 
                  description: '原始文件名',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.filename`, 
                  label: '文件名 (alias)', 
                  description: '原始文件名',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.size`, 
                  label: '文件大小', 
                  description: '文件大小 (字节)',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.mimeType`, 
                  label: '文件类型', 
                  description: 'MIME 类型',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.type`, 
                  label: '文件类型 (alias)', 
                  description: 'MIME 类型',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.url`, 
                  label: '文件 URL', 
                  description: '文件访问地址',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
                { 
                  path: `steps.${nodeId}.body.${field.key}.path`, 
                  label: '文件路径', 
                  description: '服务器存储路径',
                  type: 'node' as const, 
                  nodeId, 
                  nodeName: nodeLabel, 
                  nodeType 
                },
              ]
            };
          }
          return {
            path: `steps.${nodeId}.body.${field.key}`,
            label: field.label,
            description: `表单字段 (${field.type})${field.required ? ' *必填' : ''}`,
            type: 'node' as const,
            nodeId,
            nodeName: nodeLabel,
            nodeType,
          };
        });
        
        baseOutputs.push({
          path: `steps.${nodeId}.body`,
          label: '表单字段',
          description: '表单提交的数据',
          type: 'node',
          nodeId,
          nodeName: nodeLabel,
          nodeType,
          children: formFieldChildren,
        });
      }

      if (triggerType === 'schedule') {
        baseOutputs.push({
          path: `steps.${nodeId}.scheduledTime`,
          label: '计划时间',
          description: '触发的时间戳',
          type: 'node',
          nodeId,
          nodeName: nodeLabel,
          nodeType,
        });
      }
      break;

    case NodeType.API_REQUEST:
      baseOutputs.push(
        { path: `steps.${nodeId}.status`, label: '状态码', description: 'HTTP 状态码', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.statusText`, label: '状态文本', description: 'HTTP 状态文本', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { 
          path: `steps.${nodeId}.data`, 
          label: '响应数据', 
          description: '响应体 JSON', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.data`, label: '(根对象)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { path: `steps.${nodeId}.headers`, label: '响应头', description: 'HTTP 响应头', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.PROCESS:
      const outputConfig = nodeConfig.outputConfig;
      
      baseOutputs.push(
        { 
          path: `steps.${nodeId}.output`, 
          label: '完整输出', 
          description: '代码执行返回的完整结果', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.output`, label: '(根对象)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { 
          path: `steps.${nodeId}.result`, 
          label: '处理结果', 
          description: '代码执行返回值', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.result`, label: '(根对象)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        }
      );

      if (outputConfig?.mode === 'custom' && outputConfig.variables && outputConfig.variables.length > 0) {
        const customOutputs: VariableOption[] = outputConfig.variables.map((v: any) => ({
          path: `steps.${nodeId}.${v.name}`,
          label: v.name,
          description: v.description || `${v.type} 类型`,
          type: 'node' as const,
          nodeId,
          nodeName: nodeLabel,
          nodeType,
        }));

        baseOutputs.push({
          path: `steps.${nodeId}.customVariables`,
          label: '所有自定义变量',
          description: '包含所有自定义变量的对象',
          type: 'node',
          nodeId,
          nodeName: nodeLabel,
          nodeType,
          children: customOutputs,
        });

        baseOutputs.push({
          path: `steps.${nodeId}`,
          label: '自定义变量列表',
          description: '逐个访问自定义变量',
          type: 'node',
          nodeId,
          nodeName: nodeLabel,
          nodeType,
          children: customOutputs,
        });
      }
      break;

    case NodeType.LLM:
      baseOutputs.push(
        { path: `steps.${nodeId}.content`, label: 'AI 回复', description: 'AI 生成的内容', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.model`, label: '模型', description: '使用的模型名称', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { 
          path: `steps.${nodeId}.usage`, 
          label: 'Token 使用', 
          description: 'Token 使用统计', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.usage.promptTokens`, label: '提示词 Tokens', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.usage.completionTokens`, label: '完成 Tokens', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.usage.totalTokens`, label: '总计 Tokens', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        }
      );
      break;

    case NodeType.DB_QUERY:
      baseOutputs.push(
        { 
          path: `steps.${nodeId}.rows`, 
          label: '查询结果', 
          description: '查询返回的行', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.rows`, label: '(数组)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { path: `steps.${nodeId}.rowCount`, label: '行数', description: '受影响的行数', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.CONDITION:
      baseOutputs.push(
        { path: `steps.${nodeId}.result`, label: '判断结果', description: '是否有匹配分支', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.matchedBranch`, label: '匹配分支', description: '匹配的分支 ID', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.matchedHandle`, label: '匹配端口', description: '匹配的 handle ID', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.branchType`, label: '分支类型', description: 'if/else_if/else', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.expression`, label: '表达式', description: '判断表达式', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.DELAY:
      baseOutputs.push(
        { path: `steps.${nodeId}.delayed`, label: '延迟时间', description: '延迟的毫秒数', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.completed`, label: '是否完成', description: '是否已完成延迟', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.FILE_PARSER:
      baseOutputs.push(
        { 
          path: `steps.${nodeId}.output`, 
          label: '完整输出', 
          description: '包含文本、数据和元数据', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.output.text`, label: 'text', description: '提取的文本', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.output.data`, label: 'data', description: '数据内容', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.output.metadata`, label: 'metadata', description: '文件元数据', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { path: `steps.${nodeId}.text`, label: '提取文本', description: '提取的文本内容', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.content`, label: '文本内容', description: '文本内容别名', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { 
          path: `steps.${nodeId}.data`, 
          label: '数据', 
          description: '文本或结构化数据', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.data`, label: '(数据)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { 
          path: `steps.${nodeId}.metadata`, 
          label: '元数据', 
          description: '文件元数据', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.metadata.filename`, label: '文件名', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.metadata.size`, label: '文件大小', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.metadata.mimeType`, label: 'MIME类型', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.metadata.pages`, label: '页数', description: 'PDF专用', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
            { path: `steps.${nodeId}.metadata.sheets`, label: '工作表数', description: 'Excel专用', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        }
      );
      break;

    case NodeType.LOOP:
      baseOutputs.push(
        { 
          path: `steps.${nodeId}.results`, 
          label: '迭代结果', 
          description: '每次迭代的结果数组', 
          type: 'node', 
          nodeId, 
          nodeName: nodeLabel, 
          nodeType,
          children: [
            { path: `steps.${nodeId}.results`, label: '(数组)', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          ]
        },
        { path: `steps.${nodeId}.count`, label: '循环次数', description: '实际执行的迭代次数', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.firstResult`, label: '首次结果', description: '第一次迭代结果', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.lastResult`, label: '末次结果', description: '最后一次迭代结果', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.END:
      baseOutputs.push(
        { path: `steps.${nodeId}.status`, label: '响应状态', description: 'HTTP 响应状态码', type: 'node', nodeId, nodeName: nodeLabel, nodeType },
        { path: `steps.${nodeId}.body`, label: '响应体', description: 'HTTP 响应体', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
      break;

    case NodeType.PRESET_DATA:
      const presetConfig = nodeConfig.presetDataConfig;
      if (presetConfig?.mode === 'dynamic' && presetConfig.fields && presetConfig.fields.length > 0) {
        const fieldOutputs: VariableOption[] = presetConfig.fields.map((f: any) => ({
          path: `steps.${nodeId}.${f.key}`,
          label: f.key,
          description: `${f.type} 类型`,
          type: 'node' as const,
          nodeId,
          nodeName: nodeLabel,
          nodeType,
        }));
        baseOutputs.push(...fieldOutputs);
      } else {
        const presetData = nodeConfig.presetData || {};
        const dataKeys = typeof presetData === 'object' ? Object.keys(presetData) : [];
        if (dataKeys.length > 0) {
          const dataChildren: VariableOption[] = dataKeys.map(key => ({
            path: `steps.${nodeId}.${key}`,
            label: key,
            type: 'node' as const,
            nodeId,
            nodeName: nodeLabel,
            nodeType,
          }));
          baseOutputs.push(
            { 
              path: `steps.${nodeId}`, 
              label: '预设数据', 
              description: '预设的数据对象', 
              type: 'node', 
              nodeId, 
              nodeName: nodeLabel, 
              nodeType,
              children: dataChildren
            }
          );
        } else {
          baseOutputs.push(
            { path: `steps.${nodeId}`, label: '预设数据', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
          );
        }
      }
      break;

    default:
      baseOutputs.push(
        { path: `steps.${nodeId}.data`, label: '输出数据', type: 'node', nodeId, nodeName: nodeLabel, nodeType }
      );
  }

  return baseOutputs;
}

export function getTriggerOutputs(): VariableOption[] {
  return [
    { 
      path: 'trigger.body', 
      label: '请求体', 
      description: '请求体数据 (JSON)', 
      type: 'trigger',
      children: [
        { path: 'trigger.body', label: '(根对象)', type: 'trigger' }
      ]
    },
    { path: 'trigger.query', label: 'Query 参数', description: 'URL 查询参数', type: 'trigger' },
    { path: 'trigger.headers', label: '请求头', description: 'HTTP 请求头', type: 'trigger' },
    { path: 'trigger.method', label: '请求方法', description: 'HTTP 方法 (GET/POST/...)', type: 'trigger' },
    { path: 'trigger.path', label: '请求路径', description: 'URL 路径', type: 'trigger' },
    { path: 'trigger.ip', label: '客户端 IP', description: '客户端 IP 地址', type: 'trigger' }
  ];
}

export function getGlobalOutputs(): VariableOption[] {
  return [
    { path: 'globals.workflowId', label: '工作流 ID', description: '当前工作流的 ID', type: 'trigger' },
    { path: 'globals.executionId', label: '执行 ID', description: '当前执行的 ID', type: 'trigger' },
    { path: 'globals.timestamp', label: '时间戳', description: '执行时间戳', type: 'trigger' },
    { path: 'globals.env', label: '环境变量', description: '系统环境变量', type: 'trigger' }
  ];
}

export function getAllVariables(
  currentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): {
  trigger: VariableOption[];
  nodes: { node: WorkflowNode; outputs: VariableOption[] }[];
  functions: FormulaFunction[];
} {
  const previousNodes = getPreviousNodes(currentNodeId, nodes, edges);
  
  return {
    trigger: getTriggerOutputs(),
    nodes: previousNodes.map(node => ({
      node,
      outputs: getNodeOutputs(node)
    })),
    functions: FORMULA_FUNCTIONS
  };
}

export function searchVariables(
  variables: ReturnType<typeof getAllVariables>,
  searchTerm: string
): {
  trigger: VariableOption[];
  nodes: { node: WorkflowNode; outputs: VariableOption[] }[];
  functions: FormulaFunction[];
} {
  const term = searchTerm.toLowerCase();
  
  const filterOutputs = (outputs: VariableOption[]): VariableOption[] => {
    return outputs.filter(output => 
      output.label.toLowerCase().includes(term) ||
      output.path.toLowerCase().includes(term) ||
      output.description?.toLowerCase().includes(term)
    );
  };

  return {
    trigger: filterOutputs(variables.trigger),
    nodes: variables.nodes.map(({ node, outputs }) => ({
      node,
      outputs: filterOutputs(outputs)
    })).filter(({ outputs }) => outputs.length > 0),
    functions: variables.functions.filter(func =>
      func.name.toLowerCase().includes(term) ||
      func.description.toLowerCase().includes(term)
    )
  };
}

export function formatVariable(path: string): string {
  return `{{${path}}}`;
}

export function getNodeTypeIcon(type: NodeType): string {
  switch (type) {
    case NodeType.START: return '🚀';
    case NodeType.API_REQUEST: return '🌐';
    case NodeType.PROCESS: return '⚡';
    case NodeType.CONDITION: return '🔀';
    case NodeType.LLM: return '🤖';
    case NodeType.DELAY: return '⏱️';
    case NodeType.DB_QUERY: return '🗄️';
    case NodeType.FILE_PARSER: return '📄';
    case NodeType.LOOP: return '🔄';
    case NodeType.END: return '🏁';
    default: return '📦';
  }
}

export function getNodeTypeLabel(type: NodeType): string {
  switch (type) {
    case NodeType.START: return '触发器';
    case NodeType.API_REQUEST: return 'HTTP请求';
    case NodeType.PROCESS: return '代码处理';
    case NodeType.CONDITION: return '条件判断';
    case NodeType.LLM: return 'AI模型';
    case NodeType.DELAY: return '延时';
    case NodeType.DB_QUERY: return '数据库';
    case NodeType.FILE_PARSER: return '文件解析';
    case NodeType.LOOP: return '循环';
    case NodeType.END: return '结束';
    default: return '节点';
  }
}
