
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts';
import { BillingRow } from '../types';

interface ChartProps {
  data: BillingRow[];
  isDark?: boolean;
}

export const DifferenceDistribution: React.FC<ChartProps> = ({ data, isDark }) => {
  const bins = [0, 5, 10, 15, 20, 25, 50, 100];
  const chartData = bins.map((bin, i) => {
    const nextBin = bins[i+1] || 1000;
    const count = data.filter(r => r.diff_percent >= bin && r.diff_percent < nextBin).length;
    return {
      range: i === bins.length - 1 ? `>${bin}%` : `${bin}-${nextBin}%`,
      count
    };
  });

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  return (
    <div className="h-[300px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: textColor }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: textColor }} />
          <Tooltip 
            cursor={{ fill: isDark ? '#1e293b' : '#f8fafc', opacity: 0.4 }}
            contentStyle={{ 
              borderRadius: '16px', 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' 
            }}
            itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
          />
          <Bar dataKey="count" fill={isDark ? '#3b82f6' : '#2563eb'} radius={[6, 6, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CompositionChart: React.FC<{ totalBilled: number; totalMin: number; isDark?: boolean }> = ({ totalBilled, totalMin, isDark }) => {
  const chartData = [
    { name: 'Valor Líquido', value: totalMin, color: isDark ? '#1e293b' : '#e2e8f0' },
    { name: 'Descontos (Bolsas)', value: totalBilled - totalMin, color: '#3b82f6' }
  ];

  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={8}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
            contentStyle={{ 
              borderRadius: '16px', 
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
            }}
            itemStyle={{ color: isDark ? '#f8fafc' : '#0f172a' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
