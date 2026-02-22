import React, { useState, useMemo } from 'react';
import { X, Play, AlertCircle, FileText, Globe, Calendar, Zap } from 'lucide-react';
import { FormField } from '../../types';
import { clsx } from 'clsx';

interface TestRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (input: any) => void;
  triggerType: 'webhook' | 'form' | 'schedule' | 'manual';
  formFields?: FormField[];
  formTitle?: string;
  isRunning?: boolean;
}

const TestRunModal: React.FC<TestRunModalProps> = ({
  isOpen,
  onClose,
  onRun,
  triggerType,
  formFields = [],
  formTitle,
  isRunning = false,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [jsonInput, setJsonInput] = useState('{\n  \n}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (triggerType === 'webhook') {
      try {
        const parsed = JSON.parse(jsonInput);
        onRun(parsed);
      } catch {
        setJsonError('JSON 格式无效');
        return;
      }
    } else if (triggerType === 'form') {
      const missingRequired = formFields.filter(f => {
        if (!f.required) return false;
        const value = formData[f.key];
        if (f.type === 'boolean') {
          return value === undefined || value === null;
        }
        return !value;
      });
      if (missingRequired.length > 0) {
        return;
      }
      onRun(formData);
    } else {
      onRun({});
    }
  };

  const updateFormField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonInput(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      setJsonError('JSON 格式无效，无法格式化');
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.key] ?? '';
    
    const commonClasses = "w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    switch (field.type) {
      case 'textarea':
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              value={value}
              onChange={(e) => updateFormField(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className={commonClasses}
            />
          </div>
        );
      
      case 'number':
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => updateFormField(field.key, e.target.valueAsNumber || '')}
              placeholder={field.placeholder}
              className={commonClasses}
            />
          </div>
        );
      
      case 'email':
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="email"
              value={value}
              onChange={(e) => updateFormField(field.key, e.target.value)}
              placeholder={field.placeholder || 'user@example.com'}
              className={commonClasses}
            />
          </div>
        );
      
      case 'boolean':
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateFormField(field.key, true)}
                className={clsx(
                  "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors border",
                  value === true
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-600"
                )}
              >
                ✓ 是 / True
              </button>
              <button
                type="button"
                onClick={() => updateFormField(field.key, false)}
                className={clsx(
                  "flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors border",
                  value === false
                    ? "bg-red-500 text-white border-red-500"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600"
                )}
              >
                ✗ 否 / False
              </button>
            </div>
          </div>
        );
      
      case 'select':
        const options = field.options?.split(',').map(o => o.trim()) || [];
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value}
              onChange={(e) => updateFormField(field.key, e.target.value)}
              className={commonClasses + " bg-white"}
            >
              <option value="">请选择...</option>
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        );
      
      case 'file':
        const fileValue = formData[field.key];
        const isFileObject = fileValue && typeof fileValue === 'object' && fileValue.data;
        
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="file"
              multiple={field.multiple}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length === 0) return;
                
                if (field.multiple) {
                  const readPromises = files.map(file => {
                    return new Promise((resolve) => {
                      const reader = new FileReader();
                      reader.onload = () => {
                        resolve({
                          name: file.name,
                          type: file.type,
                          size: file.size,
                          data: reader.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    });
                  });
                  Promise.all(readPromises).then(results => {
                    updateFormField(field.key, results);
                  });
                } else {
                  const file = files[0];
                  const reader = new FileReader();
                  reader.onload = () => {
                    updateFormField(field.key, {
                      name: file.name,
                      type: file.type,
                      size: file.size,
                      data: reader.result,
                    });
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {isFileObject && (
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                <FileText className="h-3 w-3" />
                <span className="truncate">{fileValue.name}</span>
                <span className="text-gray-400">({Math.round(fileValue.size / 1024)}KB)</span>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="space-y-2">
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => updateFormField(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={commonClasses}
            />
          </div>
        );
    }
  };

  const getTriggerIcon = () => {
    switch (triggerType) {
      case 'webhook': return <Globe className="h-4 w-4" />;
      case 'form': return <FileText className="h-4 w-4" />;
      case 'schedule': return <Calendar className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getTriggerLabel = () => {
    switch (triggerType) {
      case 'webhook': return 'Webhook 触发';
      case 'form': return formTitle || '表单触发';
      case 'schedule': return '定时触发';
      default: return '手动触发';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-[500px] max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 text-blue-600 p-1.5 rounded-md">
              <Play className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">试运行</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {getTriggerIcon()}
                <span>{getTriggerLabel()}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Webhook Type - JSON Editor */}
          {triggerType === 'webhook' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-700">请求体 (JSON)</label>
                <button
                  type="button"
                  onClick={formatJson}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  格式化
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setJsonError(null);
                }}
                className={clsx(
                  "w-full h-48 rounded-md border px-3 py-2 text-xs font-mono outline-none focus:ring-1 resize-none bg-gray-900 text-gray-100",
                  jsonError ? "border-red-300 focus:border-red-500 focus:ring-red-500" : "border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                )}
                placeholder='{"key": "value"}'
                spellCheck={false}
              />
              {jsonError && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  {jsonError}
                </div>
              )}
              <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-700">
                <strong>提示：</strong>输入 JSON 格式的请求数据，这些数据将作为 <code>trigger.body</code> 传入工作流。
              </div>
            </div>
          )}

          {/* Form Type - Dynamic Fields */}
          {triggerType === 'form' && (
            <div className="space-y-4">
              {formFields.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">未配置表单字段</p>
                  <p className="text-xs text-gray-400 mt-1">请在触发器节点中添加表单字段</p>
                </div>
              ) : (
                formFields.map((field) => (
                  <div key={field.id}>
                    {renderFormField(field)}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Schedule/Manual Type - Direct Run */}
          {(triggerType === 'schedule' || triggerType === 'manual') && (
            <div className="text-center py-6">
              {triggerType === 'schedule' ? (
                <>
                  <Calendar className="h-10 w-10 mx-auto text-blue-400 mb-3" />
                  <p className="text-sm text-gray-600">定时触发工作流</p>
                  <p className="text-xs text-gray-400 mt-1">点击"开始运行"直接执行工作流</p>
                </>
              ) : (
                <>
                  <Zap className="h-10 w-10 mx-auto text-yellow-400 mb-3" />
                  <p className="text-sm text-gray-600">手动触发工作流</p>
                  <p className="text-xs text-gray-400 mt-1">点击"开始运行"直接执行工作流</p>
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all shadow-sm bg-black hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  运行中...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  开始运行
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TestRunModal;
