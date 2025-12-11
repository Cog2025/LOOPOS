// File: components/MaintenancePlans.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, PlantMaintenancePlan } from '../types';
import Modal from './modals/Modal';
import StandardLibraryModal from './modals/StandardLibraryModal';
import CustomInitializationModal from './modals/CustomInitializationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, Download, ChevronDown, ChevronRight, AlertCircle, BookOpen, Settings } from 'lucide-react';

const MaintenancePlans: React.FC = () => {
  const { plants, fetchPlantPlan, initializePlantPlan, maintenancePlans, updatePlantTask, deletePlantTask, createPlantTask, updatePlant, taskTemplates, fetchTaskTemplates } = useData();
  const { user } = useAuth();

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedPlantId, setSelectedPlantId] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [editingTask, setEditingTask] = useState<Partial<PlantMaintenancePlan> | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCustomWizard, setShowCustomWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : '';
  const selectStyle = { color: 'black', backgroundColor: 'white', borderColor: '#cbd5e1' };
  const selectClasses = "w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-black bg-white";

  // ✅ FILTRO DE USINAS PERMITIDAS (CORRIGIDO)
  const allowedPlants = useMemo(() => {
      if (!user) return [];
      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return plants;
      
      const normalizedUserName = user.name.trim().toLowerCase();

      return plants.filter(p => {
          // 1. Vínculo por ID
          const idMatch = user.plantIds && user.plantIds.includes(p.id);
          // 2. Vínculo por Nome (apenas para CLIENTE)
          const nameMatch = user.role === Role.CLIENT && p.client && p.client.trim().toLowerCase() === normalizedUserName;
          
          return idMatch || nameMatch;
      });
  }, [plants, user]);

  // Lista de clientes baseada nas usinas permitidas
  const clients = useMemo(() => Array.from(new Set(allowedPlants.map(p => p.client))).sort(), [allowedPlants]);
  
  // Filtra usinas pelo cliente selecionado no dropdown
  const filteredPlants = useMemo(() => {
    if (!selectedClient) return [];
    return allowedPlants.filter(p => p.client === selectedClient).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedClient, allowedPlants]);

  const currentPlan = maintenancePlans[selectedPlantId] || [];

  const availableAssets = useMemo(() => {
    if (!selectedPlantId) return [];
    const assetsInPlan = new Set<string>();
    currentPlan.forEach(task => { if(task.asset_category) assetsInPlan.add(task.asset_category.trim()); });
    const p = plants.find(plant => plant.id === selectedPlantId);
    p?.assets?.forEach(a => assetsInPlan.add(a.trim()));
    return Array.from(assetsInPlan).sort();
  }, [selectedPlantId, plants, currentPlan]);

  useEffect(() => {
    if (selectedPlantId) {
      setIsLoading(true);
      fetchPlantPlan(selectedPlantId).finally(() => setIsLoading(false));
    }
  }, [selectedPlantId]);

  const tasksForAsset = useMemo(() => {
      if (!selectedAsset) return [];
      const target = normalize(selectedAsset);
      return currentPlan.filter(t => {
          const cat = t.asset_category || '';
          return cat === selectedAsset || normalize(cat) === target || normalize(cat).includes(target) || target.includes(normalize(cat));
      });
  }, [currentPlan, selectedAsset]);

  // ✅ CORREÇÃO: Permissão para editar (Cliente não está incluído)
  const canEdit = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.COORDINATOR || user?.role === Role.SUPERVISOR;

  const toggleExpand = (id: string) => {
      setExpandedTasks(prev => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
      });
  };

  const handleInitializeStandard = async () => {
    if (confirm("⚠️ Cuidado! Isso vai APAGAR ativos/tarefas personalizados e resetar para o padrão LOOP. Continuar?")) {
        setIsLoading(true);
        await initializePlantPlan(selectedPlantId, 'STANDARD');
        setIsLoading(false);
        alert("Plano resetado para o padrão!");
        window.location.reload();
    }
  };

  const handleOpenCustomWizard = () => setShowCustomWizard(true);

  const handleAddAsset = async () => {
      const newAsset = prompt("Nome do novo Ativo (Ex: Jardinagem):");
      if(newAsset && selectedPlantId) {
          const plant = plants.find(p => p.id === selectedPlantId);
          if(plant && !plant.assets.includes(newAsset)) {
              await updatePlant({ ...plant, assets: [...plant.assets, newAsset].sort() });
              alert(`Ativo '${newAsset}' adicionado!`);
          }
      }
  };

  const handleSaveTask = async () => {
      if(!editingTask || !selectedPlantId) return;
      const payload = { ...editingTask, asset_category: selectedAsset || editingTask.asset_category, subtasks: editingTask.subtasks || [] };
      if (editingTask.id) await updatePlantTask(editingTask.id as string, payload);
      else await createPlantTask(selectedPlantId, payload);
      setEditingTask(null);
      fetchPlantPlan(selectedPlantId);
  };

  const handleDeleteTask = async (task: PlantMaintenancePlan) => {
      if(confirm("Excluir tarefa?")) {
          await deletePlantTask(task.id);
          fetchPlantPlan(selectedPlantId);
      }
  };

  const addSubtask = () => setEditingTask(prev => ({...prev, subtasks: [...(prev?.subtasks || []), ""]}));
  const updateSubtask = (idx: number, val: string) => setEditingTask(prev => { const n = [...(prev?.subtasks || [])]; n[idx] = val; return {...prev, subtasks: n}; });
  const removeSubtask = (idx: number) => setEditingTask(prev => ({...prev, subtasks: (prev?.subtasks || []).filter((_, i) => i !== idx)}));

  // PDF DO PADRÃO LOOP
  const handleDownloadStandardPDF = async () => {
      await fetchTaskTemplates();
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text(`Plano Padrão LOOP`, 14, 20);
      doc.setFontSize(10); doc.text(`Biblioteca Completa de Manutenção`, 14, 26);
      
      const tableBody: any[] = [];
      const sortedTemplates = [...taskTemplates].sort((a,b) => a.asset_category.localeCompare(b.asset_category));

      sortedTemplates.forEach(task => {
          tableBody.push([
              { content: task.asset_category, rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold' } }, 
              { content: task.title, styles: { fontStyle: 'bold' } },
              `${task.frequency_days} dias`, task.criticality
          ]);
          const details = `Classif.1: ${task.classification1 || '-'} | Classif.2: ${task.classification2 || '-'} | Duração: ${task.estimated_duration_minutes || 0} min`;
          const subtasksText = task.subtasks.map((st, i) => `${i+1}. ${st}`).join('\n');
          tableBody.push([{ content: `${details}\n\nChecklist:\n${subtasksText}`, colSpan: 3, styles: { fontSize: 8, textColor: [80, 80, 80] } }]);
      });

      autoTable(doc, { startY: 35, head: [['Ativo', 'Tarefa / Checklist', 'Frequência', 'Criticidade']], body: tableBody, theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }});
      doc.save(`Plano_Padrao_LOOP.pdf`);
  };

  // ✅ PDF DA USINA (CLIENTE PODE BAIXAR)
  const handleDownloadPlantPDF = () => {
      const doc = new jsPDF();
      const plant = plants.find(p => p.id === selectedPlantId);
      doc.setFontSize(16); doc.text(`Plano de Manutenção: ${plant?.name || ''}`, 14, 20);
      doc.setFontSize(10); doc.text(`Cliente: ${selectedClient}`, 14, 26);
      const tableBody: any[] = [];
      const sortedPlan = [...currentPlan].sort((a, b) => (a.asset_category || '').localeCompare(b.asset_category || ''));
      sortedPlan.forEach(task => {
          tableBody.push([
              { content: task.asset_category, rowSpan: 2, styles: { valign: 'middle', fontStyle: 'bold' } }, 
              { content: task.title, styles: { fontStyle: 'bold' } },
              `${task.frequency_days} dias`, task.criticality
          ]);
          const details = `Classif.1: ${task.classification1 || '-'} | Classif.2: ${task.classification2 || '-'} | Duração: ${task.estimated_duration_minutes || 0} min`;
          const subtasksText = task.subtasks.map((st, i) => `${i+1}. ${st}`).join('\n');
          tableBody.push([{ content: `${details}\n\nChecklist:\n${subtasksText}`, colSpan: 3, styles: { fontSize: 8, textColor: [80, 80, 80] } }]);
      });
      autoTable(doc, { startY: 35, head: [['Ativo', 'Tarefa / Checklist', 'Frequência', 'Criticidade']], body: tableBody, theme: 'grid', styles: { fontSize: 9, cellPadding: 2 }});
      doc.save(`Plano_${plant?.name.replace(/\s/g, '_')}.pdf`);
  };

  const renderTasks = () => {
      if (!selectedAsset) return <div className="text-gray-500 text-center mt-10">Selecione um ativo.</div>;
      return (
          <div className="space-y-4 pb-20">
              <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-3 rounded shadow-sm border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-lg text-gray-800 dark:text-white">
                      Tarefas: {selectedAsset}
                      <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                          {tasksForAsset.length}
                      </span>
                  </h4>
                  {canEdit && (
                      <button onClick={() => setEditingTask({ asset_category: selectedAsset, subtasks: [] })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-bold shadow transition flex items-center gap-2">
                          <span>+</span> Nova Tarefa
                      </button>
                  )}
              </div>
              {tasksForAsset.map(task => {
                  const isExpanded = expandedTasks.has(task.id);
                  return (
                    <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-200 dark:border-gray-700 hover:border-blue-300 transition-all">
                        <div className="flex justify-between cursor-pointer" onClick={() => toggleExpand(task.id)}>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800 dark:text-gray-100">{task.title}</h4>
                                <div className="text-xs flex flex-wrap gap-2 mt-1">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">{task.frequency_days} dias</span>
                                    <span className={`px-2 py-0.5 rounded text-white ${task.criticality === 'Alto' ? 'bg-orange-500' : 'bg-green-500'}`}>{task.criticality}</span>
                                    <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">{task.estimated_duration_minutes || 0} min</span>
                                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-300">{task.task_type}</span>
                                </div>
                            </div>
                            {canEdit && <div onClick={e => e.stopPropagation()} className="flex gap-2 ml-2">
                                <button onClick={() => setEditingTask(task)} className="text-blue-500 hover:bg-blue-100 p-1 rounded">✏️</button>
                                <button onClick={() => handleDeleteTask(task)} className="text-red-500 hover:bg-red-100 p-1 rounded">🗑️</button>
                            </div>}
                        </div>
                        {isExpanded && (
                            <div className="mt-3 pt-3 border-t dark:border-gray-700 animate-fadeIn">
                                <div className="text-xs text-gray-500 mb-2 grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-700/30 p-2 rounded">
                                    <p><strong>Classif. 1:</strong> {task.classification1 || '-'}</p>
                                    <p><strong>Classif. 2:</strong> {task.classification2 || '-'}</p>
                                </div>
                                <p className="text-xs font-bold mb-1 text-gray-500 uppercase">Checklist ({task.subtasks.length}):</p>
                                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300 pl-1">
                                    {task.subtasks.map((st, i) => <li key={i} className="flex items-start"><span className="mr-2 text-blue-500 mt-1 font-mono">{i+1})</span><span className="whitespace-pre-wrap">{st}</span></li>)}
                                </ul>
                                <p className="text-xs text-blue-500 mt-4 cursor-pointer text-center font-bold hover:underline select-none" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>▲ Ocultar Detalhes</p>
                            </div>
                        )}
                        {!isExpanded && <p className="text-xs text-gray-400 mt-2 cursor-pointer text-center hover:text-blue-500 select-none" onClick={(e) => { e.stopPropagation(); toggleExpand(task.id); }}>▼ Ver Detalhes ({task.subtasks.length} itens)</p>}
                    </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="w-80 min-w-[320px] border-r dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col p-5 shadow-lg z-10">
        <h2 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2"><BookOpen className="w-6 h-6 text-blue-600" /> Planos</h2>
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase">Cliente</label>
            <select style={selectStyle} className={selectClasses} value={selectedClient} onChange={e => {setSelectedClient(e.target.value); setSelectedPlantId('');}}>
                <option value="">Selecione...</option>
                {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
        <div className="mb-4">
            <label className="text-xs font-bold text-gray-500 uppercase">Usina</label>
            <select style={selectStyle} className={selectClasses} value={selectedPlantId} onChange={e => {setSelectedPlantId(e.target.value); setSelectedAsset('');}} disabled={!selectedClient}>
                <option value="">Selecione...</option>
                {filteredPlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
        </div>
        <div className="flex-1 overflow-y-auto">
            {selectedPlantId && (
                <div className="space-y-1">
                    <div className="flex justify-between items-center px-2 py-1">
                        <span className="text-xs font-bold text-gray-400 uppercase">Ativos ({availableAssets.length})</span>
                        {canEdit && <button onClick={handleAddAsset} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition" title="Adicionar Novo Ativo">+ Novo</button>}
                    </div>
                    {availableAssets.map(a => (
                        <div key={a} onClick={() => setSelectedAsset(a)} className={`p-2 rounded cursor-pointer text-sm transition-colors ${selectedAsset === a ? 'bg-blue-100 text-blue-800 font-bold border-l-4 border-blue-500' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{a}</div>
                    ))}
                    {availableAssets.length === 0 && <div className="text-center p-4 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">Nenhum ativo encontrado. <br/>Clique em "Inicializar".</div>}
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden bg-gray-50 dark:bg-gray-900">
         <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
             <div>
                 <h3 className="text-2xl font-bold dark:text-white">{selectedAsset || "Visão Geral"}</h3>
                 {selectedAsset && <p className="text-sm text-gray-500">Gerenciando plano de manutenção para {selectedAsset}</p>}
             </div>
             
             <div className="flex gap-4 items-center">
                 <div className="flex gap-2 border-r pr-4 mr-2 border-gray-300 dark:border-gray-600">
                    <button onClick={() => setShowLibrary(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold shadow-sm transition">
                        📖 Biblioteca Padrão
                    </button>
                    {canEdit && (
                        <button onClick={handleDownloadStandardPDF} className="flex items-center gap-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs font-bold shadow-sm transition">
                            📄 Baixar Padrão
                        </button>
                    )}
                 </div>

                 {selectedPlantId && (
                     <div className="flex gap-2 animate-fadeIn">
                         {/* ✅ BOTÃO DOWNLOAD (Visível para Cliente também) */}
                         <button onClick={handleDownloadPlantPDF} className="flex items-center gap-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold shadow-md transition transform hover:scale-105">
                             <Download className="w-4 h-4" /> Baixar Plano da Usina
                         </button>
                         {canEdit && (
                             <div className="flex bg-gray-200 rounded p-1 gap-1">
                                <button onClick={handleInitializeStandard} className="px-3 py-1 text-xs font-bold bg-white hover:bg-blue-50 text-blue-700 rounded shadow-sm">Resetar</button>
                                <button onClick={handleOpenCustomWizard} className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded shadow-sm flex items-center gap-1"><Settings className="w-3 h-3" /> Custom</button>
                             </div>
                         )}
                     </div>
                 )}
             </div>
         </div>

         <div className="flex-1 overflow-y-auto pr-2">
            {isLoading ? <div className="flex justify-center items-center h-40 text-gray-500 animate-pulse">Carregando dados...</div> : renderTasks()}
         </div>
      </div>

      {editingTask && (
        <Modal isOpen={true} onClose={() => setEditingTask(null)} title={editingTask.id ? "Editar Tarefa" : "Nova Tarefa"}>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2 p-1">
                <div><label className="text-xs font-bold text-gray-500 uppercase">Título</label><input className="input w-full mt-1" style={selectStyle} value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Frequência (Dias)</label><input type="number" className="input w-full mt-1" style={selectStyle} value={editingTask.frequency_days} onChange={e => setEditingTask({...editingTask, frequency_days: Number(e.target.value)})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Duração (Min)</label><input type="number" className="input w-full mt-1" style={selectStyle} value={editingTask.estimated_duration_minutes} onChange={e => setEditingTask({...editingTask, estimated_duration_minutes: Number(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Classificação 1</label><input className="input w-full mt-1" style={selectStyle} value={editingTask.classification1 || ''} onChange={e => setEditingTask({...editingTask, classification1: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Classificação 2</label><input className="input w-full mt-1" style={selectStyle} value={editingTask.classification2 || ''} onChange={e => setEditingTask({...editingTask, classification2: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Criticidade</label><select className="input w-full mt-1" style={selectStyle} value={editingTask.criticality} onChange={e => setEditingTask({...editingTask, criticality: e.target.value})}><option>Baixo</option><option>Médio</option><option>Alto</option><option>Muito alto</option></select></div>
                    <div><label className="text-xs font-bold text-gray-500 uppercase">Tipo</label><input className="input w-full mt-1" style={selectStyle} value={editingTask.task_type} onChange={e => setEditingTask({...editingTask, task_type: e.target.value})} /></div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-600 uppercase">Checklist / Subtarefas</label><button onClick={addSubtask} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition shadow">+ Adicionar Item</button></div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {editingTask.subtasks?.map((st, i) => (<div key={i} className="flex gap-2 items-center"><span className="text-xs text-gray-400 font-mono w-5 text-right">{i+1}.</span><input className="flex-1 border border-gray-300 p-1.5 text-sm rounded text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={st} onChange={e => updateSubtask(i, e.target.value)} /><button onClick={() => removeSubtask(i)} className="text-red-500 hover:bg-red-50 p-1 rounded transition bg-white border border-red-200">✕</button></div>))}
                        {(!editingTask.subtasks || editingTask.subtasks.length === 0) && <p className="text-xs text-gray-400 text-center py-2">Nenhuma subtarefa definida.</p>}
                    </div>
                </div>
                <div className="pt-4 flex justify-end gap-2 border-t mt-4"><button onClick={() => setEditingTask(null)} className="btn-secondary">Cancelar</button><button onClick={handleSaveTask} className="btn-primary">Salvar Alterações</button></div>
            </div>
        </Modal>
      )}
      <StandardLibraryModal isOpen={showLibrary} onClose={() => setShowLibrary(false)} />
      
      {showCustomWizard && (
          <CustomInitializationModal 
            isOpen={true} 
            onClose={() => setShowCustomWizard(false)} 
            plantId={selectedPlantId}
            onSuccess={() => {
                alert("Plano Customizado criado com sucesso!");
                fetchPlantPlan(selectedPlantId);
            }}
          />
      )}
    </div>
  );
};

export default MaintenancePlans;