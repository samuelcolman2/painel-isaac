
import React, { useState } from 'react';
import { X, User, CheckCircle, Loader2 } from 'lucide-react';
import { BillingRow } from '../types';

interface ResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolve: (studentName: string, notes: string, errorType: 'date' | 'value') => void;
  data: BillingRow | null;
}

const PREDEFINED_NOTES = [
  "Data Correta",
  "Valor Correto"
];

export const ResolveModal: React.FC<ResolveModalProps> = ({ isOpen, onClose, onResolve, data }) => {
  const [selectedNote, setSelectedNote] = useState<string>('');
  const [isResolving, setIsResolving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !selectedNote) return;
    setIsResolving(true);
    
    // Using a promise to simulate async operation, can be replaced with actual API call
    new Promise(resolve => setTimeout(resolve, 500)).then(() => {
      const errorType = selectedNote === 'Data Correta' ? 'date' : 'value';
      onResolve(data['Nome do aluno'], selectedNote, errorType);
      setIsResolving(false);
      onClose();
      setSelectedNote('');
    });
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl p-8 w-full max-w-md m-4 border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 dark:bg-amber-500/10 p-3 rounded-xl text-amber-600 dark:text-amber-400">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{data['Nome do aluno']}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Resolver Pendência</p>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              Selecione a Resolução
            </label>
            <div className="space-y-3">
              {PREDEFINED_NOTES.map(note => (
                <button
                  type="button"
                  key={note}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm font-semibold flex items-center justify-between ${
                    selectedNote === note
                      ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-500 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  <span>{note}</span>
                  {selectedNote === note && <CheckCircle className="text-blue-500" size={18} />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="w-full text-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 px-6 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isResolving || !selectedNote}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResolving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <CheckCircle size={20} />
              )}
              Concluir Resolução
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};