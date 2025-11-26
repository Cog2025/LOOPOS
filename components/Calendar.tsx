// File: components/Calendar.tsx
// Componente para exibir um calendário mensal com as OSs distribuídas por data

import React, { useState, useMemo } from 'react';
import { OS, Priority } from '../types'; 
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './modals/Modal';

interface CalendarProps {
  osList: OS[];
  onCardClick: (os: OS) => void;
}

const Calendar: React.FC<CalendarProps> = ({ osList, onCardClick }) => {
  const { filterOSForUser } = useData();
  const { user } = useAuth();
  const visibleOS = user ? filterOSForUser(user) : osList;

  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [moreInfoModal, setMoreInfoModal] = useState<{ isOpen: boolean; title: string; items: OS[] }>({
      isOpen: false, title: '', items: []
  });

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
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

  // ✅ PADRÃO DE CORES UNIFICADO (Baseado no Kanban/Tailwind)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case Priority.URGENT: return 'bg-red-500 border-l-4 border-red-700 text-white';
      case Priority.HIGH: return 'bg-orange-500 border-l-4 border-orange-700 text-white';
      case Priority.MEDIUM: return 'bg-yellow-500 border-l-4 border-yellow-700 text-white'; // Forçando branco aqui
      case Priority.LOW: return 'bg-green-500 border-l-4 border-green-700 text-white';
      default: return 'bg-gray-500 border-l-4 border-gray-700 text-white';
    }
  };

  const handleShowMore = (date: Date, items: OS[]) => {
      setMoreInfoModal({ isOpen: true, title: `OSs do dia ${date.toLocaleDateString()}`, items: items });
  };

  return (
    <div className="h-full overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
      <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="btn-secondary">‹</button>
            <button onClick={() => setCurrentDate(new Date())} className="btn-primary">Hoje</button>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="btn-secondary">›</button>
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border dark:border-gray-700">
        <div className="grid grid-cols-7 border-b border-gray-300 dark:border-gray-700">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((dayData, index) => {
            const osListForDay = getOSsForDate(dayData.date);
            const isToday = dayData.date.toDateString() === new Date().toDateString();

            return (
              <div key={index} className={`min-h-[120px] border border-gray-200 dark:border-gray-700 p-2 ${dayData.isCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-50'} ${isToday ? 'ring-2 ring-blue-500 z-10' : ''}`}>
                <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{dayData.dayNumber}</div>
                <div className="space-y-1">
                  {osListForDay.slice(0, 3).map(os => (
                    <div key={os.id} onClick={() => onCardClick(os)} className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 text-white truncate shadow-sm ${getPriorityColor(os.priority)}`} title={`${os.id} - ${os.activity}`}>
                      {os.id}
                    </div>
                  ))}
                  {osListForDay.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-blue-500 hover:underline" onClick={(e) => { e.stopPropagation(); handleShowMore(dayData.date, osListForDay); }}>+{osListForDay.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legenda Padronizada */}
      <div className="mt-6 flex flex-wrap gap-4 items-center">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Legenda:</span>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 border-l-2 border-red-700 rounded"></div><span className="text-xs text-gray-600 dark:text-gray-400">Urgente</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 border-l-2 border-orange-700 rounded"></div><span className="text-xs text-gray-600 dark:text-gray-400">Alta</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 border-l-2 border-yellow-700 rounded"></div><span className="text-xs text-gray-600 dark:text-gray-400">Média</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 border-l-2 border-green-700 rounded"></div><span className="text-xs text-gray-600 dark:text-gray-400">Baixa</span></div>
      </div>

      {moreInfoModal.isOpen && (
          <Modal isOpen={true} onClose={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} title={moreInfoModal.title} footer={<button onClick={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} className="btn-secondary">Fechar</button>}>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
                  {moreInfoModal.items.map(os => (
                      <div key={os.id} onClick={() => { setMoreInfoModal({ ...moreInfoModal, isOpen: false }); onCardClick(os); }} className={`p-3 rounded-lg text-white cursor-pointer hover:opacity-90 shadow-sm flex justify-between items-center ${getPriorityColor(os.priority)}`}>
                          <span className="font-bold">{os.id}</span>
                          <span className="text-sm truncate ml-2 flex-1">{os.activity}</span>
                      </div>
                  ))}
              </div>
          </Modal>
      )}
    </div>
  );
};

export default Calendar;