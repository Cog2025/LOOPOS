//File: components/MaintenancePlans.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Role, PlantMaintenancePlan } from '../types';
import Modal from './modals/Modal';
import StandardLibraryModal from './modals/StandardLibraryModal';
import CustomInitializationModal from './modals/CustomInitializationModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, ChevronDown, ChevronRight, AlertCircle, BookOpen, Settings, Plus, Trash2, Edit, Save, X } from 'lucide-react';

const MaintenancePlans: React.FC = () => {
  const { plants, fetchPlantPlan, maintenancePlans, updatePlantTask, deletePlantTask, createPlantTask, initializePlantPlan } = useData();
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

  // ✅ NOVA LÓGICA DE PDF APRIMORADA
  const handleDownloadPDF = () => {
    if (!selectedPlantId || !currentPlant) return;
    const doc = new jsPDF();
    
    // --- 1. CABEÇALHO E RESUMO DA USINA ---
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text(`Plano de Manutenção: ${currentPlant.name}`, 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Cliente: ${currentPlant.client}`, 14, 26);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString()}`, 14, 31);

    // Resumo Técnico
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 35, 196, 35);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumo da Instalação:', 14, 42);
    
    const summaryData = [
        [`Inversores: ${currentPlant.subPlants.reduce((acc, sp) => acc + sp.inverterCount, 0)}`, 
         `Strings: ${currentPlant.stringCount}`, 
         `Trackers: ${currentPlant.trackerCount}`,
         `Subusinas: ${currentPlant.subPlants.length}`]
    ];

    autoTable(doc, {
        startY: 45,
        head: [],
        body: summaryData,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { fontStyle: 'bold' }, 2: { fontStyle: 'bold' }, 3: { fontStyle: 'bold' } }
    });

    // --- 2. TABELAS POR ATIVO COM CABEÇALHOS COLORIDOS ---
    let lastY = (doc as any).lastAutoTable.finalY + 10;

    // Paleta de cores para os cabeçalhos
    const headerColors = [
        [41, 128, 185],  // Azul
        [39, 174, 96],   // Verde
        [230, 126, 34],  // Laranja
        [142, 68, 173],  // Roxo
        [192, 57, 43],   // Vermelho
        [52, 73, 94]     // Cinza Escuro
    ];
    let colorIndex = 0;

    Object.entries(tasksByAsset).forEach(([assetName, tasks]) => {
        // Seleciona cor cíclica
        const [r, g, b] = headerColors[colorIndex % headerColors.length];
        colorIndex++;

        // Título do Grupo
        doc.setFontSize(12);
        doc.setTextColor(r, g, b);
        doc.text(assetName.toUpperCase(), 14, lastY);
        
        const tableBody = tasks.map(t => [
            t.title,
            `${t.frequency_days} dias`,
            // Formata subtarefas como "1) ... 2) ..."
            t.subtasks.map((s, i) => `${i + 1}) ${s}`).join('\n')
        ]);

        autoTable(doc, {
            startY: lastY + 2,
            head: [['Tarefa', 'Frequência', 'Subtarefas']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [r, g, b], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold' }, // Tarefa
                1: { cellWidth: 25 }, // Frequência
                2: { cellWidth: 'auto' } // Subtarefas
            },
            didDrawPage: (data) => {
                // Se quebrar página, atualiza o Y para não sobrepor
                lastY = data.cursor.y; 
            }
        });

        // Atualiza Y para a próxima tabela
        lastY = (doc as any).lastAutoTable.finalY + 10;
        
        // Verifica se precisa de nova página para o próximo título
        if (lastY > 270) {
            doc.addPage();
            lastY = 20;
        }
    });

    doc.save(`Plano_${currentPlant.name}.pdf`);
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
            <button 
                onClick={handleDownloadPDF}
                disabled={!selectedPlantId || planData.length === 0}
                className="flex-1 md:flex-none px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
                <Download size={18} /> Baixar PDF
            </button>

            <button 
                onClick={() => setShowLibrary(true)}
                className={`flex-1 md:flex-none px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2
                    ${!canManageLibrary ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={!canManageLibrary}
            >
                <BookOpen size={18} /> Biblioteca Padrão
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
                                                            <button 
                                                                onClick={(e) => handleEditClick(e, task)}
                                                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleDeleteTask(e, task.id)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {expandedTasks.has(task.id) && (
                                                <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded text-sm text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {task.subtasks.map((sub, idx) => <li key={idx}>{sub}</li>)}
                                                    </ul>
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
            <div className="p-4 space-y-4">
                <input value={editingTask.title} onChange={e => setEditingTask({...editingTask, title: e.target.value})} className="w-full p-2 border rounded" placeholder="Título" />
                <div className="flex justify-end gap-2 pt-4">
                    <button onClick={() => setEditingTask(null)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSaveTask} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Salvar</button>
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