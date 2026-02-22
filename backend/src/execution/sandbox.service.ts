import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext } from './execution.types';

const ivm = require('isolated-vm');

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);
  private readonly timeout = 10000;
  private readonly memoryLimit = 128;

  private sanitizeForTransfer(obj: any, maxDepth: number = 5, currentDepth: number = 0): any {
    if (currentDepth > maxDepth) {
      return '[Max depth reached]';
    }

    if (obj === null) {
      return null;
    }

    if (obj === undefined) {
      return null;
    }

    if (typeof obj === 'function') {
      return '[Function]';
    }

    if (typeof obj === 'symbol') {
      return '[Symbol]';
    }

    if (obj instanceof Error) {
      return `[Error: ${obj.message}]`;
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    if (typeof obj === 'string') {
      if (obj.startsWith('data:') && obj.includes(';base64,')) {
        const parts = obj.split(';base64,');
        if (parts.length === 2) {
          return `[base64:${parts[0].substring(5)}:${parts[1].length}chars]`;
        }
      }
      if (obj.length > 50000) {
        return `[String truncated: ${obj.length} chars]`;
      }
      return obj;
    }

    if (typeof obj === 'boolean' || typeof obj === 'number') {
      return obj;
    }

    if (typeof obj !== 'object') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length > 50) {
        return obj.slice(0, 50).map(item => this.sanitizeForTransfer(item, maxDepth, currentDepth + 1));
      }
      return obj.map(item => this.sanitizeForTransfer(item, maxDepth, currentDepth + 1));
    }

    try {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'data' && typeof value === 'string' && value.startsWith('data:')) {
          const parts = value.split(';base64,');
          if (parts.length === 2) {
            result[key] = `[base64:${parts[0].substring(5)}:${parts[1].length}chars]`;
            continue;
          }
        }
        
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const objValue = value as any;
          if (objValue.data && typeof objValue.data === 'string' && objValue.data.startsWith('data:')) {
            const dataParts = objValue.data.split(';base64,');
            const mimeType = dataParts[0]?.substring(5) || 'unknown';
            const base64Length = dataParts[1]?.length || 0;
            result[key] = {
              name: objValue.name,
              type: objValue.type,
              size: objValue.size,
              data: `[base64:${mimeType}:${base64Length}chars]`,
            };
            continue;
          }
        }
        
        result[key] = this.sanitizeForTransfer(value, maxDepth, currentDepth + 1);
      }
      return result;
    } catch (error: any) {
      this.logger.warn(`Failed to sanitize object: ${error.message}`);
      return '[Object]';
    }
  }

  private safeStringify(obj: any): string {
    try {
      return JSON.stringify(obj, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === 'function') return '[Function]';
        if (typeof value === 'symbol') return '[Symbol]';
        if (value instanceof Error) return `[Error: ${value.message}]`;
        if (value instanceof Date) return value.toISOString();
        return value;
      });
    } catch (error: any) {
      this.logger.warn(`Failed to stringify object: ${error.message}`);
      return '{}';
    }
  }

  async execute(
    code: string,
    context: ExecutionContext,
    inputs?: any,
  ): Promise<{ result: any; logs: string[] }> {
    const logs: string[] = [];

    try {
      const sanitizedContext = this.sanitizeForTransfer({
        trigger: context.trigger,
        steps: context.steps,
        inputs: inputs || {},
        globals: context.globals || {},
      });

      const contextJson = this.safeStringify(sanitizedContext);
      
      if (contextJson.length > 500000) {
        this.logger.warn(`Context too large (${contextJson.length} chars), using minimal context`);
        const minimalContext = {
          trigger: { type: 'form' },
          steps: Object.keys(context.steps || {}).reduce((acc, key) => {
            acc[key] = { _available: true };
            return acc;
          }, {} as any),
          inputs: {},
          globals: {},
        };
        return this.executeInSandbox(code, minimalContext, logs);
      }

      const parsedContext = JSON.parse(contextJson);
      return this.executeInSandbox(code, parsedContext, logs);
    } catch (error: any) {
      this.logger.error(`Sandbox execution error: ${error.message}`);
      logs.push(`Error: ${error.message}`);
      return {
        result: undefined,
        logs,
      };
    }
  }

  private async executeInSandbox(
    code: string,
    context: any,
    logs: string[],
  ): Promise<{ result: any; logs: string[] }> {
    const isolate = new ivm.Isolate({
      memoryLimit: this.memoryLimit,
    });

    try {
      const vmContext = await isolate.createContext();

      const contextJson = JSON.stringify(context);

      const wrappedCode = `
        (function(contextJson) {
          const context = JSON.parse(contextJson);
          const { trigger, steps, inputs, globals } = context;
          const logs = [];
          const console = {
            log: (...args) => logs.push(args.map(a => String(a)).join(' ')),
            info: (...args) => logs.push(args.map(a => String(a)).join(' ')),
            warn: (...args) => logs.push(args.map(a => String(a)).join(' ')),
            error: (...args) => logs.push(args.map(a => String(a)).join(' '))
          };
          
          try {
            const result = (function() {
              ${code}
            })();
            return JSON.stringify({ success: true, result: result, logs: logs });
          } catch (e) {
            return JSON.stringify({ success: false, error: e.message, logs: logs });
          }
        })
      `;

      const script = await isolate.compileScript(wrappedCode);
      const fn = await script.run(vmContext, {
        timeout: this.timeout,
      });

      const resultJson = await fn(contextJson, {
        timeout: this.timeout,
      });

      const parsed = JSON.parse(resultJson);
      
      if (parsed.logs && parsed.logs.length > 0) {
        logs.push(...parsed.logs);
      }

      if (!parsed.success) {
        logs.push(`Error: ${parsed.error}`);
        return {
          result: undefined,
          logs,
        };
      }

      return {
        result: parsed.result,
        logs,
      };
    } catch (error: any) {
      this.logger.error(`Sandbox error: ${error.message}`);
      logs.push(`Error: ${error.message}`);
      return {
        result: undefined,
        logs,
      };
    } finally {
      isolate.dispose();
    }
  }

  async evaluateCondition(
    expression: string,
    context: ExecutionContext,
  ): Promise<boolean> {
    const logs: string[] = [];

    try {
      const sanitizedContext = this.sanitizeForTransfer({
        trigger: context.trigger,
        steps: context.steps,
        inputs: context.trigger.body || {},
      });

      const contextJson = this.safeStringify(sanitizedContext);
      const parsedContext = JSON.parse(contextJson);

      return this.evaluateInSandbox(expression, parsedContext);
    } catch (error: any) {
      this.logger.error(`Condition evaluation error: ${error.message}`);
      return false;
    }
  }

  private async evaluateInSandbox(expression: string, context: any): Promise<boolean> {
    const isolate = new ivm.Isolate({
      memoryLimit: this.memoryLimit,
    });

    try {
      const vmContext = await isolate.createContext();

      const contextJson = JSON.stringify(context);

      const wrappedCode = `
        (function(contextJson) {
          const context = JSON.parse(contextJson);
          const { trigger, steps, inputs } = context;
          try {
            return JSON.stringify({ success: true, result: !!(${expression}) });
          } catch (e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        })
      `;

      const script = await isolate.compileScript(wrappedCode);
      const fn = await script.run(vmContext, {
        timeout: this.timeout,
      });

      const resultJson = await fn(contextJson, {
        timeout: this.timeout,
      });

      const parsed = JSON.parse(resultJson);
      return parsed.success ? Boolean(parsed.result) : false;
    } catch (error: any) {
      this.logger.error(`Evaluate error: ${error.message}`);
      return false;
    } finally {
      isolate.dispose();
    }
  }

  private stringifyValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}
