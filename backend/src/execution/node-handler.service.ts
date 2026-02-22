import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig } from 'axios';
import { ExecutionContext, WorkflowNode, NodeExecutionResult } from './execution.types';
import { VariableSubstitutionService } from './variable-substitution.service';
import { SandboxService } from './sandbox.service';
import { LlmService } from '../llm/llm.service';
import { DatabaseService } from '../database/database.service';
import OpenAI from 'openai';

const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

@Injectable()
export class NodeHandlerService {
  private readonly logger = new Logger(NodeHandlerService.name);

  constructor(
    private variableService: VariableSubstitutionService,
    private sandboxService: SandboxService,
    private llmService: LlmService,
    private databaseService: DatabaseService,
  ) {}

  async execute(node: WorkflowNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const logs: string[] = [];
    const nodeConfig = node.data?.config;
    const input: any = { nodeType: node.data?.type, config: nodeConfig };

    this.logger.log(`Executing node: ${node.data?.label || node.id} (type: ${node.data?.type})`);

    try {
      const nodeType = node.data?.type;
      const defaultTimeout = nodeType === 'llm' ? 180000 : 30000;
      const timeout = node.data?.config?.timeout || defaultTimeout;
      
      if (!nodeType) {
        const error = 'Node type is undefined';
        this.logger.error(error);
        return { success: false, error, logs: [error], input };
      }

      let result: any;
      
      const executeWithTimeout = async () => {
        return Promise.race([
          this.executeNodeByType(nodeType, node, context, logs, input),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Node execution timeout after ${timeout}ms`)), timeout)
          ),
        ]);
      };

      result = await executeWithTimeout();

      const duration = Date.now() - startTime;
      logs.push(`Node completed in ${duration}ms`);

      this.logger.log(`Node ${node.data?.label || node.id} completed successfully in ${duration}ms`);

      return { success: true, output: result, logs, input };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      logs.push(`Error: ${error.message}`);
      logs.push(`Node failed after ${duration}ms`);

      this.logger.error(`Node ${node.data?.label || node.id} failed: ${error.message}`);
      this.logger.error(`Stack: ${error.stack}`);

      return { success: false, error: error.message, logs, input };
    }
  }

  private async executeNodeByType(
    nodeType: string,
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
    input: any,
  ): Promise<any> {
    switch (nodeType) {
      case 'start':
        const startResult = await this.handleStartNode(node, context, logs);
        input.triggerData = context.trigger;
        return startResult;
      case 'end':
        return this.handleEndNode(node, context, logs);
      case 'api':
        return this.handleApiNode(node, context, logs);
      case 'process':
        return this.handleProcessNode(node, context, logs);
      case 'condition':
        return this.handleConditionNode(node, context, logs);
      case 'delay':
        return this.handleDelayNode(node, context, logs);
      case 'llm':
        return this.handleLlmNode(node, context, logs);
      case 'db':
        return this.handleDbNode(node, context, logs);
      case 'preset_data':
        return this.handlePresetDataNode(node, context, logs);
      case 'workflow_call':
        return this.handleWorkflowCallNode(node, context, logs);
      case 'file_parser':
        return this.handleFileParserNode(node, context, logs);
      case 'loop':
        return this.handleLoopNode(node, context, logs);
      default:
        logs.push(`Unknown node type: ${nodeType}`);
        throw new Error(`Unknown node type: ${nodeType}`);
    }
  }

  private async handleStartNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    logs.push('Start node triggered');
    const config = node.data?.config || {};

    this.logger.log(`Start node config: ${JSON.stringify(config)}`);

    if (config?.triggerType === 'webhook') {
      logs.push(`Webhook trigger: ${config.webhookMethod || 'POST'}`);
      return {
        triggerType: 'webhook',
        method: config.webhookMethod,
        body: context.trigger.body,
        headers: context.trigger.headers,
        query: context.trigger.query,
      };
    }

    if (config?.triggerType === 'schedule') {
      logs.push(`Schedule trigger: ${config.cronExpression}`);
      return {
        triggerType: 'schedule',
        cron: config.cronExpression,
        timestamp: new Date().toISOString(),
      };
    }

    if (config?.triggerType === 'form') {
      logs.push('Form trigger');
      return {
        triggerType: 'form',
        body: context.trigger.body,
      };
    }

    logs.push('Manual trigger');
    return {
      triggerType: 'manual',
      timestamp: new Date().toISOString(),
    };
  }

  private async handleEndNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    logs.push('End node reached');
    const config = node.data?.config || {};

    let responseBody: any = {};
    if (config?.responseBody) {
      const trimmed = config.responseBody.trim();
      
      if (!trimmed) {
        logs.push('Response body is empty');
        responseBody = {};
      } else if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          responseBody = this.variableService.substituteRaw(config.responseBody, context);
          logs.push(`Response body parsed as JSON object/array`);
        } catch (error: any) {
          logs.push(`Warning: Failed to parse response body as JSON: ${error.message}`);
          responseBody = this.variableService.substitute(config.responseBody, context);
        }
      } else if (trimmed.startsWith('{{')) {
        responseBody = this.variableService.substituteRaw(config.responseBody, context);
        logs.push(`Response body evaluated as expression`);
      } else {
        responseBody = this.variableService.substitute(config.responseBody, context);
        logs.push(`Response body processed as string template`);
      }
      
      this.logger.log(`End node response body type: ${typeof responseBody}`);
    }

    const responseStatus = config?.responseStatus || 200;

    logs.push(`Response status: ${responseStatus}`);

    return {
      status: responseStatus,
      body: responseBody,
    };
  }

  private async handleApiNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const rawUrl = config?.url || '';
    
    this.logger.log(`API Node config: ${JSON.stringify(config)}`);
    this.logger.log(`API Node URL: "${rawUrl}"`);
    
    logs.push(`API Request: ${config?.method || 'GET'} ${rawUrl || '(no URL)'}`);
    
    if (!rawUrl) {
      throw new Error('API URL is required but not configured. Please save the workflow and try again.');
    }

    let url = this.variableService.substitute(rawUrl, context);
    
    if (!url || typeof url !== 'string') {
      throw new Error(`Invalid URL after variable substitution: ${url}`);
    }
    
    const method = (config?.method || 'GET').toLowerCase();

    const headers: any = {};
    if (config?.headers) {
      for (const h of config.headers) {
        if (h.key && h.value) {
          headers[h.key] = this.variableService.substitute(h.value, context);
        }
      }
    }

    const params: any = {};
    if (config?.params) {
      for (const p of config.params) {
        if (p.key && p.value) {
          params[p.key] = this.variableService.substitute(p.value, context);
        }
      }
    }

    if (config?.authType === 'bearer' && config?.authConfig?.token) {
      headers['Authorization'] = `Bearer ${config.authConfig.token}`;
      logs.push('Added Bearer token authentication');
    }

    if (config?.authType === 'basic' && config?.authConfig) {
      const credentials = Buffer.from(
        `${config.authConfig.username}:${config.authConfig.password}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
      logs.push('Added Basic authentication');
    }

    let body: any;
    if (config?.body && ['post', 'put', 'patch'].includes(method)) {
      body = this.variableService.substitute(
        typeof config.body === 'string' ? JSON.parse(config.body) : config.body,
        context,
      );
    }

    if (config?.preRequestScript) {
      logs.push('Executing pre-request script');
      const scriptResult = await this.sandboxService.execute(
        config.preRequestScript,
        context,
        { url, headers, body, params },
      );
      logs.push(...scriptResult.logs);
      if (scriptResult.result) {
        url = scriptResult.result.url || url;
        body = scriptResult.result.body || body;
        Object.assign(headers, scriptResult.result.headers || {});
      }
    }

    const axiosConfig: AxiosRequestConfig = {
      method,
      url,
      headers,
      params,
      data: body,
      timeout: config?.timeout || 30000,
    };

    try {
      const response = await axios(axiosConfig);
      logs.push(`Response: ${response.status}`);

      let output = {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      };

      if (config?.testScript) {
        logs.push('Executing test script');
        const testResult = await this.sandboxService.execute(
          config.testScript,
          context,
          output,
        );
        logs.push(...testResult.logs);
        if (testResult.result) {
          output = testResult.result;
        }
      }

      return output;
    } catch (error: any) {
      logs.push(`Request failed: ${error.message}`);
      if (error.response) {
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          error: true,
        };
      }
      throw error;
    }
  }

  private async handleProcessNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    logs.push('Executing process node');

    const code = config?.code || 'return inputs;';
    const inputs = context.trigger.body || {};

    const result = await this.sandboxService.execute(code, context, inputs);
    logs.push(...result.logs);

    const outputConfig = config?.outputConfig;
    const output: any = {
      output: result.result || {},
      result: result.result || {},
    };

    const customVariables: any = {};

    if (outputConfig?.mode === 'custom' && outputConfig.variables && outputConfig.variables.length > 0) {
      for (const variable of outputConfig.variables) {
        if (variable.name) {
          if (variable.sourcePath) {
            const value = this.variableService.resolvePath(variable.sourcePath, context);
            output[variable.name] = value;
            customVariables[variable.name] = value;
          } else if (variable.defaultValue !== undefined) {
            output[variable.name] = variable.defaultValue;
            customVariables[variable.name] = variable.defaultValue;
          } else {
            output[variable.name] = null;
            customVariables[variable.name] = null;
          }
        }
      }
      output.customVariables = customVariables;
      logs.push(`[OUTPUT] Custom output variables: ${Object.keys(customVariables).join(', ')}`);
    }

    return output;
  }

  private async handleConditionNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const conditionConfig = config?.conditionConfig;
    const branches = conditionConfig?.branches || [];
    
    logs.push('Evaluating condition branches');

    if (branches.length === 0) {
      const expression = config?.conditionExpression || 'true';
      const processedExpression = this.preprocessCondition(expression, context);
      const result = await this.sandboxService.evaluateCondition(processedExpression, context);
      logs.push(`Single condition result: ${result}`);
      return {
        result,
        expression: processedExpression,
        matchedBranch: result ? 'true' : 'false',
        matchedHandle: result ? 'true' : 'false',
      };
    }

    const sortedBranches = [...branches].sort((a, b) => (a.order || 0) - (b.order || 0));
    logs.push(`Evaluating ${sortedBranches.length} branches in order`);

    for (const branch of sortedBranches) {
      if (branch.type === 'else') {
        logs.push(`Matched else branch: ${branch.id}`);
        return {
          result: true,
          matchedBranch: branch.id,
          matchedHandle: branch.handleId,
          branchType: 'else',
        };
      }

      const rawCondition = branch.condition || (branch.type === 'if' ? config?.conditionExpression : null) || 'true';
      logs.push(`Branch ${branch.type} (${branch.id}): raw condition = "${rawCondition}"`);
      
      const condition = this.preprocessCondition(rawCondition, context);
      logs.push(`Branch ${branch.type} (${branch.id}): processed = "${condition}"`);
      
      try {
        const branchResult = await this.sandboxService.evaluateCondition(condition, context);
        
        logs.push(`Branch ${branch.type} (${branch.id}): result = ${branchResult}`);
        
        if (branchResult) {
          logs.push(`Matched branch: ${branch.type} (${branch.id})`);
          return {
            result: true,
            matchedBranch: branch.id,
            matchedHandle: branch.handleId,
            branchType: branch.type,
            condition,
          };
        }
      } catch (error: any) {
        logs.push(`Branch ${branch.id} evaluation error: ${error.message}`);
      }
    }

    logs.push('No branch matched');
    return {
      result: false,
      matchedBranch: null,
      matchedHandle: null,
      branchType: null,
    };
  }

  private preprocessCondition(expression: string, context: ExecutionContext): string {
    let processed = expression.trim();
    
    this.logger.debug(`Preprocessing condition, raw: "${processed}"`);
    
    if (processed.startsWith('{{') && processed.endsWith('}}')) {
      const inner = processed.slice(2, -2).trim();
      if (!inner.includes('{{') && !inner.includes('}}')) {
        processed = inner;
        this.logger.debug(`Stripped outer {{ }}, inner: "${processed}"`);
      }
    }
    
    processed = this.variableService.substitute(processed, context);
    
    processed = this.replaceVariablePaths(processed, context);
    
    this.logger.debug(`After substitution: "${processed}"`);
    
    return processed;
  }

  private replaceVariablePaths(expression: string, context: ExecutionContext): string {
    const pathRegex = /\b(steps\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\b|\b(trigger\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\b|\b(globals\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\b|\b(inputs\.[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\b/g;
    
    return expression.replace(pathRegex, (match) => {
      const value = this.variableService.resolvePath(match, context);
      
      if (value === undefined) {
        this.logger.debug(`Variable path "${match}" resolved to undefined`);
        return 'undefined';
      }
      
      if (value === null) {
        this.logger.debug(`Variable path "${match}" resolved to null`);
        return 'null';
      }
      
      if (typeof value === 'string') {
        this.logger.debug(`Variable path "${match}" resolved to string: "${value}"`);
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      
      if (typeof value === 'boolean' || typeof value === 'number') {
        this.logger.debug(`Variable path "${match}" resolved to ${typeof value}: ${value}`);
        return String(value);
      }
      
      if (typeof value === 'object') {
        this.logger.debug(`Variable path "${match}" resolved to object`);
        return JSON.stringify(value);
      }
      
      return match;
    });
  }

  private async handleDelayNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const delayConfig = config?.delayConfig || { duration: 1, unit: 'seconds' };

    let delayMs = delayConfig.duration;
    switch (delayConfig.unit) {
      case 'ms':
        break;
      case 'seconds':
        delayMs *= 1000;
        break;
      case 'minutes':
        delayMs *= 60 * 1000;
        break;
    }

    logs.push(`Delaying for ${delayMs}ms`);

    if (delayMs <= 60000) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      logs.push('Delay completed');
    } else {
      logs.push('Delay exceeds 60s, would be handled by queue');
    }

    return {
      delayed: delayMs,
      completed: delayMs <= 60000,
    };
  }

  private async handleLlmNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const llmConfig = config?.llmConfig || {};

    this.logger.log(`LLM node config: ${JSON.stringify(llmConfig)}`);

    const systemPrompt = this.variableService.substitute(
      llmConfig.systemPrompt || '',
      context,
    );
    const userPrompt = this.variableService.substitute(
      llmConfig.userPrompt || '',
      context,
    );

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    if (userPrompt) {
      messages.push({ role: 'user', content: userPrompt });
    }
    
    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    } else if (messages[messages.length - 1].role !== 'user') {
      messages.push({ role: 'user', content: '请继续' });
    }

    logs.push(`[INFO] Use Server Config: ${llmConfig.useServerConfig !== false ? 'Yes' : 'No'}`);
    logs.push(`[INFO] Temperature: ${llmConfig.temperature ?? 0.7}`);
    logs.push(`[INFO] Max Tokens: ${llmConfig.maxTokens || 2048}`);
    logs.push(`[INFO] Messages count: ${messages.length}`);
    logs.push(`[INPUT] System Prompt:`);
    logs.push(`  ${systemPrompt || '(empty)'}`);
    logs.push(`[INPUT] User Prompt:`);
    logs.push(`  ${userPrompt || '(empty)'}`);

    const useServerConfig = llmConfig.useServerConfig !== false;

    if (useServerConfig && llmConfig.configId) {
      logs.push(`[INFO] Config ID: ${llmConfig.configId}`);
      
      try {
        const llmConfigData = await this.llmService.getConfig(llmConfig.configId);
        logs.push(`[INFO] Provider: ${llmConfigData.provider}`);
        logs.push(`[INFO] Model: ${llmConfigData.model}`);
        logs.push(`[INFO] Base URL: ${llmConfigData.baseUrl}`);
        
        this.logger.log(`Calling LLM with config: ${llmConfig.configId}, model: ${llmConfigData.model}`);
        
        const response = await this.llmService.chat({
          configId: llmConfig.configId,
          messages,
          maxTokens: llmConfig.maxTokens,
          temperature: llmConfig.temperature,
        });
        
        const content = response.content || '';
        logs.push(`[SUCCESS] Response received (${content.length} chars)`);
        logs.push(`[OUTPUT] Content:`);
        logs.push(`  ${content.substring(0, 500)}${content.length > 500 ? '...(truncated)' : ''}`);
        logs.push(`[OUTPUT] Usage: prompt=${response.usage?.prompt_tokens || 0}, completion=${response.usage?.completion_tokens || 0}, total=${response.usage?.total_tokens || 0}`);
        
        return {
          content,
          model: response.model,
          provider: llmConfigData.provider,
          usage: response.usage,
        };
      } catch (error: any) {
        this.logger.error(`LLM call failed: ${error.message}`);
        logs.push(`[ERROR] ${error.message}`);
        throw error;
      }
    }

    if (!useServerConfig && llmConfig.apiKey && llmConfig.baseUrl) {
      logs.push(`[INFO] Mode: Custom Configuration`);
      logs.push(`[INFO] Provider: ${llmConfig.provider || 'custom'}`);
      logs.push(`[INFO] Model: ${llmConfig.model || 'unknown'}`);
      logs.push(`[INFO] Base URL: ${llmConfig.baseUrl}`);
      
      try {
        const client = new OpenAI({
          apiKey: llmConfig.apiKey,
          baseURL: llmConfig.baseUrl,
          timeout: 180000,
        });

        const response = await client.chat.completions.create({
          model: llmConfig.model || 'gpt-3.5-turbo',
          messages,
          max_tokens: llmConfig.maxTokens || 2048,
          temperature: llmConfig.temperature ?? 0.7,
        });

        const content = response.choices[0]?.message?.content || '';
        logs.push(`[SUCCESS] Response received (${content.length} chars)`);
        logs.push(`[OUTPUT] Content:`);
        logs.push(`  ${content.substring(0, 500)}${content.length > 500 ? '...(truncated)' : ''}`);
        logs.push(`[OUTPUT] Usage: prompt=${response.usage?.prompt_tokens || 0}, completion=${response.usage?.completion_tokens || 0}, total=${response.usage?.total_tokens || 0}`);

        return {
          content,
          model: response.model,
          provider: llmConfig.provider,
          usage: response.usage,
        };
      } catch (error: any) {
        this.logger.error(`LLM call failed: ${error.message}`);
        logs.push(`[ERROR] ${error.message}`);
        throw error;
      }
    }

    this.logger.warn(`No valid LLM configuration found for node ${node.data?.label || node.id}`);
    logs.push('[ERROR] No valid LLM configuration found');
    logs.push('[ERROR] Please select a server config or provide custom config');
    
    throw new Error('No valid LLM configuration found. Please select a server config or provide custom config.');
  }

  private async handleDbNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const dbConfig = config?.dbConfig || {};

    const dbType = dbConfig.type || 'mysql';
    logs.push(`[INFO] Database type: ${dbType}`);
    logs.push(`[INFO] Connection: ${dbConfig.connectionName || dbConfig.host || 'not configured'}`);

    const query = this.variableService.substitute(dbConfig.query || '', context);
    logs.push(`[INPUT] Query: ${query.substring(0, 200)}${query.length > 200 ? '...' : ''}`);

    if (!query) {
      throw new Error('SQL query is required');
    }

    const hasConnectionConfig = dbConfig.useConnectionString 
      ? !!dbConfig.connectionString
      : !!(dbConfig.host && dbConfig.database && dbConfig.username);

    if (!hasConnectionConfig) {
      logs.push('[WARN] No valid connection configuration, using simulated mode');
      return {
        type: dbType,
        query,
        rows: [],
        rowCount: 0,
        simulated: true,
        message: 'No connection configured - simulated execution',
      };
    }

    try {
      logs.push('[INFO] Connecting to database...');
      
      const connectionConfig = {
        type: dbType,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        username: dbConfig.username,
        password: dbConfig.password,
        connectionString: dbConfig.connectionString,
      };

      const result = await this.databaseService.executeQuery(connectionConfig, query);
      
      logs.push(`[SUCCESS] Query executed in ${result.duration}ms`);
      logs.push(`[OUTPUT] Rows affected: ${result.rowCount}`);
      if (result.fields && result.fields.length > 0) {
        logs.push(`[OUTPUT] Fields: ${result.fields.join(', ')}`);
      }
      
      return {
        type: dbType,
        query,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields,
        duration: result.duration,
        simulated: false,
      };
    } catch (error: any) {
      logs.push(`[ERROR] Database error: ${error.message}`);
      throw error;
    }
  }

  private async handlePresetDataNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const presetDataConfig = config?.presetDataConfig;

    logs.push('Preset data node triggered');

    if (presetDataConfig?.mode === 'dynamic' && presetDataConfig.fields && presetDataConfig.fields.length > 0) {
      logs.push(`[INFO] Dynamic mode with ${presetDataConfig.fields.length} fields`);
      const output: Record<string, any> = {};
      
      for (const field of presetDataConfig.fields) {
        if (field.key) {
          if (field.isVariable && field.value) {
            output[field.key] = this.variableService.resolvePath(field.value, context);
            logs.push(`[FIELD] ${field.key}: resolved from ${field.value}`);
          } else {
            output[field.key] = this.parseValueByType(field.value, field.type);
            logs.push(`[FIELD] ${field.key}: static value`);
          }
        }
      }
      
      logs.push(`[OUTPUT] Returning dynamic preset data`);
      return output;
    }

    const presetData = config?.presetData || {};
    logs.push(`[INFO] Static mode, Data keys: ${Object.keys(presetData).join(', ') || 'none'}`);

    const substitutedData = this.variableService.substitute(presetData, context);

    logs.push(`[OUTPUT] Returning preset data`);
    this.logger.log(`Preset data node returning: ${JSON.stringify(substitutedData).substring(0, 200)}`);

    return substitutedData;
  }

  private parseValueByType(value: string, type: string): any {
    switch (type) {
      case 'number':
        return Number(value) || 0;
      case 'boolean':
        return value === 'true';
      case 'object':
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      case 'array':
        try {
          return JSON.parse(value);
        } catch {
          return [];
        }
      default:
        return value;
    }
  }

  private async handleWorkflowCallNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const targetWorkflowId = config?.targetWorkflowId;
    const inputMapping = config?.inputMapping || {};

    if (!targetWorkflowId) {
      throw new Error('Target workflow ID is required');
    }

    logs.push(`[INFO] Calling workflow: ${targetWorkflowId}`);
    logs.push(`[INFO] Input mapping: ${JSON.stringify(inputMapping)}`);

    const inputData = this.variableService.substitute(inputMapping, context);
    logs.push(`[INPUT] Mapped input: ${JSON.stringify(inputData).substring(0, 200)}`);

    logs.push(`[WARN] Workflow call is simulated in this version`);
    
    return {
      calledWorkflowId: targetWorkflowId,
      input: inputData,
      output: { simulated: true, message: 'Workflow call simulated' },
      status: 'success',
    };
  }

  private async handleFileParserNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config || {};
    const fileParserConfig = config?.fileParserConfig || {};
    
    const fileSource = fileParserConfig.fileSource || '';
    const outputFormat = fileParserConfig.outputFormat || 'text';
    const extractMetadata = fileParserConfig.extractMetadata ?? true;

    logs.push('[INFO] File Parser node started');

    if (!fileSource) {
      throw new Error('File source is required');
    }

    let fileData = this.variableService.substituteRaw(fileSource, context);
    logs.push(`[INFO] File source: ${fileSource}`);
    logs.push(`[INFO] File data type: ${typeof fileData}`);
    
    if (fileData && typeof fileData === 'string' && fileData.startsWith('{')) {
      try {
        const parsed = JSON.parse(fileData);
        logs.push(`[INFO] File data was JSON string, parsed keys: ${Object.keys(parsed).join(', ')}`);
        fileData = parsed;
      } catch {
        logs.push(`[INFO] File data is not valid JSON`);
      }
    }
    
    if (fileData && typeof fileData === 'object') {
      logs.push(`[INFO] File data keys: ${Object.keys(fileData).join(', ')}`);
    }

    if (!fileData) {
      throw new Error('No file data found from the specified source');
    }

    const { fileBuffer, filename, mimeType } = await this.parseFileData(fileData, logs);

    return this.processFileContent(fileBuffer, filename, mimeType, outputFormat, extractMetadata, logs);
  }

  private async parseFileData(fileData: any, logs: string[]): Promise<{ fileBuffer: Buffer; filename: string; mimeType: string }> {
    let fileBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (typeof fileData === 'string') {
      if (fileData.startsWith('data:')) {
        const matches = fileData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
          filename = 'uploaded_file';
        } else {
          throw new Error('Invalid base64 data URL format');
        }
      } else if (fileData.startsWith('http://') || fileData.startsWith('https://')) {
        logs.push(`[INFO] Downloading file from URL: ${fileData.substring(0, 100)}...`);
        const response = await axios.get(fileData, { responseType: 'arraybuffer' });
        fileBuffer = Buffer.from(response.data);
        mimeType = response.headers['content-type'] || 'application/octet-stream';
        filename = fileData.split('/').pop() || 'downloaded_file';
      } else if (fileData.length > 100 && /^[A-Za-z0-9+/=]+$/.test(fileData)) {
        logs.push('[INFO] Detected raw base64 string, attempting to decode...');
        try {
          fileBuffer = Buffer.from(fileData, 'base64');
          filename = 'uploaded_file';
          mimeType = 'application/octet-stream';
        } catch {
          throw new Error('Failed to decode base64 string');
        }
      } else {
        throw new Error(`Unsupported file data format. String length: ${fileData.length}, starts with: ${fileData.substring(0, 50)}`);
      }
    } else if (typeof fileData === 'object' && fileData !== null) {
      if (fileData.data && typeof fileData.data === 'string' && fileData.data.startsWith('data:')) {
        const matches = fileData.data.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          fileBuffer = Buffer.from(matches[2], 'base64');
          filename = fileData.name || 'uploaded_file';
          logs.push('[INFO] Detected data URL format in object');
        } else {
          throw new Error('Invalid data URL format in file object');
        }
      } else if (fileData.buffer && fileData.mimetype) {
        fileBuffer = Buffer.isBuffer(fileData.buffer) 
          ? fileData.buffer 
          : Buffer.from(fileData.buffer, 'base64');
        mimeType = fileData.mimetype;
        filename = fileData.originalname || fileData.filename || 'uploaded_file';
      } else if (fileData.base64 && fileData.mimetype) {
        fileBuffer = Buffer.from(fileData.base64, 'base64');
        mimeType = fileData.mimetype;
        filename = fileData.filename || 'uploaded_file';
      } else if (fileData.data && fileData.mimetype) {
        fileBuffer = Buffer.isBuffer(fileData.data) 
          ? fileData.data 
          : Buffer.from(fileData.data, 'base64');
        mimeType = fileData.mimetype;
        filename = fileData.name || fileData.filename || 'uploaded_file';
      } else if (fileData.content && fileData.mimetype) {
        fileBuffer = Buffer.isBuffer(fileData.content) 
          ? fileData.content 
          : Buffer.from(fileData.content, 'base64');
        mimeType = fileData.mimetype;
        filename = fileData.name || fileData.filename || 'uploaded_file';
      } else if (fileData.path || fileData.filepath) {
        const filePath = fileData.path || fileData.filepath;
        logs.push(`[INFO] Reading file from path: ${filePath}`);
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found at path: ${filePath}`);
        }
        fileBuffer = fs.readFileSync(filePath);
        filename = fileData.name || fileData.originalname || filePath.split('/').pop() || 'uploaded_file';
        mimeType = fileData.mimetype || fileData.type || 'application/octet-stream';
      } else {
        const keys = Object.keys(fileData);
        throw new Error(`Unsupported file object format. Available keys: ${keys.join(', ')}`);
      }
    } else {
      throw new Error('Unsupported file data type');
    }

    logs.push(`[INFO] File: ${filename}`);
    logs.push(`[INFO] MIME type: ${mimeType}`);
    logs.push(`[INFO] Size: ${fileBuffer.length} bytes`);

    return { fileBuffer, filename, mimeType };
  }

  private async processFileContent(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    outputFormat: string,
    extractMetadata: boolean,
    logs: string[],
  ): Promise<any> {

    const extension = filename.split('.').pop()?.toLowerCase() || '';
    let text = '';
    let structuredData: any = null;
    let metadata: any = {};

    if (extractMetadata) {
      metadata = {
        filename,
        size: fileBuffer.length,
        mimeType,
        extension,
      };
    }

    try {
      if (mimeType === 'application/pdf' || extension === 'pdf') {
        logs.push('[INFO] Parsing PDF file...');
        const pdfParser = new PDFParse({ data: fileBuffer });
        const pdfResult = await pdfParser.getText();
        text = pdfResult.text;
        if (extractMetadata) {
          const info = await pdfParser.getInfo();
          metadata.pages = info.total;
          metadata.info = info.info;
        }
        logs.push(`[SUCCESS] PDF parsed: ${pdfResult.total} pages, ${text.length} chars`);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        extension === 'docx'
      ) {
        logs.push('[INFO] Parsing Word document...');
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        text = result.value;
        logs.push(`[SUCCESS] Word document parsed: ${text.length} chars`);
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel' ||
        extension === 'xlsx' ||
        extension === 'xls'
      ) {
        logs.push('[INFO] Parsing Excel file...');
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        
        const sheets: any[] = [];
        const allText: string[] = [];
        
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          sheets.push({
            name: sheetName,
            data: jsonData,
          });
          allText.push(`=== Sheet: ${sheetName} ===`);
          jsonData.forEach((row: any) => {
            if (Array.isArray(row)) {
              allText.push(row.join('\t'));
            }
          });
        });
        
        text = allText.join('\n');
        
        if (outputFormat === 'structured') {
          structuredData = sheets;
        }
        
        if (extractMetadata) {
          metadata.sheets = workbook.SheetNames.length;
          metadata.sheetNames = workbook.SheetNames;
        }
        
        logs.push(`[SUCCESS] Excel parsed: ${workbook.SheetNames.length} sheets`);
      } else if (
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        extension === 'txt' ||
        extension === 'md'
      ) {
        logs.push('[INFO] Reading text file...');
        text = fileBuffer.toString('utf-8');
        logs.push(`[SUCCESS] Text file read: ${text.length} chars`);
      } else {
        throw new Error(`Unsupported file type: ${mimeType} (${extension})`);
      }
    } catch (parseError: any) {
      this.logger.error(`File parsing failed: ${parseError.message}`);
      logs.push(`[ERROR] ${parseError.message}`);
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

    const result: any = {
      text: text.trim(),
      content: text.trim(),
    };

    if (outputFormat === 'structured' && structuredData) {
      result.data = structuredData;
      result.sheets = structuredData;
    } else {
      result.data = text.trim();
    }

    if (extractMetadata) {
      result.metadata = metadata;
    }

    result.output = {
      text: text.trim(),
      data: result.data,
      metadata: extractMetadata ? metadata : undefined,
    };

    logs.push(`[OUTPUT] Extracted ${text.length} characters`);
    logs.push(`[OUTPUT] Available fields: text, content, data, metadata, output`);

    return result;
  }

  private async handleLoopNode(
    node: WorkflowNode,
    context: ExecutionContext,
    logs: string[],
  ): Promise<any> {
    const config = node.data?.config?.loopConfig || {
      mode: 'count',
      count: 1,
      maxIterations: 100,
    };

    logs.push(`Loop node initialized, mode: ${config.mode}`);
    logs.push(`Note: Loop body execution is handled by the orchestrator`);

    return {
      mode: config.mode,
      config: config,
      message: 'Loop configuration ready. Connect loop body nodes via the "loop" handle.',
    };
  }
}
