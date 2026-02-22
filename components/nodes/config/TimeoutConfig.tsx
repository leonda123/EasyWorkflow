import React from 'react';
import { Clock } from 'lucide-react';

interface TimeoutConfigProps {
  value: number;
  onChange: (value: number) => void;
  defaultMs?: number;
}

const TimeoutConfig: React.FC<TimeoutConfigProps> = ({ value, onChange, defaultMs = 30000 }) => {
  const options = [
    { label: '5 秒', value: 5000 },
    { label: '10 秒', value: 10000 },
    { label: '30 秒', value: 30000 },
    { label: '1 分钟', value: 60000 },
    { label: '5 分钟', value: 300000 },
    { label: '10 分钟', value: 600000 },
  ];
  
  return (
    <div>
      <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-700">
        <Clock className="h-3.5 w-3.5 text-gray-400" />
        超时设置
      </label>
      <select
        value={value || defaultMs}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white outline-none focus:border-black"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}{opt.value === defaultMs ? '（默认）' : ''}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[10px] text-gray-400">节点执行超过此时间将自动终止</p>
    </div>
  );
};

export default TimeoutConfig;
