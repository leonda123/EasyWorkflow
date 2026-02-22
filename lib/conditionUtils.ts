import { ConditionOperator, ConditionRule, ConditionGroup, ConditionValueType } from '../types';

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: '等于',
  notEquals: '不等于',
  greaterThan: '大于',
  lessThan: '小于',
  greaterThanOrEqual: '大于等于',
  lessThanOrEqual: '小于等于',
  contains: '包含',
  notContains: '不包含',
  isEmpty: '为空',
  isNotEmpty: '不为空',
  startsWith: '开头是',
  endsWith: '结尾是',
  inArray: '在列表中',
  notInArray: '不在列表中',
};

export const OPERATORS_REQUIRING_VALUE: ConditionOperator[] = [
  'equals',
  'notEquals',
  'greaterThan',
  'lessThan',
  'greaterThanOrEqual',
  'lessThanOrEqual',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'inArray',
  'notInArray',
];

export const OPERATORS_NO_VALUE: ConditionOperator[] = [
  'isEmpty',
  'isNotEmpty',
];

function formatValue(value: string, valueType: ConditionValueType): string {
  switch (valueType) {
    case 'string':
      return `'${value.replace(/'/g, "\\'")}'`;
    case 'number':
      return value;
    case 'boolean':
      return value === 'true' ? 'true' : 'false';
    case 'variable':
      if (value.startsWith('{{') && value.endsWith('}}')) {
        return value;
      }
      return `{{${value}}}`;
    default:
      return `'${value.replace(/'/g, "\\'")}'`;
  }
}

function wrapVariable(path: string): string {
  if (path.startsWith('{{') && path.endsWith('}}')) {
    return path;
  }
  return `{{${path}}}`;
}

export function generateExpressionFromRule(rule: ConditionRule): string {
  const { variablePath, operator, value, valueType } = rule;
  const wrappedPath = wrapVariable(variablePath);
  
  switch (operator) {
    case 'equals':
      return `${wrappedPath} === ${formatValue(value, valueType)}`;
    case 'notEquals':
      return `${wrappedPath} !== ${formatValue(value, valueType)}`;
    case 'greaterThan':
      return `${wrappedPath} > ${formatValue(value, valueType)}`;
    case 'lessThan':
      return `${wrappedPath} < ${formatValue(value, valueType)}`;
    case 'greaterThanOrEqual':
      return `${wrappedPath} >= ${formatValue(value, valueType)}`;
    case 'lessThanOrEqual':
      return `${wrappedPath} <= ${formatValue(value, valueType)}`;
    case 'contains':
      return `${wrappedPath}?.includes(${formatValue(value, valueType)})`;
    case 'notContains':
      return `!${wrappedPath}?.includes(${formatValue(value, valueType)})`;
    case 'isEmpty':
      return `!${wrappedPath} || ${wrappedPath} === '' || (Array.isArray(${wrappedPath}) && ${wrappedPath}.length === 0) || (typeof ${wrappedPath} === 'object' && Object.keys(${wrappedPath}).length === 0)`;
    case 'isNotEmpty':
      return `${wrappedPath} && ${wrappedPath} !== '' && !(Array.isArray(${wrappedPath}) && ${wrappedPath}.length === 0) && !(typeof ${wrappedPath} === 'object' && Object.keys(${wrappedPath}).length === 0)`;
    case 'startsWith':
      return `${wrappedPath}?.startsWith(${formatValue(value, valueType)})`;
    case 'endsWith':
      return `${wrappedPath}?.endsWith(${formatValue(value, valueType)})`;
    case 'inArray':
      const arrayValues = valueType === 'variable' 
        ? formatValue(value, valueType) 
        : `[${value.split(',').map(v => formatValue(v.trim(), 'string')).join(', ')}]`;
      return `${arrayValues}.includes(${wrappedPath})`;
    case 'notInArray':
      const arrayValuesNot = valueType === 'variable' 
        ? formatValue(value, valueType) 
        : `[${value.split(',').map(v => formatValue(v.trim(), 'string')).join(', ')}]`;
      return `!${arrayValuesNot}.includes(${wrappedPath})`;
    default:
      return 'true';
  }
}

export function generateExpressionFromGroups(groups: ConditionGroup[]): string {
  if (!groups || groups.length === 0) {
    return 'true';
  }
  
  const groupExpressions = groups.map(group => {
    if (!group.rules || group.rules.length === 0) {
      return 'true';
    }
    
    const ruleExpressions = group.rules.map(rule => generateExpressionFromRule(rule));
    const logic = group.logic === 'AND' ? ' && ' : ' || ';
    
    if (ruleExpressions.length === 1) {
      return ruleExpressions[0];
    }
    
    return `(${ruleExpressions.join(logic)})`;
  });
  
  if (groupExpressions.length === 1) {
    return groupExpressions[0];
  }
  
  return groupExpressions.join(' || ');
}

export function createEmptyRule(): ConditionRule {
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    variablePath: '',
    operator: 'equals',
    value: '',
    valueType: 'string',
  };
}

export function createEmptyGroup(): ConditionGroup {
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    logic: 'AND',
    rules: [createEmptyRule()],
  };
}

export function validateRule(rule: ConditionRule): { valid: boolean; error?: string } {
  if (!rule.variablePath) {
    return { valid: false, error: '请选择变量' };
  }
  
  if (OPERATORS_REQUIRING_VALUE.includes(rule.operator)) {
    if (!rule.value && rule.value !== '0') {
      return { valid: false, error: '请输入比较值' };
    }
    
    if (rule.valueType === 'number' && isNaN(Number(rule.value))) {
      return { valid: false, error: '请输入有效的数字' };
    }
  }
  
  return { valid: true };
}

export function validateGroups(groups: ConditionGroup[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!groups || groups.length === 0) {
    return { valid: true, errors: [] };
  }
  
  groups.forEach((group, groupIndex) => {
    if (!group.rules || group.rules.length === 0) {
      errors.push(`条件组 ${groupIndex + 1} 没有条件`);
      return;
    }
    
    group.rules.forEach((rule, ruleIndex) => {
      const validation = validateRule(rule);
      if (!validation.valid) {
        errors.push(`条件组 ${groupIndex + 1} 条件 ${ruleIndex + 1}: ${validation.error}`);
      }
    });
  });
  
  return { valid: errors.length === 0, errors };
}
