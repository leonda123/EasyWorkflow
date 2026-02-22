import { Injectable, Logger } from '@nestjs/common';
import { ExecutionContext } from './execution.types';
import { v4 as uuidv4 } from 'uuid';

type FormulaFunction = (...args: any[]) => any;

const FORMULA_FUNCTIONS: Record<string, FormulaFunction> = {
  now: () => Date.now(),
  
  formatDate: (date: any, format: string) => {
    const d = new Date(date || Date.now());
    const pad = (n: number) => n.toString().padStart(2, '0');
    
    return format
      .replace('YYYY', d.getFullYear().toString())
      .replace('MM', pad(d.getMonth() + 1))
      .replace('DD', pad(d.getDate()))
      .replace('HH', pad(d.getHours()))
      .replace('mm', pad(d.getMinutes()))
      .replace('ss', pad(d.getSeconds()));
  },
  
  upper: (str: string) => String(str).toUpperCase(),
  
  lower: (str: string) => String(str).toLowerCase(),
  
  trim: (str: string) => String(str).trim(),
  
  concat: (...args: any[]) => args.map(a => String(a)).join(''),
  
  substring: (str: string, start: number, end?: number) => 
    String(str).substring(start, end),
  
  replace: (str: string, search: string, replace: string) => 
    String(str).replace(new RegExp(search, 'g'), replace),
  
  length: (val: any) => {
    if (Array.isArray(val)) return val.length;
    if (typeof val === 'string') return val.length;
    if (typeof val === 'object' && val !== null) return Object.keys(val).length;
    return 0;
  },
  
  first: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
  
  last: (arr: any[]) => Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
  
  join: (arr: any[], separator: string = ',') => 
    Array.isArray(arr) ? arr.map(a => String(a)).join(separator) : '',
  
  split: (str: string, separator: string = ',') => 
    String(str).split(separator),
  
  default: (val: any, defaultVal: any) => val ?? defaultVal,
  
  random: () => Math.random(),
  
  randomInt: (min: number, max: number) => 
    Math.floor(Math.random() * (max - min + 1)) + min,
  
  uuid: () => uuidv4(),
  
  base64: (str: string) => Buffer.from(String(str)).toString('base64'),
  
  base64Decode: (str: string) => Buffer.from(String(str), 'base64').toString('utf-8'),
  
  json: (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },
  
  stringify: (obj: any) => JSON.stringify(obj),
  
  abs: (num: number) => Math.abs(num),
  
  round: (num: number, decimals: number = 0) => {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  },
  
  floor: (num: number) => Math.floor(num),
  
  ceil: (num: number) => Math.ceil(num),
  
  min: (...args: number[]) => Math.min(...args),
  
  max: (...args: number[]) => Math.max(...args),
  
  sum: (arr: number[]) => Array.isArray(arr) ? arr.reduce((a, b) => a + Number(b), 0) : 0,
  
  avg: (arr: number[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + Number(b), 0) / arr.length;
  },
  
  keys: (obj: any) => Object.keys(obj || {}),
  
  values: (obj: any) => Object.values(obj || {}),
  
  entries: (obj: any) => Object.entries(obj || {}),
  
  get: (obj: any, path: string, defaultValue: any = null) => {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      if (result === null || result === undefined) return defaultValue;
      result = result[key];
    }
    return result ?? defaultValue;
  },
  
  has: (obj: any, key: string) => {
    if (!obj || typeof obj !== 'object') return false;
    return key in obj;
  },
  
  typeOf: (val: any) => {
    if (Array.isArray(val)) return 'array';
    if (val === null) return 'null';
    return typeof val;
  },
  
  isEmpty: (val: any) => {
    if (val === null || val === undefined) return true;
    if (Array.isArray(val)) return val.length === 0;
    if (typeof val === 'string') return val.trim().length === 0;
    if (typeof val === 'object') return Object.keys(val).length === 0;
    return false;
  },
};

@Injectable()
export class VariableSubstitutionService {
  private readonly logger = new Logger(VariableSubstitutionService.name);

  resolvePath(path: string, context: ExecutionContext): any {
    return this.evaluatePath(path, context);
  }

  substitute(template: any, context: ExecutionContext): any {
    if (typeof template === 'string') {
      return this.substituteString(template, context);
    }
    
    if (Array.isArray(template)) {
      return template.map(item => this.substitute(item, context));
    }
    
    if (typeof template === 'object' && template !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(template)) {
        result[key] = this.substitute(value, context);
      }
      return result;
    }
    
    return template;
  }

  substituteRaw(template: string, context: ExecutionContext): any {
    const trimmed = template.trim();
    
    if (!trimmed) {
      return {};
    }
    
    if (trimmed.startsWith('{{') && trimmed.endsWith('}}')) {
      const expression = trimmed.slice(2, -2).trim();
      try {
        const result = this.evaluateExpression(expression, context);
        this.logger.log(`Evaluated expression "${expression}" to type: ${typeof result}`);
        return result;
      } catch (error: any) {
        this.logger.warn(`Failed to evaluate expression "${expression}": ${error.message}`);
        return template;
      }
    }

    if ((trimmed.startsWith('{') && !trimmed.startsWith('{{')) || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        const result = this.substituteObject(parsed, context);
        this.logger.log(`Substituted JSON template, result type: ${typeof result}`);
        return result;
      } catch (e: any) {
        this.logger.warn(`Failed to parse as JSON: ${e.message}, falling back to string substitution`);
      }
    }
    
    return this.substituteString(template, context);
  }

  private substituteObject(obj: any, context: ExecutionContext): any {
    if (typeof obj === 'string') {
      const trimmed = obj.trim();
      if (trimmed.match(/^\{\{([^}]+)\}$/)) {
        return this.evaluateExpression(trimmed.slice(2, -2).trim(), context);
      }
      return this.substituteString(obj, context);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.substituteObject(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteObject(value, context);
      }
      return result;
    }
    
    return obj;
  }

  private substituteString(template: string, context: ExecutionContext): string {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    
    return template.replace(variableRegex, (match, expression) => {
      const trimmed = expression.trim();
      
      if (trimmed.includes('{{') || trimmed.includes('}}')) {
        this.logger.warn(`Invalid nested syntax detected: "${match}". Use {{func(path)}} instead of {{func({{path}})}}`);
        return `[语法错误: 嵌套变量]`;
      }
      
      try {
        const value = this.evaluateExpression(trimmed, context);
        return this.stringifyValue(value);
      } catch (error: any) {
        this.logger.warn(`Failed to evaluate expression "${trimmed}": ${error.message}`);
        return match;
      }
    });
  }

  private evaluateExpression(expression: string, context: ExecutionContext): any {
    const funcMatch = expression.match(/^(\w+)\((.*)\)$/);
    
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      const func = FORMULA_FUNCTIONS[funcName];
      
      if (func) {
        const args = this.parseFunctionArgs(argsStr, context);
        return func(...args);
      }
    }
    
    return this.evaluatePath(expression, context);
  }

  private parseFunctionArgs(argsStr: string, context: ExecutionContext): any[] {
    if (!argsStr.trim()) return [];
    
    const args: any[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (inString) {
        if (char === stringChar && argsStr[i - 1] !== '\\') {
          inString = false;
        }
        current += char;
      } else if (char === '"' || char === "'") {
        inString = true;
        stringChar = char;
        current += char;
      } else if (char === '(' || char === '[' || char === '{') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']' || char === '}') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        args.push(this.parseArgValue(current.trim(), context));
        current = '';
      } else {
        current += char;
      }
    }
    
    if (current.trim()) {
      args.push(this.parseArgValue(current.trim(), context));
    }
    
    return args;
  }

  private parseArgValue(arg: string, context: ExecutionContext): any {
    if ((arg.startsWith('"') && arg.endsWith('"')) || 
        (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg.slice(1, -1);
    }
    
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    if (arg === 'null') return null;
    if (arg === 'undefined') return undefined;
    
    const num = Number(arg);
    if (!isNaN(num)) return num;
    
    if (arg.startsWith('{{') && arg.endsWith('}}')) {
      const inner = arg.slice(2, -2).trim();
      return this.evaluateExpression(inner, context);
    }
    
    if (arg.includes('.') || arg.startsWith('trigger') || arg.startsWith('steps') || arg.startsWith('globals')) {
      return this.evaluatePath(arg, context);
    }
    
    if (arg.match(/^\w+\(/)) {
      return this.evaluateExpression(arg, context);
    }
    
    return arg;
  }

  private evaluatePath(path: string, context: ExecutionContext): any {
    const parts = path.split('.');
    
    if (parts.length === 0) {
      return undefined;
    }
    
    const root = parts[0];
    let value: any;
    
    switch (root) {
      case 'trigger':
        value = context.trigger;
        break;
      case 'steps':
        value = context.steps;
        break;
      case 'globals':
        value = context.globals || {};
        break;
      case 'inputs':
        value = context.trigger?.body || {};
        break;
      case 'loop':
        value = context.loop || {};
        break;
      default:
        return undefined;
    }
    
    for (let i = 1; i < parts.length; i++) {
      if (value === null || value === undefined) {
        return undefined;
      }
      
      const part = parts[i];
      
      if (part.includes('[') && part.includes(']')) {
        const match = part.match(/^([^\[]+)\[(\d+)\]$/);
        if (match) {
          const [, key, index] = match;
          value = value[key]?.[parseInt(index)];
        } else {
          const arrayMatch = part.match(/^(.+)\[\]$/);
          if (arrayMatch) {
            value = value[arrayMatch[1]];
          }
        }
      } else {
        value = value[part];
      }
    }
    
    return value;
  }

  private stringifyValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
}
