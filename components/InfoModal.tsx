
import React from 'react';
import { X, User, Hash, Calendar, Shield } from 'lucide-react';
import { BillingRow } from '../types';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BillingRow | null;
}

const formatDate = (excelDate: any): string => {
  let date: Date | null = null;

  // Handle string in "dd/mm/yyyy" format
  if (typeof excelDate === 'string' && excelDate.includes('/')) {
    const parts = excelDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        date = new Date(Date.UTC(year, month, day));
      }
    }
  } 
  // Handle Excel serial number
  else if (typeof excelDate === 'number') {
    const utcMilliseconds = (excelDate - 25569) * 86400 * 1000;
    date = new Date(utcMilliseconds);
  } 
  // Fallback for other standard date strings
  else if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if(!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (date && !isNaN(date.getTime())) {
    // Display using UTC timezone to prevent day-shifting
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  // If it's a string that couldn't be parsed but looks like the right format, return it as is.
  if (typeof excelDate === 'string') {
    return excelDate;
  }

  return String(excelDate); // Final fallback
};

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl p-8 w-full max-w-md m-4 border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 dark:bg-blue-500/10 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                <User size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data['Nome do aluno']}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Detalhes do Aluno</p>
            </div>
        </div>
        
        <div className="space-y-4">
            <div className="flex items-start p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Shield size={18} className="text-slate-400 mr-4 mt-1" />
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsável Financeiro</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{data['Nome do responsavel financeiro']}</p>
                </div>
            </div>
             <div className="flex items-start p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Hash size={18} className="text-slate-400 mr-4 mt-1" />
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Série</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{data['Serie']}</p>
                </div>
            </div>
             <div className="flex items-start p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <Calendar size={18} className="text-slate-400 mr-4 mt-1" />
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data de Vencimento</p>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{formatDate(data['Data de vencimento'])}</p>
                </div>
            </div>
        </div>
        <button
            onClick={onClose}
            className="w-full mt-8 text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Fechar
        </button>
      </div>
    </div>
  );
};
