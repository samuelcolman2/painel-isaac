
import React, { useState } from 'react';
import { FileText, Loader2, Save, X } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (unitName: string, file: File) => Promise<void>;
}

const PREDEFINED_UNITS = [
  'Unidade 1',
  'Unidade 2',
  'Unidade 3',
  'Unidade 4',
  'Unidade 5',
  'Unidade 6',
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [unitName, setUnitName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName || !file) {
      alert('Por favor, selecione uma unidade e um arquivo.');
      return;
    }
    setIsUploading(true);
    await onUpload(unitName, file);
    setIsUploading(false);
    onClose();
    setUnitName('');
    setFile(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl p-8 w-full max-w-md m-4 border border-slate-100 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Sincronizar Planilha</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="unitName" className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              Selecione a Unidade
            </label>
            <select
              id="unitName"
              value={unitName}
              onChange={(e) => setUnitName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
            >
              <option value="" disabled>Selecione uma unidade...</option>
              {PREDEFINED_UNITS.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              Arquivo (.xlsx, .csv)
            </label>
            <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-6 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition">
              <div className="text-center">
                <FileText className="mx-auto h-10 w-10 text-slate-400" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {file ? `Arquivo: ${file.name}` : 'Clique para selecionar'}
                </p>
              </div>
              <input id="file-upload" type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          </div>
          <button
            type="submit"
            disabled={isUploading || !unitName || !file}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Salvando...
              </>
            ) : (
              <>
                <Save size={20} />
                Salvar e Sincronizar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
