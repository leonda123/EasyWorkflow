import React from 'react';
import { Clock } from 'lucide-react';

interface DelayNodeConfigProps {
    config: any;
    onChange: (key: string, value: any) => void;
}

const DelayNodeConfig: React.FC<DelayNodeConfigProps> = ({ config, onChange }) => {
    const delayConfig = config?.delayConfig || { duration: 1, unit: 'seconds' };

    const updateDelay = (key: string, value: any) => {
        onChange('delayConfig', { ...delayConfig, [key]: value });
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-3 text-xs text-yellow-800">
                <Clock className="h-4 w-4 inline-block mr-1 mb-0.5" />
                暂停工作流执行一段指定的时间。
             </div>
             
             <div className="flex gap-2">
                 <div className="flex-1">
                     <label className="mb-1 block text-xs font-medium text-gray-700">时长</label>
                     <input 
                        type="number"
                        min="0"
                        value={delayConfig.duration}
                        onChange={(e) => updateDelay('duration', parseInt(e.target.value) || 0)}
                        className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm outline-none focus:border-black"
                     />
                 </div>
                 <div className="w-1/3">
                     <label className="mb-1 block text-xs font-medium text-gray-700">单位</label>
                     <select
                        value={delayConfig.unit}
                        onChange={(e) => updateDelay('unit', e.target.value)}
                        className="w-full rounded-md border border-gray-200 px-2 py-2 text-sm bg-white outline-none focus:border-black"
                     >
                         <option value="ms">毫秒</option>
                         <option value="seconds">秒</option>
                         <option value="minutes">分钟</option>
                     </select>
                 </div>
             </div>
        </div>
    );
};

export default DelayNodeConfig;