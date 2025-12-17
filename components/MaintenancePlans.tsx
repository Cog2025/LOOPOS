// File: components/MaintenancePlans.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, PlantMaintenancePlan } from '../types';
import Modal from './modals/Modal';
import StandardLibraryModal from './modals/StandardLibraryModal';
import CustomInitializationModal from './modals/CustomInitializationModal';
// ✅ Importamos o gerador centralizado para garantir formatação igual (numerada)
import { generateFullMaintenancePDF } from './utils/pdfGenerator';
import { Download, ChevronDown, ChevronRight, AlertCircle, BookOpen, Settings, Plus, Trash2, Edit, Save, X, FileText } from 'lucide-react';

const MaintenancePlans: React.FC = () => {
  const { 
    plants, fetchPlantPlan, maintenancePlans, updatePlantTask, 
    deletePlantTask, createPlantTask, initializePlantPlan,
    fetchTaskTemplates, taskTemplates // ✅ Necessário para o PDF da biblioteca
  } = useData();
  const { user } = useAuth();

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [editingTask, setEditingTask] = useState<Partial<PlantMaintenancePlan> | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCustomWizard, setShowCustomWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set()); 
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [newAssetName, setNewAssetName] = useState('');

  // --- PERMISSÕES ---
  const currentPlant = plants.find(p => p.id === selectedPlantId);
  const canManageLibrary = user?.role === Role.ADMIN;
  
  const canImplementPlan = useMemo(() => {
    if (!user || !selectedPlantId || !currentPlant) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.COORDINATOR && currentPlant.coordinatorId === user.id) return true;
    return false;
  }, [user, selectedPlantId, currentPlant]);

  const canEditImplemented = user?.role === Role.ADMIN;

  // --- FILTROS ---
  const availableClients = useMemo(() => {
    const allClients = Array.from(new Set(plants.map(p => p.client).filter(Boolean))) as string[];
    if (user?.role === Role.CLIENT) {
        return allClients.filter(c => plants.some(p => p.client === c && (user.plantIds?.includes(p.id) || p.client === user.name)));
    }
    return allClients.sort();
  }, [plants, user]);

  const availablePlants = useMemo(() => {
    return plants.filter(p => {
        if (!selectedClient) return false;
        if (p.client !== selectedClient) return false;
        if (user?.role === Role.ADMIN || user?.role === Role.OPERATOR) return true;
        return user?.plantIds?.includes(p.id);
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [plants, selectedClient, user]);

  useEffect(() => {
    if (selectedPlantId) {
        setIsLoading(true);
        fetchPlantPlan(selectedPlantId).finally(() => setIsLoading(false));
    }
  }, [selectedPlantId]);

  const planData = maintenancePlans[selectedPlantId] || [];

  const tasksByAsset = useMemo(() => {
    const groups: Record<string, PlantMaintenancePlan[]> = {};
    planData.forEach(task => {
        const asset = task.asset_category || 'Geral';
        if (!groups[asset]) groups[asset] = [];
        groups[asset].push(task);
    });
    return groups;
  }, [planData]);

  const toggleTask = (id: string) => {
    setExpandedTasks(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
  };

  const toggleAsset = (asset: string) => {
    setExpandedAssets(prev => {
        const next = new Set(prev);
        if (next.has(asset)) next.delete(asset); else next.add(asset);
        return next;
    });
  };

  // ✅ PDF PLANO USINA (Atualizado para usar a função com números)
  const handleDownloadPlantPDF = () => {
    if (!selectedPlantId || !currentPlant) return;
    if (planData.length === 0) {
        alert("O plano está vazio.");
        return;
    }
    generateFullMaintenancePDF(
        planData,
        `Plano de Manutenção: ${currentPlant.name}`,
        `Cliente: ${currentPlant.client}`
    );
  };

  // ✅ PDF BIBLIOTECA (Corrigido: faz fetch antes)
  const handleDownloadLibraryPDF = async () => {
    try {
        setIsLoading(true);
        await fetchTaskTemplates(); // Força atualização
        // Pequeno delay ou usar o estado atualizado do contexto
        const templates = taskTemplates; 
        
        if (!templates || templates.length === 0) {
            // Tenta pegar direto do contexto se o await não tiver atualizado a tempo (React batching)
            alert("A biblioteca parece estar vazia ou ainda carregando. Tente novamente em instantes.");
            return;
        }

        generateFullMaintenancePDF(
            templates,
            "Biblioteca Padrão de Manutenção (LoopOS)",
            "Todas as tarefas modelo"
        );
    } catch(e) {
        console.error(e);
        alert("Erro ao baixar biblioteca.");
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveTask = async () => {
    if (editingTask && editingTask.id) {
        await updatePlantTask(editingTask.id, editingTask);
        setEditingTask(null);
        fetchPlantPlan(selectedPlantId);
    }
  };

  const handleDeleteTask = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!canEditImplemented) return;
    if (confirm("ATENÇÃO: Deseja realmente excluir esta tarefa?")) {
        await deletePlantTask(id);
        fetchPlantPlan(selectedPlantId);
    }
  };

  const handleEditClick = (e: React.MouseEvent, task: PlantMaintenancePlan) => {
    e.stopPropagation();
    if (!canEditImplemented) return;
    setEditingTask(task);
  };

  const handleAddAsset = async () => {
      if (!newAssetName || !selectedPlantId) return;
      const newTask = {
          plantId: selectedPlantId,
          asset_category: newAssetName,
          title: 'Nova Tarefa',
          task_type: 'Preventiva',
          criticality: 'Média',
          frequency_days: 30,
          subtasks: ['Checklist inicial'],
          active: true
      };
      await createPlantTask(selectedPlantId, newTask);
      setNewAssetName('');
      setIsAddingAsset(false);
      fetchPlantPlan(selectedPlantId);
  };

  const handleAddTaskToAsset = async (assetName: string) => {
      if (!canEditImplemented) return;
      const newTask = {
          plantId: selectedPlantId,
          asset_category: assetName,
          title: 'Nova Tarefa',
          task_type: 'Preventiva',
          criticality: 'Média',
          frequency_days: 30,
          subtasks: ['Checklist inicial'],
          active: true
      };
      await createPlantTask(selectedPlantId, newTask);
      fetchPlantPlan(selectedPlantId);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <BookOpen className="text-blue-600" />
                Planos de Manutenção
            </h1>
            <p className="text-sm text-gray-500">Gerencie e visualize as rotinas de manutenção por usina.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 shrink-0 mb-6">
        <div className="flex gap-4 flex-1 w-full md:w-auto">
            <div className="w-1/2 md:w-64">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                <div className="relative">
                    <select 
                        value={selectedClient} 
                        onChange={e => { setSelectedClient(e.target.value); setSelectedPlantId(''); }}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg appearance-none"
                    >
                        <option value="">Selecione...</option>
                        {availableClients.map((c: string) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
            </div>

            <div className="w-1/2 md:w-64">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usina</label>
                <div className="relative">
                    <select 
                        value={selectedPlantId} 
                        onChange={e => setSelectedPlantId(e.target.value)}
                        disabled={!selectedClient}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg appearance-none disabled:opacity-50"
                    >
                        <option value="">Selecione...</option>
                        {availablePlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
            </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
            {/* Botão PDF Usina */}
            <button 
                onClick={handleDownloadPlantPDF}
                disabled={!selectedPlantId || planData.length === 0}
                className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
                <Download size={18} /> Baixar PDF
            </button>

            {/* Botão Biblioteca (Gerenciar) */}
            <button 
                onClick={() => setShowLibrary(true)}
                className={`flex-1 md:flex-none px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2
                    ${!canManageLibrary ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={!canManageLibrary}
            >
                <BookOpen size={18} /> Biblioteca
            </button>

             {/* ✅ Botão PDF Biblioteca (NOVO) */}
            <button 
                onClick={handleDownloadLibraryPDF}
                disabled={isLoading}
                className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                title="Baixar toda a biblioteca padrão em PDF"
            >
                 {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"/> : <FileText size={18} />}
                 PDF Biblio.
            </button>

            {canImplementPlan && (
                <button 
                    onClick={() => {
                        if(confirm("Inicializar com Padrão Loop?")) {
                            initializePlantPlan(selectedPlantId, 'STANDARD');
                        }
                    }}
                    disabled={!selectedPlantId}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                >
                    <Settings size={18} /> Inicializar Plano
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {!selectedPlantId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60">
                <BookOpen size={64} strokeWidth={1} />
                <p className="mt-4 text-lg font-medium">Selecione uma usina para visualizar o plano</p>
            </div>
        ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        ) : planData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="text-blue-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Plano não inicializado</h3>
                <p className="text-gray-500 max-w-md mb-6">Utilize o botão "Inicializar Plano" acima para começar.</p>
                {canImplementPlan && (
                    <div className="flex gap-4">
                        <button 
                            onClick={() => {
                                if(confirm("Inicializar com Padrão Loop?")) {
                                    initializePlantPlan(selectedPlantId, 'STANDARD');
                                }
                            }}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors"
                        >
                            Usar Padrão Loop
                        </button>
                        <button 
                            onClick={() => setShowCustomWizard(true)}
                            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-md transition-colors"
                        >
                            Wizard Customizado
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto p-4">
                {canEditImplemented && (
                    <div className="mb-4 flex justify-end">
                        {isAddingAsset ? (
                            <div className="flex gap-2 items-center bg-gray-100 p-2 rounded">
                                <input 
                                    value={newAssetName} 
                                    onChange={e => setNewAssetName(e.target.value)}
                                    placeholder="Nome do novo ativo"
                                    className="p-1 border rounded text-sm"
                                    autoFocus
                                />
                                <button onClick={handleAddAsset} className="text-green-600 font-bold px-2"><Save size={18}/></button>
                                <button onClick={() => setIsAddingAsset(false)} className="text-red-600 px-2"><X size={18}/></button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAddingAsset(true)}
                                className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                            >
                                <Plus size={16} /> Adicionar Ativo
                            </button>
                        )}
                    </div>
                )}

                {Object.entries(tasksByAsset).map(([asset, tasks]) => {
                    const isAssetExpanded = expandedAssets.has(asset);
                    return (
                        <div key={asset} className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                            <div 
                                className="flex items-center justify-between p-3 bg-gray-800 text-white cursor-pointer hover:bg-gray-700 transition-colors"
                                onClick={() => toggleAsset(asset)}
                            >
                                <div className="flex items-center gap-3">
                                    {isAssetExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    <h3 className="font-bold text-sm uppercase tracking-wide">{asset}</h3>
                                    <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full font-medium">
                                        {tasks.length} tarefas
                                    </span>
                                </div>
                                {canEditImplemented && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleAddTaskToAsset(asset); }}
                                        className="p-1 hover:bg-gray-600 rounded text-white"
                                        title="Adicionar tarefa a este ativo"
                                    >
                                        <Plus size={16} />
                                    </button>
                                )}
                            </div>

                            {isAssetExpanded && (
                                <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`w-2 h-2 rounded-full ${task.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                        <h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4>
                                                    </div>
                                                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                        <span className="flex items-center gap-1">🔄 {task.frequency_days} dias</span>
                                                        <span className="flex items-center gap-1">⚠️ {task.criticality}</span>
                                                        <span className="flex items-center gap-1">⏱️ {task.estimated_duration_minutes} min</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => toggleTask(task.id)}
                                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                                    >
                                                        {expandedTasks.has(task.id) ? 'Ocultar' : 'Checklist'}
                                                    </button>
                                                    
                                                    {canEditImplemented && (
                                                        <div className="flex gap-1 ml-4 border-l pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={(e) => handleEditClick(e, task)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                                                                <Edit size={16} />
                                                            </button>
                                                            <button onClick={(e) => handleDeleteTask(e, task.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {expandedTasks.has(task.id) && (
                                                <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Subtarefas:</p>
                                                    <ul className="list-decimal pl-5 space-y-1">
                                                        {task.subtasks.map((sub, idx) => <li key={idx}>{sub}</li>)}
                                                    </ul>
                                                    <div className="mt-2 text-xs flex gap-4 pt-2 border-t dark:border-gray-700">
                                                        <div><span className="font-bold">Class 1:</span> {task.classification1}</div>
                                                        <div><span className="font-bold">Class 2:</span> {task.classification2}</div>
                                                        <div><span className="font-bold">Tipo:</span> {task.task_type}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
      </div>

      {/* ✅ MODAL DE EDIÇÃO COMPLETAMENTE DETALHADO */}
      {editingTask && (
        <Modal isOpen={true} onClose={() => setEditingTask(null)} title="Editar Tarefa">
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Título */}
                <div>
                    <label className="block text-sm font-bold mb-1">Título da Tarefa</label>
                    <input 
                        value={editingTask.title} 
                        onChange={e => setEditingTask({...editingTask, title: e.target.value})} 
                        className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" 
                        placeholder="Ex: Limpeza de Inversores" 
                    />
                </div>
                
                {/* Grid de Detalhes */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Frequência (Dias)</label>
                        <input 
                            type="number" 
                            value={editingTask.frequency_days} 
                            onChange={e => setEditingTask({...editingTask, frequency_days: Number(e.target.value)})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Duração Est. (Min)</label>
                        <input 
                            type="number" 
                            value={editingTask.estimated_duration_minutes} 
                            onChange={e => setEditingTask({...editingTask, estimated_duration_minutes: Number(e.target.value)})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Criticidade</label>
                        <select 
                            value={editingTask.criticality} 
                            onChange={e => setEditingTask({...editingTask, criticality: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                            <option value="Urgente">Urgente</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Tipo de Tarefa</label>
                        <select 
                            value={editingTask.task_type} 
                            onChange={e => setEditingTask({...editingTask, task_type: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
                        >
                            <option value="Preventiva">Preventiva</option>
                            <option value="Corretiva">Corretiva</option>
                            <option value="Preditiva">Preditiva</option>
                            <option value="Inspeção">Inspeção</option>
                            <option value="Limpeza">Limpeza</option>
                        </select>
                    </div>
                </div>

                {/* Classificações */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-1">Classificação 1</label>
                        <input 
                            value={editingTask.classification1 || ''} 
                            onChange={e => setEditingTask({...editingTask, classification1: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" 
                            placeholder="Ex: Elétrica"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-1">Classificação 2</label>
                        <input 
                            value={editingTask.classification2 || ''} 
                            onChange={e => setEditingTask({...editingTask, classification2: e.target.value})} 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" 
                            placeholder="Ex: Média Tensão"
                        />
                    </div>
                </div>

                {/* Subtarefas */}
                <div>
                    <label className="block text-sm font-bold mb-1">Subtarefas / Checklist (uma por linha)</label>
                    <textarea 
                        value={editingTask.subtasks?.join('\n')} 
                        onChange={e => setEditingTask({...editingTask, subtasks: e.target.value.split('\n')})} 
                        className="w-full p-2 border rounded h-32 dark:bg-gray-700 dark:text-white font-mono text-sm" 
                        placeholder="Item 1&#10;Item 2&#10;Item 3"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700">
                    <button onClick={() => setEditingTask(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded">Cancelar</button>
                    <button onClick={handleSaveTask} className="px-4 py-2 bg-blue-600 text-white rounded font-bold flex items-center gap-2">
                        <Save size={16} /> Salvar Alterações
                    </button>
                </div>
            </div>
        </Modal>
      )}
      
      <StandardLibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} />
      {showCustomWizard && <CustomInitializationModal isOpen={true} onClose={() => setShowCustomWizard(false)} plantId={selectedPlantId} onSuccess={() => { alert("Criado!"); setShowCustomWizard(false); fetchPlantPlan(selectedPlantId); }} />}
    </div>
  );
};

export default MaintenancePlans;