// File: components/MaintenancePlans.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, PlantMaintenancePlan } from '../types';
import Modal from './modals/Modal';
import StandardLibraryModal from './modals/StandardLibraryModal';
import CustomInitializationModal from './modals/CustomInitializationModal';
import { generateFullMaintenancePDF } from './utils/pdfGenerator';
import { 
    Download, ChevronDown, ChevronRight, AlertCircle, BookOpen, 
    Settings, Plus, Trash2, Edit, Save, X, FileText 
} from 'lucide-react';

const MaintenancePlans: React.FC = () => {
  const { 
    plants, fetchPlantPlan, maintenancePlans, updatePlantTask, 
    deletePlantTask, createPlantTask, initializePlantPlan,
    fetchTaskTemplates, taskTemplates 
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
  const canDownloadLibrary = user && [Role.ADMIN, Role.OPERATOR, Role.COORDINATOR].includes(user.role);
  
  const canImplementPlan = useMemo(() => {
    if (!user || !selectedPlantId || !currentPlant) return false;
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.COORDINATOR && currentPlant.coordinatorId === user.id) return true;
    return false;
  }, [user, selectedPlantId, currentPlant]);

  // Permite editar se for Admin OU se for o Coordenador responsável por esta usina
  const canEditImplemented = user?.role === Role.ADMIN || (user?.role === Role.COORDINATOR && currentPlant?.coordinatorId === user.id);

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

  const toggleTask = (id: string) => setExpandedTasks(p => { const n = new Set(p); if(n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAsset = (asset: string) => setExpandedAssets(p => { const n = new Set(p); if(n.has(asset)) n.delete(asset); else n.add(asset); return n; });

  const handleDownloadPlantPDF = () => {
    if (!selectedPlantId || !currentPlant) return;
    if (planData.length === 0) { alert("O plano está vazio."); return; }
    generateFullMaintenancePDF(planData, `Plano de Manutenção: ${currentPlant.name}`, `Cliente: ${currentPlant.client}`);
  };

  const handleDownloadLibraryPDF = async () => {
    if (!canDownloadLibrary) return;
    try {
        setIsLoading(true);
        await fetchTaskTemplates();
        if (!taskTemplates || taskTemplates.length === 0) { alert("Biblioteca vazia."); return; }
        generateFullMaintenancePDF(taskTemplates, "Biblioteca Padrão de Manutenção (LoopOS)", "Todas as tarefas modelo");
    } catch(e) { console.error(e); alert("Erro ao baixar."); } finally { setIsLoading(false); }
  };

  const handleSaveTask = async () => { if (editingTask?.id) { await updatePlantTask(editingTask.id, editingTask); setEditingTask(null); fetchPlantPlan(selectedPlantId); } };
  const handleDeleteTask = async (e: React.MouseEvent, id: string) => { e.stopPropagation(); if (confirm("ATENÇÃO: Deseja realmente excluir esta tarefa?")) { await deletePlantTask(id); fetchPlantPlan(selectedPlantId); } };
  const handleEditClick = (e: React.MouseEvent, task: PlantMaintenancePlan) => { e.stopPropagation(); setEditingTask(task); };
  
  const handleAddAsset = async () => {
      if (!newAssetName || !selectedPlantId) return;
      await createPlantTask(selectedPlantId, { plantId: selectedPlantId, asset_category: newAssetName, title: 'Nova Tarefa', task_type: 'Preventiva', criticality: 'Média', frequency_days: 30, subtasks: [], active: true });
      setNewAssetName(''); setIsAddingAsset(false); fetchPlantPlan(selectedPlantId);
  };
  // Função para renomear o ativo (categoria) e atualizar todas as tarefas associadas
  const handleRenameAsset = async (oldName: string) => {
      if (!canEditImplemented) return;
      const newName = prompt("Novo nome para o ativo:", oldName);
      if (newName && newName !== oldName) {
          const tasksToUpdate = planData.filter(t => t.asset_category === oldName);
          // Atualiza todas as tarefas que pertencem a este ativo
          await Promise.all(tasksToUpdate.map(t => updatePlantTask(t.id, { ...t, asset_category: newName })));
          fetchPlantPlan(selectedPlantId);
      }
  };
  
  const handleAddTaskToAsset = async (assetName: string) => {
      await createPlantTask(selectedPlantId, { plantId: selectedPlantId, asset_category: assetName, title: 'Nova Tarefa', task_type: 'Preventiva', criticality: 'Média', frequency_days: 30, subtasks: [], active: true });
      fetchPlantPlan(selectedPlantId);
  };

  // Helpers de Subtarefas (Edição estruturada)
  const addSubtask = () => setEditingTask(p => p ? ({...p, subtasks: [...(p.subtasks||[]), '']}) : null);
  const updateSubtask = (i: number, v: string) => setEditingTask(p => { if(!p) return null; const s=[...(p.subtasks||[])]; s[i]=v; return {...p, subtasks:s}; });
  const removeSubtask = (i: number) => setEditingTask(p => { if(!p) return null; const s=[...(p.subtasks||[])]; s.splice(i,1); return {...p, subtasks:s}; });

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div><h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2"><BookOpen className="text-blue-600" /> Planos de Manutenção</h1></div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-end bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 shrink-0 mb-6">
        <div className="flex gap-4 flex-1 w-full md:w-auto">
            <div className="w-1/2 md:w-64">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
                <div className="relative"><select value={selectedClient} onChange={e => { setSelectedClient(e.target.value); setSelectedPlantId(''); }} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg appearance-none"><option value="">Selecione...</option>{availableClients.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div>
            </div>
            <div className="w-1/2 md:w-64">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Usina</label>
                <div className="relative"><select value={selectedPlantId} onChange={e => setSelectedPlantId(e.target.value)} disabled={!selectedClient} className="w-full p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg appearance-none disabled:opacity-50"><option value="">Selecione...</option>{availablePlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} /></div>
            </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            {/* Botão sempre visível (apenas desabilitado se não tiver dados) */}
            <button onClick={handleDownloadPlantPDF} disabled={!selectedPlantId || planData.length === 0} className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2"><Download size={18} /> Plano da Usina</button>
            
            {/* Botão visível apenas para quem pode baixar a biblioteca */}
            {canDownloadLibrary && (
                <button onClick={handleDownloadLibraryPDF} disabled={isLoading} className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {isLoading ? <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"/> : <Download size={18} />} Plano Padrão LOOP
                </button>
            )}
            
            {/* ✅ OCULTA o botão "Editar" se não tiver permissão (canManageLibrary) */}
            {canManageLibrary && (
                <button onClick={() => setShowLibrary(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2">
                    <BookOpen size={18} /> Editar Plano Padrão LOOP
                </button>
            )}

            {/* ✅ OCULTA o botão "Inicializar" se não tiver permissão (canImplementPlan) */}
            {canImplementPlan && (
                <button onClick={() => { if(confirm("Inicializar com Padrão Loop?")) initializePlantPlan(selectedPlantId, 'STANDARD'); }} disabled={!selectedPlantId} className="flex-1 md:flex-none px-4 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white rounded-lg font-bold shadow-sm flex items-center justify-center gap-2">
                    <Settings size={18} /> Inicializar Plano
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {!selectedPlantId ? ( <div className="flex-1 flex flex-col items-center justify-center text-gray-400 opacity-60"><BookOpen size={64} /><p className="mt-4">Selecione uma usina.</p></div> ) : planData.length === 0 ? ( <div className="flex-1 flex flex-col items-center justify-center p-8 text-center"><AlertCircle className="text-blue-500 mb-4" size={32} /><h3>Plano não inicializado</h3></div> ) : (
            <div className="flex-1 overflow-y-auto p-4">
                {canEditImplemented && (
                    <div className="mb-4 flex justify-end">
                        {isAddingAsset ? (
                            <div className="flex gap-2 items-center bg-gray-100 p-2 rounded"><input value={newAssetName} onChange={e => setNewAssetName(e.target.value)} placeholder="Nome do ativo" className="p-1 border rounded text-sm" autoFocus /><button onClick={handleAddAsset} className="text-green-600 font-bold px-2"><Save size={18}/></button><button onClick={() => setIsAddingAsset(false)} className="text-red-600 px-2"><X size={18}/></button></div>
                        ) : (<button onClick={() => setIsAddingAsset(true)} className="flex items-center gap-2 text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded"><Plus size={16} /> Adicionar Ativo</button>)}
                    </div>
                )}
                {/* ✅ ORDEM ALFABÉTICA APLICADA AQUI */}
                {Object.entries(tasksByAsset).sort((a, b) => a[0].localeCompare(b[0])).map(([asset, tasks]) => {
                    const isAssetExpanded = expandedAssets.has(asset);
                    return (
                        <div key={asset} className="mb-4 border dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between p-3 bg-gray-800 text-white cursor-pointer hover:bg-gray-700" onClick={() => toggleAsset(asset)}>
                                <div className="flex items-center gap-3">
                                    {isAssetExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    <h3 className="font-bold text-sm uppercase tracking-wide">{asset}</h3>
                                    
                                    {/* Botão para editar nome do Ativo */}
                                    {canEditImplemented && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleRenameAsset(asset); }}
                                            className="p-1 text-gray-400 hover:text-white transition-colors hover:bg-gray-600 rounded"
                                            title="Renomear Ativo"
                                        >
                                            <Edit size={14} />
                                        </button>
                                    )}

                                    <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full font-medium">
                                        {tasks.length} tarefas
                                    </span>
                                </div>
                                {canEditImplemented && <button onClick={(e) => { e.stopPropagation(); handleAddTaskToAsset(asset); }} className="p-1 hover:bg-gray-600 rounded text-white"><Plus size={16} /></button>}
                            </div>
                            {isAssetExpanded && (
                                <div className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 group">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1"><span className={`w-2 h-2 rounded-full ${task.active ? 'bg-green-500' : 'bg-gray-300'}`} /><h4 className="font-semibold text-gray-800 dark:text-gray-200">{task.title}</h4></div>
                                                    <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1"><span>🔄 {task.frequency_days} dias</span><span>⚠️ {task.criticality}</span><span>⏱️ {task.estimated_duration_minutes} min</span>{task.planned_downtime_minutes ? <span className="text-red-500 font-bold">🚫 Inativ: {task.planned_downtime_minutes} min</span> : null}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => toggleTask(task.id)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">{expandedTasks.has(task.id) ? 'Ocultar' : 'Checklist'}</button>
                                                    {canEditImplemented && <div className="flex gap-1 ml-4 border-l pl-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleEditClick(e, task)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={16} /></button><button onClick={(e) => handleDeleteTask(e, task.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button></div>}
                                                </div>
                                            </div>
                                            {expandedTasks.has(task.id) && (
                                                <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-sm border dark:border-gray-700">
                                                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Subtarefas:</p>
                                                    <ul className="list-decimal pl-5 space-y-1 dark:text-gray-300">{task.subtasks.map((sub, idx) => <li key={idx}>{sub}</li>)}</ul>
                                                    <div className="mt-2 text-xs flex gap-4 pt-2 border-t dark:border-gray-700 dark:text-gray-400"><div><strong>C1:</strong> {task.classification1}</div><div><strong>C2:</strong> {task.classification2}</div><div><strong>Tipo:</strong> {task.task_type}</div></div>
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

      {editingTask && (
        <Modal isOpen={true} onClose={() => setEditingTask(null)} title="Editar Tarefa">
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                <div><label className="block text-sm font-bold mb-1">Título</label><input value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Freq (Dias)</label><input type="number" value={editingTask.frequency_days} onChange={e => setEditingTask({...editingTask, frequency_days: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" /></div>
                    <div><label className="block text-sm font-bold mb-1">Duração (Min)</label><input type="number" value={editingTask.estimated_duration_minutes} onChange={e => setEditingTask({...editingTask, estimated_duration_minutes: Number(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1 text-red-600">Inatividade (Min)</label><input type="number" value={editingTask.planned_downtime_minutes||0} onChange={e => setEditingTask({...editingTask, planned_downtime_minutes: Number(e.target.value)})} className="w-full p-2 border rounded border-red-200 bg-red-50 dark:bg-red-900/20 dark:text-white" /></div>
                    <div><label className="block text-sm font-bold mb-1">Criticidade</label><select value={editingTask.criticality} onChange={e => setEditingTask({...editingTask, criticality: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-bold mb-1">Tipo</label><select value={editingTask.task_type} onChange={e => setEditingTask({...editingTask, task_type: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"><option>Preventiva</option><option>Corretiva</option><option>Preditiva</option><option>Inspeção</option><option>Limpeza</option><option>Projeto</option><option>Acompanhamento de Serviço</option><option>Coleta de dados</option></select></div>
                    <div><label className="block text-sm font-bold mb-1">Class 1</label><input value={editingTask.classification1||''} onChange={e => setEditingTask({...editingTask, classification1: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" /></div>
                </div>
                <div>
                    <div className="flex justify-between items-end mb-2"><label className="block text-sm font-bold">Checklist</label><button onClick={addSubtask} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">+ Item</button></div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">{editingTask.subtasks?.map((sub, i) => (<div key={i} className="flex gap-2 items-center"><span className="text-xs text-gray-400 w-4">{i+1}.</span><input value={sub} onChange={e => updateSubtask(i, e.target.value)} className="flex-1 p-1.5 text-sm border rounded dark:bg-gray-700 dark:text-white" /><button onClick={() => removeSubtask(i)} className="text-red-400"><Trash2 size={14}/></button></div>))}</div>
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-700"><button onClick={() => setEditingTask(null)} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded">Cancelar</button><button onClick={handleSaveTask} className="px-4 py-2 bg-blue-600 text-white rounded font-bold flex items-center gap-2"><Save size={16}/> Salvar</button></div>
            </div>
        </Modal>
      )}
      <StandardLibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} />
      {showCustomWizard && <CustomInitializationModal isOpen={true} onClose={() => setShowCustomWizard(false)} plantId={selectedPlantId} onSuccess={() => { alert("Criado!"); setShowCustomWizard(false); fetchPlantPlan(selectedPlantId); }} />}
    </div>
  );
};

export default MaintenancePlans;