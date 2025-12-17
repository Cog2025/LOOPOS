// File: components/Board.tsx
import React, { useState } from 'react';
import { OS, OSStatus } from '../types';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import { Clock, AlertCircle, CheckCircle, PlayCircle, CalendarClock, Download, ChevronDown } from 'lucide-react';
import { useData } from '../contexts/DataContext';

interface BoardProps {
  osList: OS[];
  onOpenDownloadFilter: (status?: string) => void;
  onCardClick: (os: OS) => void;
}

const ITEMS_PER_PAGE = 10;

const Board: React.FC<BoardProps> = ({ osList, onOpenDownloadFilter, onCardClick }) => {
  const { plants, users } = useData();

  // Estado para controlar a paginação por coluna (ID da coluna -> Quantidade visível)
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});

  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || 'Usina não encontrada';
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || 'N/A';

  // DATA DE HOJE
  const today = startOfDay(new Date());

  // Função para carregar mais itens em uma coluna específica
  const handleLoadMore = (columnId: string) => {
    setVisibleCount(prev => ({
        ...prev,
        [columnId]: (prev[columnId] || ITEMS_PER_PAGE) + ITEMS_PER_PAGE
    }));
  };

  // --- LÓGICA DE COLUNAS ---
  const columns = [
    {
      id: 'future', 
      title: 'Futuras',
      icon: CalendarClock,
      color: 'bg-indigo-500',
      items: osList.filter(os => {
          if (os.status !== OSStatus.PENDING) return false;
          const osDate = parseISO(os.startDate); 
          return isAfter(osDate, today) && os.startDate !== format(today, 'yyyy-MM-dd');
      })
    },
    {
      id: OSStatus.PENDING,
      title: 'Pendente',
      icon: AlertCircle,
      color: 'bg-yellow-500',
      items: osList.filter(os => {
          if (os.status !== OSStatus.PENDING) return false;
          const osDate = parseISO(os.startDate);
          return !isAfter(osDate, today) || os.startDate === format(today, 'yyyy-MM-dd');
      })
    },
    {
      id: OSStatus.IN_PROGRESS,
      title: 'Em Execução',
      icon: PlayCircle,
      color: 'bg-blue-500',
      items: osList.filter(os => os.status === OSStatus.IN_PROGRESS)
    },
    {
      id: OSStatus.IN_REVIEW,
      title: 'Em Revisão',
      icon: Clock,
      color: 'bg-purple-500',
      items: osList.filter(os => os.status === OSStatus.IN_REVIEW)
    },
    {
      id: OSStatus.COMPLETED,
      title: 'Concluído',
      icon: CheckCircle,
      color: 'bg-green-500',
      items: osList.filter(os => os.status === OSStatus.COMPLETED)
    }
  ];

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden p-6">
      <div className="flex gap-6 h-full min-w-[1400px]">
        {columns.map(col => {
            // Paginação Local
            const currentLimit = visibleCount[col.id] || ITEMS_PER_PAGE;
            const visibleItems = col.items.slice(0, currentLimit);
            const hasMore = col.items.length > currentLimit;

            return (
              <div key={col.id} className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 h-full max-w-xs">
                
                {/* Header */}
                <div className={`p-3 rounded-t-xl flex justify-between items-center text-white ${col.color}`}>
                  <div className="flex items-center gap-2 font-bold">
                    <col.icon size={18} />
                    <span>{col.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{col.items.length}</span>
                      {col.id !== 'future' && ( 
                          <button 
                            onClick={() => onOpenDownloadFilter(col.id)}
                            className="hover:bg-white/20 p-1 rounded transition-colors"
                            title="Baixar relatório"
                          >
                              <Download size={14} />
                          </button>
                      )}
                  </div>
                </div>

                {/* Lista de Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {visibleItems.map(os => (
                    <div 
                      key={os.id} 
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => onCardClick(os)} 
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{os.id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold
                            ${os.priority === 'Alta' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                            {os.priority}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm mb-1 line-clamp-2" title={os.title}>
                          {os.title}
                      </h4>
                      
                      <p className="text-xs text-gray-500 mb-3 truncate">{getPlantName(os.plantId)}</p>

                      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-2 border-t dark:border-gray-700">
                          <div className="flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px] font-bold text-gray-600">
                                  {getUserName(os.technicianId).charAt(0)}
                              </span>
                              <span className="truncate max-w-[80px]">{getUserName(os.technicianId).split(' ')[0]}</span>
                          </div>
                          <span className="flex items-center gap-1">
                              <CalendarClock size={12} />
                              {os.startDate.split('-').reverse().join('/')}
                          </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Botão Carregar Mais */}
                  {hasMore && (
                      <button 
                        onClick={() => handleLoadMore(col.id)}
                        className="w-full py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-1"
                      >
                          <ChevronDown size={14} />
                          Carregar mais ({col.items.length - currentLimit})
                      </button>
                  )}
                  
                  {col.items.length === 0 && (
                    <div className="text-center text-gray-400 text-xs italic py-4 opacity-60">Vazio</div>
                  )}
                </div>
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default Board;