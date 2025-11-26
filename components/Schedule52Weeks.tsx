// File: components/Schedule52Weeks.tsx
// Componente para exibir um cronograma de 52 semanas (1 ano)
// Mostra as OSs distribuídas ao longo das semanas do ano com filtros avançados e gerenciamento em massa.

import React, { useState, useMemo } from 'react';
import { OS, Role, Priority } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { OS_ACTIVITIES } from '../constants';
import Modal from './modals/Modal'; // Importado para o recurso "Ver Mais"

interface Schedule52WeeksProps {
  osList: OS[]; // Lista completa de OSs (será filtrada aqui dentro)
  onCardClick: (os: OS) => void; // Ação ao clicar em uma OS (abrir detalhes)
  onOpenScheduler: () => void; // Ação para abrir o modal de agendamento (criação em lote)
}

const Schedule52Weeks: React.FC<Schedule52WeeksProps> = ({ osList, onCardClick, onOpenScheduler }) => {
  const { plants, users, filterOSForUser, deleteOSBatch } = useData();
  const { user } = useAuth();

  // --- ESTADOS DE FILTRO ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // --- ESTADOS DE SELEÇÃO E MODAL ---
  const [isSelectionMode, setIsSelectionMode] = useState(false); // Ativa/desativa checkboxes
  const [selectedOSIds, setSelectedOSIds] = useState<string[]>([]); // IDs selecionados para exclusão
  
  // Estado para controlar o modal de "Ver Mais" (lista completa da semana)
  const [moreInfoModal, setMoreInfoModal] = useState<{ isOpen: boolean; title: string; items: OS[] }>({
      isOpen: false, title: '', items: []
  });

  // Verifica permissões para ações de gerenciamento
  const canManage = user?.role === Role.ADMIN || user?.role === Role.OPERATOR;

  // Dados para popular os selects de filtro
  const years = [2024, 2025, 2026, 2027];
  const clients = Array.from(new Set(plants.map(p => p.client))).sort();
  const filteredPlants = selectedClient ? plants.filter(p => p.client === selectedClient) : plants;
  const technicians = users.filter(u => u.role === Role.TECHNICIAN);

  // --- LÓGICA DE FILTRAGEM ---
  // Filtra a lista de OSs com base em todos os critérios selecionados
  const visibleOS = useMemo(() => {
    // Primeiro aplica o filtro de permissão do usuário (RBAC)
    let list = user ? filterOSForUser(user) : osList;
    
    // Aplica filtros da UI
    list = list.filter(os => {
        const date = new Date(os.startDate);
        if (date.getFullYear() !== selectedYear) return false;
        if (selectedPlant && os.plantId !== selectedPlant) return false;
        if (selectedPriority && os.priority !== selectedPriority) return false;
        if (selectedActivity && os.activity !== selectedActivity) return false;
        if (selectedTechnician && os.technicianId !== selectedTechnician) return false;
        
        // Filtro de cliente (se usina não estiver selecionada)
        if (selectedClient && !selectedPlant) {
            const plant = plants.find(p => p.id === os.plantId);
            if (plant?.client !== selectedClient) return false;
        }
        return true;
    });
    return list;
  }, [osList, user, selectedYear, selectedClient, selectedPlant, selectedPriority, selectedActivity, selectedTechnician, plants]);

  // --- GERAÇÃO DAS SEMANAS ---
  // Calcula as datas de início e fim de cada uma das 52 semanas do ano selecionado
  const weeks = useMemo(() => {
    const weeksArray = [];
    const startDate = new Date(selectedYear, 0, 1);
    
    // Ajusta para o primeiro dia da semana correto
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para começar Segunda ou Domingo
    const firstMonday = new Date(startDate.setDate(diff));

    for (let i = 0; i < 52; i++) {
      const start = new Date(firstMonday);
      start.setDate(firstMonday.getDate() + (i * 7));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      weeksArray.push({ weekNumber: i + 1, start, end });
    }
    return weeksArray;
  }, [selectedYear]);

  // --- AGRUPAMENTO ---
  // Distribui as OSs visíveis dentro das semanas correspondentes
  const osByWeek = useMemo(() => {
    const grouped: Record<number, OS[]> = {};
    visibleOS.forEach(os => {
        const date = new Date(os.startDate);
        const startOfYear = new Date(selectedYear, 0, 1);
        const pastDays = (date.getTime() - startOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        
        if (weekNum >= 1 && weekNum <= 52) {
            if (!grouped[weekNum]) grouped[weekNum] = [];
            grouped[weekNum].push(os);
        }
    });
    return grouped;
  }, [visibleOS, selectedYear]);

  // --- AÇÕES ---

  // Alterna a seleção de uma OS individual
  const toggleSelection = (id: string) => {
      setSelectedOSIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Seleciona ou Desmarca TODAS as OSs visíveis
  const handleSelectAll = () => {
      if (selectedOSIds.length === visibleOS.length && visibleOS.length > 0) {
          setSelectedOSIds([]); // Desmarcar tudo
      } else {
          setSelectedOSIds(visibleOS.map(os => os.id)); // Marcar tudo que está filtrado
      }
  };

  // Exclusão em massa via API
  const handleDeleteSelected = async () => {
      if (!confirm(`Excluir ${selectedOSIds.length} OSs selecionadas?`)) return;
      await deleteOSBatch(selectedOSIds);
      setSelectedOSIds([]);
      setIsSelectionMode(false);
  };
  
  // Abre o modal para ver todas as OSs de uma semana específica
  const handleShowMore = (weekNum: number, items: OS[]) => {
      if (isSelectionMode) return; // Não abre modal se estiver selecionando
      setMoreInfoModal({
          isOpen: true,
          title: `Semana ${weekNum} - ${items.length} OSs`,
          items: items
      });
  };

  // Helper de cores para prioridade (compatível com Tailwind)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-500 hover:bg-red-600';
      case 'Alta': return 'bg-orange-500 hover:bg-orange-600';
      case 'Média': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Baixa': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  const selectClass = "text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-1 px-2";

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-4">
      
      {/* BARRA DE FERRAMENTAS E FILTROS */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 items-center justify-between">
        
        {/* Grupo de Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2">Filtros:</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={selectClass}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setSelectedPlant(''); }} className={selectClass}><option value="">Todos Clientes</option>{clients.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className={selectClass} disabled={!selectedClient && plants.length > 20}><option value="">Todas Usinas</option>{filteredPlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className={selectClass}><option value="">Todas Prioridades</option>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select>
            <select value={selectedActivity} onChange={e => setSelectedActivity(e.target.value)} className={selectClass}><option value="">Todas Atividades</option>{OS_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}</select>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className={selectClass}><option value="">Todos Técnicos</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
            {canManage && (
                <>
                    {isSelectionMode ? (
                        <div className="flex gap-2 animate-fadeIn items-center">
                            {/* Checkbox Selecionar Todos */}
                            <label className="flex items-center space-x-1 cursor-pointer bg-blue-50 dark:bg-slate-700 px-2 py-1 rounded border dark:border-gray-600" title="Selecionar todos os itens visíveis">
                                <input type="checkbox" checked={selectedOSIds.length === visibleOS.length && visibleOS.length > 0} onChange={handleSelectAll} className="rounded text-blue-600" />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Todos</span>
                            </label>
                            
                            <button onClick={handleDeleteSelected} disabled={selectedOSIds.length === 0} className="px-3 py-1 text-xs font-bold text-white bg-red-600 rounded hover:bg-red-700 disabled:bg-gray-400">
                                🗑️ Excluir ({selectedOSIds.length})
                            </button>
                            <button onClick={() => setIsSelectionMode(false)} className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-200 rounded hover:bg-gray-300">
                                Cancelar
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => setIsSelectionMode(true)} className="px-3 py-1 text-xs font-bold text-blue-600 bg-blue-100 rounded hover:bg-blue-200">
                            ✏️ Gerenciar em Massa
                        </button>
                    )}
                    <button onClick={onOpenScheduler} className="px-3 py-1 text-xs font-bold text-white bg-green-600 rounded hover:bg-green-700">+ Agendar</button>
                </>
            )}
        </div>
      </div>

      {/* GRID DE 52 SEMANAS */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-13 gap-2 overflow-y-auto flex-1 pr-2">
        {weeks.map(w => {
            const items = osByWeek[w.weekNumber] || [];
            
            // Lógica de visualização limitada (max 3 itens por célula)
            const visibleLimit = 3;
            const visibleItems = items.slice(0, visibleLimit);
            const hiddenCount = items.length - visibleLimit;

            return (
                <div key={w.weekNumber} className={`border dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 min-h-[100px] flex flex-col transition-colors ${isSelectionMode ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''}`}>
                    {/* Cabeçalho da Célula */}
                    <div className="text-[10px] text-center text-gray-400 border-b dark:border-gray-700 mb-1">
                        S{w.weekNumber} <span className="opacity-50">{w.start.getDate()}/{w.start.getMonth()+1}</span>
                    </div>
                    
                    {/* Lista de OSs */}
                    <div className="flex-1 space-y-1 overflow-y-auto max-h-[120px] scrollbar-thin">
                        {visibleItems.map(os => {
                            const isSelected = selectedOSIds.includes(os.id);
                            return (
                                <div 
                                    key={os.id} 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        isSelectionMode ? toggleSelection(os.id) : onCardClick(os);
                                    }}
                                    className={`text-[10px] p-1 rounded text-white cursor-pointer truncate flex items-center justify-between shadow-sm transition-all ${
                                        isSelectionMode && isSelected ? 'ring-2 ring-red-500 bg-red-500 scale-95' : 
                                        getPriorityColor(os.priority)
                                    }`}
                                    title={`${os.id} - ${os.activity} (${os.priority})`}
                                >
                                    <span className="truncate">{os.id}</span>
                                    {isSelectionMode && <div className={`w-2 h-2 rounded-full ml-1 ${isSelected ? 'bg-white' : 'bg-black/20'}`} />}
                                </div>
                            );
                        })}

                        {/* Indicador de Mais Itens (Clickable) */}
                        {hiddenCount > 0 && (
                            <div 
                                className="text-[9px] text-center text-gray-500 dark:text-gray-400 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-0.5 transition-colors"
                                title={`${hiddenCount} OSs ocultas nesta semana. Clique para ver.`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShowMore(w.weekNumber, items);
                                }}
                            >
                                + {hiddenCount} mais...
                            </div>
                        )}
                    </div>
                </div>
            )
        })}
      </div>

      {/* MODAL DE "VER MAIS" (Lista completa da semana) */}
      {moreInfoModal.isOpen && (
          <Modal 
            isOpen={true} 
            onClose={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} 
            title={moreInfoModal.title}
            footer={<button onClick={() => setMoreInfoModal({ ...moreInfoModal, isOpen: false })} className="btn-secondary">Fechar</button>}
          >
              <div className="space-y-2 max-h-[60vh] overflow-y-auto p-1">
                  {moreInfoModal.items.map(os => (
                      <div 
                        key={os.id} 
                        onClick={() => {
                            setMoreInfoModal({ ...moreInfoModal, isOpen: false });
                            onCardClick(os); // Abre detalhe da OS
                        }}
                        className={`p-3 rounded-lg text-white cursor-pointer hover:opacity-90 shadow-sm flex justify-between items-center ${getPriorityColor(os.priority)}`}
                      >
                          <span className="font-bold">{os.id}</span>
                          <span className="text-sm truncate ml-2 flex-1">{os.activity}</span>
                          <span className="text-xs bg-black/20 px-2 py-0.5 rounded">{new Date(os.startDate).toLocaleDateString()}</span>
                      </div>
                  ))}
              </div>
          </Modal>
      )}
    </div>
  );
};

export default Schedule52Weeks;