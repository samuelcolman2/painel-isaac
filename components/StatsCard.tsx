
import React from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  colorClass: string;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, subValue, icon, colorClass, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 p-6 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 flex items-start gap-4 hover:shadow-md transition-all hover:-translate-y-1 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className={`p-3.5 rounded-[16px] ${colorClass} shadow-inner`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 mb-1">{label}</p>
        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{value}</h3>
        {subValue && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            {subValue}
          </p>
        )}
      </div>
    </div>
  );
};
