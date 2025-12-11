// File: components/Calendar.tsx
// Componente para exibir um calendário mensal com as OSs distribuídas por data

import React, { useState, useMemo } from 'react';
import { OS, Priority, Role } from '../types'; 
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { OS_ACTIVITIES } from '../constants';
import Modal from './modals/Modal';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, FileText, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { generateOSReport } from './utils/pdfGenerator';

interface CalendarProps {
  osList: OS[];
  onCardClick: (os: OS) => void;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  dayNumber: number;
}

const Calendar: React.FC<CalendarProps> = ({ osList, onCardClick }) => {
  const { plants, users, filterOSForUser } = useData();
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filtros
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // Relatório
  const [reportStartDate, setReportStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false); // ✅ NOVO ESTADO

  const [moreInfoModal, setMoreInfoModal] = useState<{ isOpen: boolean; title: string; items: OS[] }>({
      isOpen: false, title: '', items: []
  });

  // Helpers
  const clients = Array.from(new Set(plants.map(p => p.client))).sort();
  const filteredPlants = selectedClient ? plants.filter(p => p.client === selectedClient) : plants;
  
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';

  const technicians = useMemo(() => {
    return users.filter(u => {
      if (u.role !== Role.TECHNICIAN) return false;
      if ((user?.role === Role.ADMIN || user?.role === Role.OPERATOR) && !selectedPlant) return true;
      if (selectedPlant) return u.plantIds && u.plantIds.includes(selectedPlant);
      return true;
    });
  }, [users, selectedPlant, user?.role]);

  const uniqueAssets = useMemo(() => {
    const assetsSet = new Set<string>();
    osList.forEach(os => {
        if ((os as any).assetName) assetsSet.add((os as any).assetName);
        if (os.assets && os.assets.length > 0) os.assets.forEach(a => assetsSet.add(a));
    });
    return Array.from(assetsSet).sort();
  }, [osList]);

  const visibleOS = useMemo(() => {
    let list = user ? filterOSForUser(user) : osList;
    list = list.filter(os => {
        if (selectedPlant && os.plantId !== selectedPlant) return false;
        if (selectedPriority && os.priority !== selectedPriority) return false;
        if (selectedAsset) {
             const hasAsset = (os.assets && os.assets.includes(selectedAsset)) || 
                              ((os as any).assetName === selectedAsset);
             if (!hasAsset) return false;
        }
        if (selectedTechnician && os.technicianId !== selectedTechnician) return false;
        if (selectedClient && !selectedPlant) {
            const plant = plants.find(p => p.id === os.plantId);
            if (plant?.client !== selectedClient) return false;
        }
        return true;
    });
    return list;
  }, [osList, user, filterOSForUser, selectedClient, selectedPlant, selectedPriority, selectedAsset, selectedTechnician, plants]);

  // --- DOWNLOAD PDF CORRIGIDO ---
  const handleDownloadReport = async (type: 'summary' | 'complete') => {
    const reportData = visibleOS.filter(os => {
      const osDate = new Date(os.startDate);
      const start = parseISO(reportStartDate);
      const end = parseISO(reportEndDate);
      end.setHours(23, 59, 59, 999);
      return isWithinInterval(osDate, { start, end });
    });

    if (reportData.length === 0) {
      alert("Nenhuma OS encontrada para os filtros e período selecionados.");
      return;
    }

    if (type === 'complete') {
        setIsGeneratingPDF(true); // ✅ Ativa loading
        try {
            await generateOSReport(
                reportData, 
                "Relatório Completo de Manutenção",
                { getPlantName, getUserName }
            );
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar PDF.");
        } finally {
            setIsGeneratingPDF(false); // ✅ Desativa loading
        }
    } else {
        // --- RELATÓRIO RESUMIDO ---
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Relatório Resumido de Manutenção", 14, 15);
        doc.setFontSize(10);
        const periodo = `Período: ${format(parseISO(reportStartDate), 'dd/MM/yyyy')} a ${format(parseISO(reportEndDate), 'dd/MM/yyyy')}`;
        doc.text(periodo, 14, 22);
        doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 27);

        const head = [['Data', 'OS ID', 'Usina', 'Ativo', 'Tarefa', 'Técnico', 'Status']];
        const body = reportData.map(os => {
            const assetName = (os as any).assetName || (os.assets && os.assets.length > 0 ? os.assets.join(', ') : 'Geral');
            return [
                format(new Date(os.startDate), 'dd/MM/yyyy'),
                os.id,
                getPlantName(os.plantId),
                assetName,
                os.activity,
                getUserName(os.technicianId),
                os.status
            ];
        });

        autoTable(doc, {
            startY: 35,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185] },
            styles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 18 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 },
                4: { cellWidth: 'auto' },
                5: { cellWidth: 25 },
                6: { cellWidth: 20 }
            }
        });
        
        doc.save(`Resumo_${reportStartDate}.pdf`);
    }
  };

  const calendarDays = useMemo<DayInfo[]>(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: DayInfo[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false, dayNumber: prevMonthLastDay - i });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrentMonth: true, dayNumber: day });
    }
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrentMonth: false, dayNumber: day });
    }
    return days;
  }, [currentDate]);

  const osByDate = useMemo(() => {
    const grouped: Record<string, OS[]> = {};
    visibleOS.forEach(os => {
      if (os.startDate) {
        const osDate = new Date(os.startDate);
        const dateKey = `${osDate.getFullYear()}-${osDate.getMonth()}-${osDate.getDate()}`;
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(os);
      }
    });
    return grouped;
  }, [visibleOS]);

  const getOSsForDate = (date: Date): OS[] => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return osByDate[dateKey] || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case Priority.URGENT: return 'bg-red-500 border-l-4 border-red-700 text-white';
      case Priority.HIGH: return 'bg-orange-500 border-l-4 border-orange-700 text-white';
      case Priority.MEDIUM: return 'bg-yellow-500 border-l-4 border-yellow-700 text-white';
      case Priority.LOW: return 'bg-green-500 border-l-4 border-green-700 text-white';
      default: return 'bg-gray-500 border-l-4 border-gray-700 text-white';
    }
  };

  const handleShowMore = (date: Date, items: OS[]) => {
      setMoreInfoModal({ isOpen: true, title: `OSs do dia ${date.toLocaleDateString()}`, items: items });
  };

  const selectClass = "text-sm border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-1 px-2";

  return (
    <div className="h-full flex flex-col p-4 bg-gray-50 dark:bg-gray-900 space-y-4">
      
      {/* 1. BARRA DE FILTROS */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2 flex items-center">
                <Filter className="w-4 h-4 mr-1" /> Filtros:
            </span>
            <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setSelectedPlant(''); }} className={selectClass}><option value="">Todos Clientes</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className={selectClass} disabled={!selectedClient && plants.length > 20}><option value="">Todas Usinas</option>{filteredPlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className={selectClass}><option value="">Todas Prioridades</option>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)} className={selectClass}><option value="">Todos Ativos</option>{uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}</select>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className={selectClass}><option value="">Todos Técnicos</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>
      </div>

      {/* 2. BARRA DE RELATÓRIOS E NAVEGAÇÃO */}
      <div className="bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 p-3 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-gray-200 rounded text-gray-600 dark:text-gray-300"><ChevronLeft className="w-5 h-5" /></button>
                <span className="font-bold text-lg text-gray-800 dark:text-gray-200 w-40 text-center capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-gray-200 rounded text-gray-600 dark:text-gray-300"><ChevronRight className="w-5 h-5" /></button>
                <button onClick={() => setCurrentDate(new Date())} className="text-xs text-blue-600 hover:underline ml-2">Hoje</button>
            </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="flex flex-col md:flex-row items-center gap-2 text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">Relatório de:</span>
                <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className={selectClass} />
                <span className="text-gray-400">até</span>
                <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className={selectClass} />
             </div>
             <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>
             
             <button onClick={() => handleDownloadReport('summary')} className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-50 transition-colors">
                <FileText className="w-4 h-4" /> Resumido
             </button>
             
             {/* ✅ BOTÃO COM ESTADO CORRETO */}
             <button 
                onClick={() => handleDownloadReport('complete')} 
                disabled={isGeneratingPDF}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
                {isGeneratingPDF ? (
                    <span className="animate-pulse">Gerando...</span>
                ) : (
                    <>
                        <Download className="w-4 h-4" /> Completo
                    </>
                )}
             </button>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700 flex-1">
        <div className="grid grid-cols-7 border-b border-gray-300 dark:border-gray-700">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr h-full overflow-y-auto">
          {calendarDays.map((dayData, index) => {
            const osListForDay = getOSsForDate(dayData.date);
            const isToday = dayData.date.toDateString() === new Date().toDateString();
            return (
              <div key={index} className={`min-h-[100px] border border-gray-200 dark:border-gray-700 p-2 ${dayData.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-50'} ${isToday ? 'ring-1 ring-blue-500' : ''}`}>
                <div className={`text-xs font-semibold mb-1 flex justify-between ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    <span>{dayData.dayNumber}</span>
                    {osListForDay.length > 0 && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1 rounded">{osListForDay.length}</span>}
                </div>
                <div className="space-y-1">
                  {osListForDay.slice(0, 3).map(os => (
                    <div key={os.id} onClick={() => onCardClick(os)} className={`p-1 rounded text-[10px] cursor-pointer hover:opacity-80 text-white truncate shadow-sm ${getPriorityColor(os.priority)}`} title={`${getPlantName(os.plantId)} - ${os.activity}`}>
                      <span className="font-bold mr-1">{(os as any).assetName || (os.assets[0] || 'Geral')}:</span>
                      {os.activity}
                    </div>
                  ))}
                  {osListForDay.length > 3 && (
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 text-center" onClick={(e) => { e.stopPropagation(); handleShowMore(dayData.date, osListForDay); }}>
                        +{osListForDay.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Modal Ver Mais */}
      {moreInfoModal.isOpen && (
          <Modal isOpen={true} onClose={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} title={moreInfoModal.title} footer={<button onClick={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} className="btn-secondary">Fechar</button>}>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
                  {moreInfoModal.items.map(os => (
                      <div key={os.id} onClick={() => { setMoreInfoModal({ ...moreInfoModal, isOpen: false }); onCardClick(os); }} className={`p-3 rounded-lg text-white cursor-pointer hover:opacity-90 shadow-sm flex justify-between items-center ${getPriorityColor(os.priority)}`}>
                          <div className="flex flex-col overflow-hidden">
                             <span className="font-bold text-sm">{(os as any).assetName || (os.assets[0] || 'Geral')}</span>
                             <span className="text-xs truncate">{os.activity}</span>
                          </div>
                          <span className="text-xs bg-black/20 px-2 py-0.5 rounded whitespace-nowrap ml-2">{new Date(os.startDate).toLocaleDateString()}</span>
                      </div>
                  ))}
              </div>
          </Modal>
      )}
    </div>
  );
};

export default Calendar;