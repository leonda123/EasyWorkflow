import { WorkflowNode, NodeType } from '../types';

export const generateExampleValue = (path: string, nodes: WorkflowNode[]): any => {
    const pathParts = path.split('.');
    
    if (pathParts.length < 2) return "示例值";
    
    const nodeId = pathParts[1];
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) return "示例值";
    
    const nodeType = node.data?.type;
    const nodeConfig = node.data?.config || {};
    const field = pathParts.slice(2).join('.');
    
    switch (nodeType) {
        case NodeType.START:
            if (field === 'body') {
                const formFields = nodeConfig.formFields || [];
                if (formFields.length > 0) {
                    const bodyExample: any = {};
                    formFields.forEach((f: any) => {
                        if (f.type === 'number') bodyExample[f.key] = 123;
                        else if (f.type === 'boolean') bodyExample[f.key] = true;
                        else if (f.type === 'file') bodyExample[f.key] = { name: "example.pdf", size: 1024 };
                        else bodyExample[f.key] = `示例${f.label || f.key}`;
                    });
                    return bodyExample;
                }
                return { input: "示例输入值" };
            }
            if (field === 'query') {
                return { page: 1, size: 10 };
            }
            if (field === 'headers') {
                return { "Content-Type": "application/json" };
            }
            if (field === 'method') {
                return "POST";
            }
            if (field.startsWith('body.')) {
                const fieldName = field.replace('body.', '');
                return `示例${fieldName}`;
            }
            return { data: "示例数据" };
            
        case NodeType.API_REQUEST:
            if (field === 'status') return 200;
            if (field === 'statusText') return "OK";
            if (field === 'data' || field === 'body') {
                return { result: "API响应数据", success: true };
            }
            if (field === 'headers') {
                return { "content-type": "application/json" };
            }
            return { result: "API响应数据" };
            
        case NodeType.LLM:
            if (field === 'content') return "这是AI生成的内容示例文本，可以根据用户的需求生成各种类型的内容。";
            if (field === 'model') return "gpt-4";
            if (field === 'usage') {
                return { promptTokens: 150, completionTokens: 80, totalTokens: 230 };
            }
            if (field.startsWith('usage.')) {
                const usageField = field.split('.')[1];
                if (usageField === 'promptTokens') return 150;
                if (usageField === 'completionTokens') return 80;
                if (usageField === 'totalTokens') return 230;
            }
            return "AI生成的内容示例";
            
        case NodeType.DB_QUERY:
            if (field === 'rows') {
                return [
                    { id: 1, name: "示例数据1", created_at: "2026-02-23" },
                    { id: 2, name: "示例数据2", created_at: "2026-02-23" }
                ];
            }
            if (field === 'rowCount') return 2;
            return [{ id: 1, name: "示例数据" }];
            
        case NodeType.PROCESS:
            if (field === 'output' || field === 'result') {
                return { processed: true, data: "处理后的数据" };
            }
            if (field === 'customVariables') {
                const outputConfig = nodeConfig.outputConfig;
                if (outputConfig?.mode === 'custom' && outputConfig.variables?.length > 0) {
                    const customExample: any = {};
                    outputConfig.variables.forEach((v: any) => {
                        if (v.type === 'number') customExample[v.name] = 100;
                        else if (v.type === 'boolean') customExample[v.name] = true;
                        else if (v.type === 'array') customExample[v.name] = ["item1", "item2"];
                        else if (v.type === 'object') customExample[v.name] = { key: "value" };
                        else customExample[v.name] = `示例${v.description || v.name}`;
                    });
                    return customExample;
                }
                return { result: "自定义变量示例", count: 10, success: true };
            }
            if (field.startsWith('customVariables.')) {
                const varName = field.replace('customVariables.', '');
                const outputConfig = nodeConfig.outputConfig;
                if (outputConfig?.mode === 'custom' && outputConfig.variables) {
                    const variable = outputConfig.variables.find((v: any) => v.name === varName);
                    if (variable) {
                        if (variable.type === 'number') return 100;
                        if (variable.type === 'boolean') return true;
                        if (variable.type === 'array') return ["item1", "item2"];
                        if (variable.type === 'object') return { key: "value" };
                        return `示例${variable.description || variable.name}`;
                    }
                }
                return `示例${varName}`;
            }
            if (field === 'output' || field === 'result') {
                return { processed: true, data: "处理后的数据" };
            }
            if (!field) {
                return { output: { processed: true }, customVariables: { result: "示例值" } };
            }
            return "处理结果示例";
            
        case NodeType.CONDITION:
            if (field === 'result') return true;
            if (field === 'matchedBranch') return "branch_1";
            if (field === 'matchedHandle') return "true";
            if (field === 'branchType') return "if";
            if (field === 'expression') return "value > 10";
            return true;
            
        case NodeType.DELAY:
            if (field === 'delayed') return 5000;
            if (field === 'completed') return true;
            return true;
            
        case NodeType.FILE_PARSER:
            if (field === 'text' || field === 'content') {
                return "这是从文件中提取的文本内容示例...";
            }
            if (field === 'data') {
                return { content: "文件数据内容" };
            }
            if (field === 'metadata') {
                return { 
                    filename: "example.pdf", 
                    size: 10240, 
                    mimeType: "application/pdf",
                    pages: 5
                };
            }
            if (field === 'output') {
                return {
                    text: "提取的文本内容",
                    data: { content: "文件数据" },
                    metadata: { filename: "example.pdf", size: 10240 }
                };
            }
            return "文件解析结果示例";
            
        case NodeType.PRESET_DATA:
            return { preset: "预设数据示例" };
            
        case NodeType.LOOP:
            if (field === 'currentItem') return "当前循环项";
            if (field === 'index') return 0;
            if (field === 'count') return 10;
            return { item: "循环项" };
            
        case NodeType.WORKFLOW_CALL:
            return { result: "子工作流执行结果" };
            
        default:
            return "示例值";
    }
};

export const substituteVariables = (template: string, nodes: WorkflowNode[]): string => {
    let result = template;
    
    const functionRegex = /\{\{(now\(\))\}\}/g;
    result = result.replace(functionRegex, () => {
        return `"${new Date().toISOString()}"`;
    });
    
    const formatDateRegex = /\{\{formatDate\(([^)]+)\)\}\}/g;
    result = result.replace(formatDateRegex, () => {
        return `"${new Date().toISOString().split('T')[0]}"`;
    });
    
    const lengthRegex = /\{\{length\(([^)]+)\)\}\}/g;
    result = result.replace(lengthRegex, () => "10");
    
    const uuidRegex = /\{\{uuid\(\)\}\}/g;
    result = result.replace(uuidRegex, () => {
        const uuid = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { 
                const r = Math.random() * 16 | 0; 
                const v = c === 'x' ? r : (r & 0x3 | 0x8); 
                return v.toString(16); 
            });
        return `"${uuid}"`;
    });
    
    const variableRegex = /\{\{steps\.([a-zA-Z0-9_\-]+)(?:\.([a-zA-Z0-9_\-\.]+))?\}\}/g;
    result = result.replace(variableRegex, (match, nodeId, field) => {
        const path = field ? `steps.${nodeId}.${field}` : `steps.${nodeId}`;
        const value = generateExampleValue(path, nodes);
        
        if (typeof value === 'string') {
            return `"${value}"`;
        }
        return JSON.stringify(value);
    });
    
    const triggerRegex = /\{\{trigger\.([a-zA-Z0-9_\-\.]+)\}\}/g;
    result = result.replace(triggerRegex, (match, field) => {
        if (field === 'body') {
            return JSON.stringify({ input: "触发器输入" });
        }
        return `"示例${field}"`;
    });
    
    return result;
};

export const formatJsonPreview = (template: string, nodes: WorkflowNode[]): string => {
    if (!template?.trim()) {
        return '{\n  "message": "请配置响应内容"\n}';
    }
    
    try {
        const substituted = substituteVariables(template, nodes);
        const parsed = JSON.parse(substituted);
        return JSON.stringify(parsed, null, 2);
    } catch {
        try {
            const substituted = substituteVariables(template, nodes);
            return substituted;
        } catch {
            return template;
        }
    }
};

export const getNodesFromDefinition = (definition: any): WorkflowNode[] => {
    if (!definition) return [];
    if (Array.isArray(definition.nodes)) {
        return definition.nodes as WorkflowNode[];
    }
    if (Array.isArray(definition)) {
        return definition as WorkflowNode[];
    }
    return [];
};
