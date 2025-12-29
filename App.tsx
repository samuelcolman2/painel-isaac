
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, Loader2, Sparkles, AlertTriangle, 
  Wallet, ArrowRight, Moon, Sun, WifiOff, CloudUpload,
  Building, Users, CheckCheck, Info, Search, CheckCircle,
  CalendarClock, CircleDollarSign, Copy, Check
} from 'lucide-react';
import { BillingRow, SummaryStats, AnalysisStatus, AIInsight, Unit, StudentResolutions } from './types';
import { StatsCard } from './components/StatsCard';
import { DifferenceDistribution, CompositionChart } from './components/Charts';
import { UploadModal } from './components/UploadModal';
import { InfoModal } from './components/InfoModal';
import { ResolveModal } from './components/ResolveModal';
import { ResolvedListModal } from './components/ResolvedListModal';
import { analyzeBillingData } from './services/geminiService';
import { listenToAllUnitsData, saveUnitData, saveStudentResolution } from './services/firebaseService';

const parseExcelDate = (excelDate: any): Date | null => {
  // Priority 1: Handle string in "dd/mm/yyyy" format
  if (typeof excelDate === 'string' && excelDate.includes('/')) {
    const parts = excelDate.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        // Create a UTC date to avoid timezone shifts
        const date = new Date(Date.UTC(year, month, day));
        if (!isNaN(date.getTime())) {
            return date;
        }
      }
    }
  }

  // Priority 2: Handle Excel serial number
  if (typeof excelDate === 'number') {
    const utcMilliseconds = (excelDate - 25569) * 86400 * 1000;
    const date = new Date(utcMilliseconds);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Fallback for other standard date strings (e.g., ISO 8601)
  if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
};

const formatDate = (excelDate: any): string => {
  let date: Date | null = null;

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
  else if (typeof excelDate === 'number') {
    const utcMilliseconds = (excelDate - 25569) * 86400 * 1000;
    date = new Date(utcMilliseconds);
  } 
  else if (typeof excelDate === 'string') {
    const parsed = new Date(excelDate);
    if(!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (date && !isNaN(date.getTime())) {
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  }

  if (typeof excelDate === 'string') {
    return excelDate;
  }

  return String(excelDate);
};

const slugify = (str: string) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const App: React.FC = () => {
  const [allUnits, setAllUnits] = useState<Unit[]>([]);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.CONNECTING);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isErrorFilterActive, setIsErrorFilterActive] = useState(false);
  const [errorFilter, setErrorFilter] = useState({ date: true, value: true });

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [libReady, setLibReady] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedRowData, setSelectedRowData] = useState<BillingRow | null>(null);

  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [isResolvedListModalOpen, setIsResolvedListModalOpen] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Default to dark mode unless 'light' is explicitly set in localStorage.
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') !== 'light';
    }
    return true; // Fallback for non-browser environments
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    if ((window as any).XLSX) setLibReady(true);
    
    const unsubscribe = listenToAllUnitsData((unitsData) => {
        setAllUnits(unitsData);
        // Use functional update to avoid stale state issues and prevent resetting user selection.
        setSelectedUnitIds(currentSelectedIds => {
            // Only set a default if there are units and none are currently selected.
            if (unitsData.length > 0 && currentSelectedIds.length === 0) {
                return [unitsData[0].id];
            }
            // Otherwise, keep the current selection. This prevents view reset after resolving an item.
            return currentSelectedIds;
        });
        setStatus(unitsData.length > 0 ? AnalysisStatus.READY : AnalysisStatus.NO_DATA);
    }, (err) => setStatus(AnalysisStatus.ERROR));

    return () => unsubscribe();
  }, []);

  const aggregatedData = useMemo(() => {
    if (selectedUnitIds.length === 0) return [];
    const combinedData = allUnits
        .filter(unit => selectedUnitIds.includes(unit.id))
        .flatMap(unit => (unit.data || []).map(row => ({
            ...row,
            unitId: unit.id
        })));
    
    // Sort data alphabetically by student name
    return combinedData.sort((a, b) => 
        String(a['Nome do aluno']).localeCompare(String(b['Nome do aluno']))
    );
  }, [selectedUnitIds, allUnits]);


  const transformRawData = useCallback((rawData: any[][]): BillingRow[] => {
    const dataRows = rawData.slice(1); // Skip header row
    return dataRows.map((row: any) => {
      const billedStr = row[14] || 0; // Col O - Valor Bruto
      const minStr = row[16] || 0;    // Col Q - Valor Mínimo
      
      const safeParseCurrency = (value: any): number => {
        // If it's already a valid number from the sheet, use it directly.
        if (typeof value === 'number') {
            return value;
        } 
        
        // If it's a string, attempt to parse it from pt-BR currency format.
        if (typeof value === 'string') {
            // Remove currency symbols, thousands separators (.), and replace decimal comma (,) with a dot.
            const sanitized = value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
            const parsed = parseFloat(sanitized);
            // Return the parsed number, or 0 if parsing fails.
            return isNaN(parsed) ? 0 : parsed;
        } 
        
        // Return 0 for any other type or if value is null/undefined.
        return 0;
      };

      const billed = safeParseCurrency(billedStr);
      const min = safeParseCurrency(minStr);
      
      const diffValue = billed - min;
      const diffPercent = billed > 0 ? (diffValue / billed) * 100 : 0;
      
      return {
        'Nome do aluno': row[2] || 'N/A', // Col C
        'Nome do responsavel financeiro': row[3] || 'N/A', // Col D
        'Serie': row[9] || 'N/A', // Col J
        'Data de vencimento': row[11] || 'N/A', // Col L
        'Valor da cobrança com bolsas': billed, // Mapped from 'Valor Bruto'
        'Valor mínimo da cobrança': min,
        diff_abs: parseFloat(diffValue.toFixed(2)),
        diff_percent: parseFloat(diffPercent.toFixed(1))
      };
    }).filter(row => row['Nome do aluno'] !== 'N/A' && !isNaN(row['Valor da cobrança com bolsas']));
  }, []);
  
  const handleUpload = async (unitName: string, file: File) => {
    if (!libReady) return;
    const unitId = unitName.trim().toLowerCase().replace(/\s+/g, '-');
    const reader = new FileReader();
    
    return new Promise<void>((resolve, reject) => {
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = (window as any).XLSX.read(bstr, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = (window as any).XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
          const processedData = transformRawData(json);
          await saveUnitData(unitId, unitName.trim(), processedData);
          setSelectedUnitIds([unitId]);
          resolve();
        } catch (err) {
          alert("Erro ao processar e enviar o arquivo.");
          console.error("Upload Error:", err);
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const resolvedErrorsMap = useMemo(() => {
    const map = new Map<string, StudentResolutions>();
    allUnits
      .filter(unit => selectedUnitIds.includes(unit.id))
      .forEach(unit => {
        if (unit.resolutions) {
          Object.entries(unit.resolutions).forEach(([slug, resolutions]) => {
            map.set(slug, resolutions as StudentResolutions);
          });
        }
      });
    return map;
  }, [allUnits, selectedUnitIds]);

  const stats = useMemo((): SummaryStats | null => {
    if (aggregatedData.length === 0) return null;
    let totalBilled = 0, totalMin = 0, totalPercentSum = 0;
    const nameCounts: Record<string, number> = {};
    aggregatedData.forEach(item => {
      const name = item['Nome do aluno'];
      if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
      totalBilled += Number(item['Valor da cobrança com bolsas']) || 0;
      totalMin += Number(item['Valor mínimo da cobrança']) || 0;
      totalPercentSum += item.diff_percent || 0;
    });
    const duplicates = Object.entries(nameCounts).filter(([_, c]) => c > 1).map(([n, c]) => ({ name: n, count: c }));
    const validLength = aggregatedData.length || 1;
    return {
      totalRows: aggregatedData.length, duplicateCount: duplicates.length, duplicates,
      avgDiff: (totalBilled - totalMin) / validLength,
      avgPercent: totalPercentSum / validLength, totalBilled, totalMin
    };
  }, [aggregatedData]);
  
  const checkDueDateError = useCallback((row: BillingRow): boolean => {
    const dueDate = parseExcelDate(row['Data de vencimento']);
    if (!dueDate) {
        return true; // Error: Cannot parse date.
    }

    const dayOfMonth = dueDate.getUTCDate();
    const dayOfWeek = dueDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    const baseDates = [5, 10, 15];

    // Condition 1: Is the date one of the base dates (5, 10, 15)?
    // Now, base dates are always valid, regardless of the day of the week.
    if (baseDates.includes(dayOfMonth)) {
        return false; // VALID: It's a base date. No error.
    }

    // Condition 2: Is the date a Monday that follows a base date on a weekend?
    // This handles cases where payment is shifted to the next business day.
    if (dayOfWeek === 1) { // It's a Monday
        // Check if preceding Sunday was a base date
        const sunday = new Date(dueDate);
        sunday.setUTCDate(sunday.getUTCDate() - 1);
        if (baseDates.includes(sunday.getUTCDate())) {
            return false; // VALID: It's a Monday after a base date on Sunday. No error.
        }

        // Check if preceding Saturday was a base date
        const saturday = new Date(dueDate);
        saturday.setUTCDate(saturday.getUTCDate() - 2);
        if (baseDates.includes(saturday.getUTCDate())) {
            return false; // VALID: It's a Monday after a base date on Saturday. No error.
        }
    }

    // If none of the valid conditions are met, it's an error.
    return true;
  }, []);
  
  const filteredData = useMemo(() => {
    return aggregatedData.filter(item => {
      const matchesSearch = !searchTerm || Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (!matchesSearch) return false;

      if (!isErrorFilterActive) return true;

      const studentSlug = slugify(item['Nome do aluno']);
      const resolutions = resolvedErrorsMap.get(studentSlug) || {};

      const hasDateError = checkDueDateError(item);
      const isDateErrorUnresolved = hasDateError && !resolutions.date;

      const hasValueError = (Number(item['Valor da cobrança com bolsas']) < 1000) || (Number(item['Valor mínimo da cobrança']) < 1000);
      const isValueErrorUnresolved = hasValueError && !resolutions.value;
      
      const passesDateFilter = errorFilter.date && isDateErrorUnresolved;
      const passesValueFilter = errorFilter.value && isValueErrorUnresolved;
      
      return passesDateFilter || passesValueFilter;
    });
  }, [aggregatedData, searchTerm, isErrorFilterActive, errorFilter, resolvedErrorsMap, checkDueDateError]);

  const errorStats = useMemo(() => {
    let invalidDueDateCount = 0;
    let lowValueCount = 0;
    let resolvedCount = 0;

    const resolvedSlugs = new Set<string>();

    aggregatedData.forEach(item => {
        const studentSlug = slugify(item['Nome do aluno']);
        const resolutions = resolvedErrorsMap.get(studentSlug) || {};

        if (checkDueDateError(item) && !resolutions.date) {
            invalidDueDateCount++;
        }

        const hasValueError = (Number(item['Valor da cobrança com bolsas']) < 1000) || (Number(item['Valor mínimo da cobrança']) < 1000);
        if (hasValueError && !resolutions.value) {
            lowValueCount++;
        }

        if(resolutions.date || resolutions.value) {
            resolvedSlugs.add(studentSlug);
        }
    });
    
    return { invalidDueDateCount, lowValueCount, resolvedCount: resolvedSlugs.size };
  }, [aggregatedData, resolvedErrorsMap, checkDueDateError]);

  const resolvedStudentsData = useMemo(() => {
    const studentSlugToNameMap = new Map<string, string>();
    allUnits.forEach(unit => {
      unit.data?.forEach(row => {
        studentSlugToNameMap.set(slugify(row['Nome do aluno']), row['Nome do aluno']);
      });
    });

    const resolvedList: { name: string; note: string; resolvedAt: string; }[] = [];
    allUnits
      .filter(unit => selectedUnitIds.includes(unit.id))
      .forEach(unit => {
        if (unit.resolutions) {
          Object.entries(unit.resolutions).forEach(([slug, studentResolutions]) => {
            const typedResolutions = studentResolutions as StudentResolutions;
            const studentName = studentSlugToNameMap.get(slug) || slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (typedResolutions.date) {
              resolvedList.push({ name: studentName, note: typedResolutions.date.note, resolvedAt: typedResolutions.date.resolvedAt });
            }
            if (typedResolutions.value) {
              resolvedList.push({ name: studentName, note: typedResolutions.value.note, resolvedAt: typedResolutions.value.resolvedAt });
            }
          });
        }
      });
    return resolvedList.sort((a, b) => new Date(b.resolvedAt).getTime() - new Date(a.resolvedAt).getTime());
  }, [allUnits, selectedUnitIds]);

  const handleToggleSubFilter = (type: 'date' | 'value') => {
    setErrorFilter(prev => {
      const newState = { ...prev, [type]: !prev[type] };
      if (!newState.date && !newState.value) {
        return prev;
      }
      return newState;
    });
  };
  
  const runAiAnalysis = async () => {
    if (aggregatedData.length === 0) return;
    setIsAiLoading(true);
    try { setAiInsight(await analyzeBillingData(aggregatedData)); } 
    catch (error) { alert("Erro ao consultar a IA."); } 
    finally { setIsAiLoading(false); }
  };

  const handleUnitSelectionToggle = (unitId: string) => {
    setSelectedUnitIds(prev => 
      prev.includes(unitId) 
      ? prev.filter(id => id !== unitId) 
      : [...prev, unitId]
    );
  };

  const handleSelectAllUnits = () => {
    if (selectedUnitIds.length === allUnits.length) {
      setSelectedUnitIds([]);
    } else {
      setSelectedUnitIds(allUnits.map(u => u.id));
    }
  };

  const openInfoModal = (row: BillingRow) => {
    setSelectedRowData(row);
    setIsInfoModalOpen(true);
  };
  
  const openResolveModal = (row: BillingRow) => {
    setSelectedRowData(row);
    setIsResolveModalOpen(true);
  };

  const handleResolveStudent = async (studentName: string, unitId: string, notes: string, errorType: 'date' | 'value') => {
    try {
        await saveStudentResolution(unitId, studentName, notes, errorType);
    } catch (error) {
        console.error("Failed to save resolution:", error);
        alert("Não foi possível salvar a resolução. Tente novamente.");
    }
  };

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name).then(() => {
      setCopiedName(name);
      setTimeout(() => setCopiedName(null), 2000);
    }).catch(err => {
      console.error('Failed to copy name: ', err);
    });
  };

  const renderContent = () => {
    switch (status) {
      case AnalysisStatus.CONNECTING:
        return <div className="text-center"><Loader2 className="animate-spin text-blue-500 mx-auto mb-4" size={48} /><h2 className="text-xl font-bold text-slate-800 dark:text-white">Conectando...</h2></div>;
      case AnalysisStatus.ERROR:
        return <div className="text-center"><WifiOff className="text-red-500 mx-auto mb-4" size={48} /><h2 className="text-xl font-bold text-red-500">Falha na conexão</h2></div>;
      case AnalysisStatus.NO_DATA:
         return <div className="text-center"><Building className="text-slate-400 mx-auto mb-4" size={48} /><h2 className="text-2xl font-bold dark:text-white">Nenhuma unidade encontrada</h2><p className="text-slate-500 mt-2">Sincronize uma planilha para criar sua primeira unidade.</p></div>;
      case AnalysisStatus.READY:
        if (selectedUnitIds.length === 0) {
           return <div className="text-center"><Building className="text-blue-500 mx-auto mb-4" size={48} /><h2 className="text-2xl font-bold dark:text-white">Nenhuma Unidade Selecionada</h2><p className="text-slate-500 mt-2">Escolha uma ou mais unidades no menu acima para começar.</p></div>;
        }
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsCard label="Alunos Exibidos" value={filteredData.length} icon={<Users size={22} />} colorClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"/>
              <StatsCard label="Saldo Total Bruto" value={`R$ ${stats?.totalBilled.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subValue={`Valor Líquido: R$ ${stats?.totalMin.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={<Wallet size={22} />} colorClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"/>
            </div>

            {isErrorFilterActive && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in">
                <StatsCard 
                  label="Vencimento Inválido" 
                  value={errorStats.invalidDueDateCount} 
                  icon={<CalendarClock size={22} />} 
                  colorClass="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                  subValue="Fora dos dias 5, 10, 15 ou próximo dia útil"
                />
                <StatsCard 
                  label="Valor Possivelmente Errado" 
                  value={errorStats.lowValueCount} 
                  icon={<CircleDollarSign size={22} />} 
                  colorClass="bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                  subValue="Total de cobranças abaixo de R$ 1.000"
                />
                 <StatsCard 
                    label="Erros Solucionados"
                    value={errorStats.resolvedCount}
                    icon={<CheckCircle size={22} />}
                    colorClass="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
                    subValue="Total de pendências resolvidas"
                    onClick={() => setIsResolvedListModalOpen(true)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              {aiInsight && <div className="bg-blue-50 dark:bg-blue-600/90 text-blue-900 dark:text-white rounded-[28px] p-8 shadow-2xl shadow-blue-500/20 relative overflow-hidden"><Sparkles className="absolute -right-4 -top-4 text-blue-500/10 dark:text-white/10 w-32 h-32"/><h3 className="text-xl font-bold mb-4 flex gap-2"><Sparkles size={20}/>Insights da IA</h3><p className="text-blue-800 dark:text-blue-50 text-sm italic mb-6">"{aiInsight.summary}"</p><div className="space-y-4"><h4 className="text-[10px] font-black tracking-widest text-blue-500 dark:text-blue-200 mb-2">Recomendações</h4><ul className="space-y-2">{aiInsight.recommendations.map((r, i) => <li key={i} className="text-xs flex gap-2 items-start bg-blue-100/50 dark:bg-white/10 p-2 rounded-xl"><ArrowRight size={12} className="mt-0.5 shrink-0"/>{r}</li>)}</ul></div></div>}
              <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-100 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-white mb-4">Composição Financeira</h3><CompositionChart totalBilled={stats?.totalBilled || 0} totalMin={stats?.totalMin || 0} isDark={isDarkMode}/></div>
              <div className="bg-white dark:bg-slate-900 rounded-[28px] p-6 shadow-sm border border-slate-100 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-white mb-4 flex justify-between">Duplicidades<span>{stats?.duplicateCount}</span></h3><div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">{stats?.duplicates.length ? stats.duplicates.map((d, i) => <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate pr-2">{d.name}</span><span className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 text-[10px] font-black px-2 py-1 rounded-md">{d.count}x</span></div>) : <p className="text-slate-400 text-sm text-center py-8">Livre de duplicidades.</p>}</div></div>
            </div>
             <div className="lg:col-span-8 space-y-8">
               <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-800 h-[700px] flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[250px]">
                    <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Filtrar lançamentos..." 
                        className="w-full pl-12 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-blue-500 rounded-[18px] text-sm outline-none text-slate-900 dark:text-white" 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsErrorFilterActive(prev => !prev)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-[18px] text-sm font-bold transition-colors shrink-0 ${
                          isErrorFilterActive 
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-500/30' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <AlertTriangle size={16} />
                      <span>Possíveis Erros</span>
                    </button>
                    {isErrorFilterActive && (
                      <div className="flex items-center gap-2 animate-in fade-in">
                        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                        <button
                          onClick={() => handleToggleSubFilter('date')}
                          title="Filtrar por Vencimento Inválido"
                          className={`p-3 rounded-[14px] transition-colors ${
                            errorFilter.date 
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <CalendarClock size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleSubFilter('value')}
                          title="Filtrar por Valor Errado"
                          className={`p-3 rounded-[14px] transition-colors ${
                            errorFilter.value
                            ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' 
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          <CircleDollarSign size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-800/50 sticky top-0 backdrop-blur-sm">
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase">Aluno</th>
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase text-right">Valor Bruto</th>
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase text-right">Desconto</th>
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] uppercase text-right">Valor Líquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredData.slice(0, 500).map((row, idx)=>{
                        const studentSlug = slugify(row['Nome do aluno']);
                        const resolutions = resolvedErrorsMap.get(studentSlug) || {};

                        const hasDateError = checkDueDateError(row);
                        const isDateErrorUnresolved = hasDateError && !resolutions.date;

                        const hasValueError = (Number(row['Valor da cobrança com bolsas']) < 1000) || (Number(row['Valor mínimo da cobrança']) < 1000);
                        const isValueErrorUnresolved = hasValueError && !resolutions.value;

                        const hasAnyError = hasDateError || hasValueError;
                        const isFullyResolved = hasAnyError && !isDateErrorUnresolved && !isValueErrorUnresolved;

                        return (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {isErrorFilterActive && isDateErrorUnresolved && (
                                <div className="text-[9px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full inline-block">
                                  VENCIMENTO INVÁLIDO: {formatDate(row['Data de vencimento'])}
                                </div>
                              )}
                              {isErrorFilterActive && isValueErrorUnresolved && (
                                <div className="text-[9px] font-bold text-red-600 bg-red-100 dark:bg-red-500/10 dark:text-red-400 px-2 py-0.5 rounded-full inline-block">
                                  VALOR INVÁLIDO
                                </div>
                              )}
                              <div className="flex items-center gap-3">
                                <button 
                                  onClick={() => handleCopyName(row['Nome do aluno'])}
                                  title="Copiar nome"
                                  className="text-slate-400 hover:text-blue-500 transition-colors"
                                >
                                  {copiedName === row['Nome do aluno'] ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                </button>
                                <div className={`font-bold truncate max-w-xs ${
                                  isFullyResolved
                                  ? 'text-green-500' 
                                  : 'text-slate-900 dark:text-white'
                                }`}>{row['Nome do aluno']}</div>
                                <button onClick={() => openInfoModal(row)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                  <Info size={14}/>
                                </button>
                                {isErrorFilterActive && (isDateErrorUnresolved || isValueErrorUnresolved) && (
                                  <button 
                                    onClick={() => openResolveModal(row)} 
                                    title="Resolver pendência"
                                    className="text-slate-400 hover:text-green-500 transition-colors"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300 font-medium tabular-nums">R$ {Number(row['Valor da cobrança com bolsas']).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-6 py-4 text-right">
                            <div className={`font-black text-base ${
                              row.diff_percent >= 50 ? 'text-red-500' :
                              row.diff_percent > 0 ? 'text-amber-600' :
                              'text-blue-600 dark:text-blue-400'
                            }`}>{row.diff_percent.toFixed(1)}%</div>
                            <div className="text-[10px] text-slate-400 font-bold">R$ {row.diff_abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </td>
                          <td className="px-6 py-4 text-right text-green-400 font-semibold tabular-nums">R$ {Number(row['Valor mínimo da cobrança']).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 shadow-sm border border-slate-100 dark:border-slate-800"><h3 className="font-bold text-slate-800 dark:text-white mb-6">Distribuição de Desconto</h3><DifferenceDistribution data={aggregatedData} isDark={isDarkMode}/></div>
            </div>
          </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} data={selectedRowData} />
      <ResolvedListModal
        isOpen={isResolvedListModalOpen}
        onClose={() => setIsResolvedListModalOpen(false)}
        data={resolvedStudentsData}
      />
      <ResolveModal 
        isOpen={isResolveModalOpen} 
        onClose={() => setIsResolveModalOpen(false)} 
        data={selectedRowData}
        onResolve={(studentName, notes, errorType) => {
            if (selectedRowData?.unitId) {
                handleResolveStudent(studentName, selectedRowData.unitId, notes, errorType);
            } else {
                alert("Erro: ID da unidade não encontrado para este aluno.");
            }
        }}
      />

      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-800 dark:text-slate-300 transition-colors pb-20">
        <nav className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-3">
          <div className="max-w-7xl mx-auto flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src="https://iconecolegioecurso.com.br/wp-content/uploads/2022/08/xlogo_icone_site.png.pagespeed.ic_.QgXP3GszLC.webp" alt="Isaac Logo" className="w-8 h-8" />
                    <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Isaac</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                        {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
                    </button>
                    <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-2 bg-slate-900 dark:bg-blue-600 text-white px-4 py-2 rounded-xl hover:opacity-90 font-bold text-sm shadow-sm">
                        <CloudUpload size={16}/> Sincronizar
                    </button>
                </div>
            </div>
            {allUnits.length > 0 && <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center gap-2 overflow-x-auto">
                <button onClick={handleSelectAllUnits} className={`flex items-center gap-2 whitespace-rap text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${selectedUnitIds.length === allUnits.length ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                    <CheckCheck size={14} />
                    Selecionar Todas
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-slate-700"></div>
                {allUnits.map(unit => (
                    <button 
                        key={unit.id}
                        onClick={() => handleUnitSelectionToggle(unit.id)}
                        className={`whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${selectedUnitIds.includes(unit.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        {unit.name}
                    </button>
                ))}
            </div>}
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 mt-8 flex items-center justify-center min-h-[70vh]">
          {renderContent()}
        </main>
      </div>
    </>
  );
};

export default App;
