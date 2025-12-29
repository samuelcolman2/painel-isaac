
import React from 'react';
import { X, Check, UserCheck } from 'lucide-react';

interface ResolvedListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    name: string;
    note: string;
    resolvedAt: string;
  }[];
}

export const ResolvedListModal: React.FC<ResolvedListModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl p-8 w-full max-w-lg m-4 border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 dark:bg-green-500/10 p-3 rounded-xl text-green-600 dark:text-green-400">
            <UserCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Erros Solucionados</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Lista de pendências resolvidas</p>
          </div>
        </div>

        <div className="overflow-y-auto pr-2 flex-1">
          {data.length > 0 ? (
            <div className="space-y-3">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Resolvido em {new Date(item.resolvedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-500/10 px-3 py-1.5 rounded-full text-xs font-bold">
                    <Check size={14} />
                    <span>{item.note}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 dark:text-slate-400 py-10">
              Nenhuma pendência foi resolvida ainda.
            </p>
          )}
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
