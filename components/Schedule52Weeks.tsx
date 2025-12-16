// File: components/Schedule52Weeks.tsx
// Componente para exibir um cronograma de 52 semanas (1 ano).
// Funcionalidades:
// - Visualização de densidade de tarefas por semana.
// - Filtros avançados (Ano, Cliente, Usina, Prioridade, ATIVO, Técnico).
// - Gerenciamento em massa (Exclusão).
// - Integração com modal de agendamento automático.

import React, { useState, useMemo } from 'react';
import { OS, Role, Priority } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './modals/Modal';
import ScheduleOSModal from './modals/ScheduleOSModal'; 

interface Schedule52WeeksProps {
  osList: OS[]; 
  onCardClick: (os: OS) => void; 
  onOpenScheduler?: () => void; 
}

const Schedule52Weeks: React.FC<Schedule52WeeksProps> = ({ osList, onCardClick }) => {
  const { plants, users, filterOSForUser, deleteOSBatch } = useData();
  const { user } = useAuth();

  // --- ESTADOS DE FILTRO ---
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');

  // --- ESTADOS DE UI (Modais e Seleção - RESTAURADOS) ---
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [moreInfoModal, setMoreInfoModal] = useState<{ isOpen: boolean; title: string; items: OS[] }>({
      isOpen: false, title: '', items: []
  });

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedOSIds, setSelectedOSIds] = useState<string[]>([]);
   
  // Permissões de gerenciamento
  const canManage = user?.role === Role.ADMIN || user?.role === Role.OPERATOR;

  const years = [2024, 2025, 2026, 2027];

  // --- FILTROS DE SEGURANÇA (MANTIDOS) ---
  const availablePlants = useMemo(() => {
      const filtered = plants.filter(plant => {
          if (!user) return false;
          if ([Role.ADMIN, Role.OPERATOR].includes(user.role)) return true;
          return user.plantIds?.includes(plant.id);
      });
      return filtered.sort((a,b) => a.name.localeCompare(b.name));
  }, [plants, user]);

  const availableUsers = useMemo(() => {
      if (!user) return [];
      if ([Role.ADMIN, Role.OPERATOR].includes(user.role)) return users;
      const myPlantIds = user.plantIds || [];
      return users.filter(targetUser => {
          const targetPlants = targetUser.plantIds || [];
          return targetPlants.some(pId => myPlantIds.includes(pId));
      }).sort((a,b) => a.name.localeCompare(b.name));
  }, [users, user]);

  // Filtro de Clientes baseado nas usinas disponíveis
  const availableClients = useMemo(() => {
      const clients = new Set(availablePlants.map(p => p.client || 'Indefinido'));
      return Array.from(clients).sort();
  }, [availablePlants]);

  // --- LISTA DE ATIVOS ÚNICOS ---
  const uniqueAssets = useMemo(() => {
    const assetsSet = new Set<string>();
    osList.forEach(os => {
      if (os.assets && os.assets.length > 0) {
        os.assets.forEach(a => assetsSet.add(a));
      }
      if ((os as any).assetName) {
        assetsSet.add((os as any).assetName);
      }
    });
    return Array.from(assetsSet).sort();
  }, [osList]);

  // --- LÓGICA DE FILTRAGEM (Grid) ---
  const visibleOS = useMemo(() => {
    // 1. Filtro de Segurança (RBAC)
    let list = user ? filterOSForUser(user) : osList;
    
    // 2. Filtros da Interface
    list = list.filter(os => {
        const date = new Date(os.startDate);
        
        // Filtro de Ano
        if (date.getFullYear() !== selectedYear) return false;
        
        // Filtro de Usina e Cliente
        const plant = plants.find(p => p.id === os.plantId);
        if (selectedClient && plant?.client !== selectedClient) return false;
        if (selectedPlant && os.plantId !== selectedPlant) return false;
        
        // Segurança: Bloqueia se a usina não estiver na lista permitida
        if (!availablePlants.find(p => p.id === os.plantId)) return false;

        // Filtro de Prioridade
        if (selectedPriority && os.priority !== selectedPriority) return false;
        
        // Filtro de Ativo
        if (selectedAsset) {
            const hasAsset = (os.assets && os.assets.includes(selectedAsset)) || 
                             ((os as any).assetName === selectedAsset);
            if (!hasAsset) return false;
        }

        // Filtro de Técnico
        if (selectedTechnician && os.technicianId !== selectedTechnician) return false;
        
        return true;
    });
    return list;
  }, [osList, user, selectedYear, selectedClient, selectedPlant, selectedPriority, selectedAsset, selectedTechnician, plants, availablePlants, filterOSForUser]);

  // --- GERAÇÃO DA ESTRUTURA DE SEMANAS ---
  const weeks = useMemo(() => {
    const weeksArray = [];
    const startDate = new Date(selectedYear, 0, 1);
    
    // Ajuste para encontrar a primeira segunda-feira ou início lógico
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); 
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

  // --- AGRUPAMENTO POR SEMANA ---
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

  // --- HANDLERS DE AÇÃO (RESTAURADOS) ---
  
  const toggleSelection = (id: string) => {
      setSelectedOSIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
      if (selectedOSIds.length === visibleOS.length && visibleOS.length > 0) {
          setSelectedOSIds([]); 
      } else {
          setSelectedOSIds(visibleOS.map(os => os.id)); 
      }
  };

  const handleDeleteSelected = async () => {
      if (!confirm(`Excluir ${selectedOSIds.length} OSs selecionadas?`)) return;
      await deleteOSBatch(selectedOSIds);
      setSelectedOSIds([]);
      setIsSelectionMode(false);
  };
   
  const handleShowMore = (weekNum: number, items: OS[]) => {
      if (isSelectionMode) return; 
      setMoreInfoModal({
          isOpen: true,
          title: `Semana ${weekNum} - ${items.length} OSs`,
          items: items
      });
  };

  // Helper de Cores para Prioridade (Tailwind classes)
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgente': return 'bg-red-500 hover:bg-red-600';
      case 'Alta': return 'bg-orange-500 hover:bg-orange-600';
      case 'Média': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Baixa': return 'bg-green-500 hover:bg-green-600';
      default: return 'bg-gray-500';
    }
  };

  const getPlantName = (plantId: string) => {
    return plants.find(p => p.id === plantId)?.name || plantId;
  };

  const selectClass = "text-xs border-gray-300 dark:border-gray-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white py-1 px-2";

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900 p-4">
      
      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm mb-4 flex flex-wrap gap-3 items-center justify-between">
        
        <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300 mr-2">Filtros:</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className={selectClass}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
            <select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setSelectedPlant(''); }} className={selectClass}><option value="">Todos Clientes</option>{availableClients.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className={selectClass} disabled={!selectedClient && plants.length > 20}><option value="">Todas Usinas</option>{availablePlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className={selectClass}><option value="">Todas Prioridades</option>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select>
            <select value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)} className={selectClass}><option value="">Todos Ativos</option>{uniqueAssets.map(a => <option key={a} value={a}>{a}</option>)}</select>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className={selectClass}><option value="">Todos Técnicos</option>{availableUsers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        </div>

        {/* --- BOTÕES DE AÇÃO (RESTAURADOS) --- */}
        <div className="flex gap-2">
            {canManage && (
                <>
                    {isSelectionMode ? (
                        <div className="flex gap-2 animate-fadeIn items-center">
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
                            ✏️ Gerenciar
                        </button>
                    )}
                    <button onClick={() => setIsSchedulerOpen(true)} className="px-3 py-1 text-xs font-bold text-white bg-green-600 rounded hover:bg-green-700">+ Agendar</button>
                </>
            )}
        </div>
      </div>

      {/* --- GRID DE 52 SEMANAS --- */}
      <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-13 gap-2 overflow-y-auto flex-1 pr-2">
        {weeks.map(w => {
            const items = osByWeek[w.weekNumber] || [];
            const visibleLimit = 3;
            const visibleItems = items.slice(0, visibleLimit);
            const hiddenCount = items.length - visibleLimit;

            return (
                <div key={w.weekNumber} className={`border dark:border-gray-700 bg-white dark:bg-gray-800 rounded p-1 min-h-[100px] flex flex-col transition-colors ${isSelectionMode ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : ''}`}>
                    <div className="text-[10px] text-center text-gray-400 border-b dark:border-gray-700 mb-1">
                        S{w.weekNumber} <span className="opacity-50">{w.start.getDate()}/{w.start.getMonth()+1}</span>
                    </div>
                    
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
                                    className={`text-[9px] p-1 rounded text-white cursor-pointer truncate flex flex-col justify-center shadow-sm transition-all ${
                                        isSelectionMode && isSelected ? 'ring-2 ring-red-500 bg-red-500 scale-95' : 
                                        getPriorityColor(os.priority)
                                    }`}
                                    title={`${getPlantName(os.plantId)} - ${os.activity}`}
                                >
                                    <span className="font-bold truncate">{getPlantName(os.plantId)}</span>
                                    <span className="truncate opacity-90">{os.activity}</span>
                                </div>
                            );
                        })}

                        {hiddenCount > 0 && (
                            <div 
                                className="text-[9px] text-center text-gray-500 dark:text-gray-400 font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-0.5"
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

      {/* MODAL DE "VER MAIS" */}
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
                            onCardClick(os);
                        }}
                        className={`p-3 rounded-lg text-white cursor-pointer hover:opacity-90 shadow-sm flex justify-between items-center ${getPriorityColor(os.priority)}`}
                      >
                          <div className="flex flex-col overflow-hidden">
                             <span className="font-bold text-sm">{getPlantName(os.plantId)}</span>
                             <span className="text-xs truncate">{os.activity}</span>
                          </div>
                          <span className="text-xs bg-black/20 px-2 py-0.5 rounded whitespace-nowrap ml-2">{new Date(os.startDate).toLocaleDateString()}</span>
                      </div>
                  ))}
              </div>
          </Modal>
      )}

      {/* MODAL DE AGENDAMENTO */}
      <ScheduleOSModal 
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
      />

    </div>
  );
};

export default Schedule52Weeks;