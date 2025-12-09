// File: components/modals/OSForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { OS, OSStatus, Priority, Role } from '../../types';
import Modal from './Modal';

interface OSFormProps { isOpen: boolean; onClose: () => void; initialData?: OS; }

const OSForm: React.FC<OSFormProps> = ({ isOpen, onClose, initialData }) => {
  const { user } = useAuth();
  const { plants, users, addOS, updateOS, fetchPlantPlan, maintenancePlans } = useData();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    description: '', status: OSStatus.PENDING, priority: Priority.MEDIUM,
    plantId: '', subPlantId: '', inverterId: '', technicianId: '', supervisorId: '',
    startDate: new Date().toISOString().split('T')[0], activity: '', assets: [] as string[],
    subtasksStatus: [] as any[], attachmentsEnabled: true,
    classification1: '', classification2: '', estimatedDuration: 0, plannedDowntime: 0
  });

  const [selectedAssetCategory, setSelectedAssetCategory] = useState('');
  const [selectedPlanTask, setSelectedPlanTask] = useState('');
  
  const selectClasses = "w-full p-2 border rounded bg-white text-black border-gray-400 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-500";
  const inputClasses = "w-full p-2 border rounded bg-white text-black border-gray-400 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-500";

  useEffect(() => {
    if (isOpen && initialData) {
        setFormData({
            ...initialData,
            startDate: initialData.startDate.split('T')[0],
            subPlantId: initialData.subPlantId || '', inverterId: initialData.inverterId || '',
            subtasksStatus: initialData.subtasksStatus || [],
            classification1: initialData.classification1 || '',
            classification2: initialData.classification2 || '',
            estimatedDuration: initialData.estimatedDuration || 0,
            plannedDowntime: initialData.plannedDowntime || 0
        });
    }
  }, [initialData, isOpen]);

  useEffect(() => { if (formData.plantId) fetchPlantPlan(formData.plantId); }, [formData.plantId]);

  const plantPlan = maintenancePlans[formData.plantId] || [];
  const selectedPlant = plants.find(p => p.id === formData.plantId);
  const availableAssets = useMemo(() => Array.from(new Set(plantPlan.map(t => t.asset_category))).sort(), [plantPlan]);
  const availableTasks = useMemo(() => plantPlan.filter(t => t.asset_category === selectedAssetCategory), [plantPlan, selectedAssetCategory]);

  const handleTaskSelection = (taskId: string) => {
      setSelectedPlanTask(taskId);
      const task = plantPlan.find(t => t.id === taskId);
      if (task) {
          let prio = Priority.MEDIUM;
          if (task.criticality === 'Alto') prio = Priority.HIGH;
          if (task.criticality === 'Muito alto') prio = Priority.URGENT;
          if (task.criticality === 'Baixo') prio = Priority.LOW;

          setFormData(prev => ({
              ...prev,
              activity: task.title,
              description: `Tarefa: ${task.title}\nTipo: ${task.task_type}`,
              priority: prio,
              assets: [task.asset_category],
              subtasksStatus: task.subtasks.map((st, idx) => ({ id: idx, text: st, done: false })),
              classification1: task.classification1 || '',
              classification2: task.classification2 || '',
              estimatedDuration: task.estimated_duration_minutes || 0,
              plannedDowntime: 0 
          }));
      }
  };

  const availableTechnicians = useMemo(() => {
    if (!formData.plantId) return [];
    return users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(formData.plantId));
  }, [formData.plantId, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const osData = { 
        ...formData, 
        startDate: new Date(formData.startDate).toISOString(),
        estimatedDuration: Number(formData.estimatedDuration),
        plannedDowntime: Number(formData.plannedDowntime)
    };
    if (isEditing && initialData) updateOS({ ...initialData, ...osData });
    else addOS(osData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Editar OS` : 'Nova OS'}>
        {/* ✅ LAYOUT FLEX: Altura fixa com rolagem apenas no conteúdo */}
        <form onSubmit={handleSubmit} className="flex flex-col h-[80vh] text-gray-800 dark:text-gray-200">
            
            {/* CONTEÚDO ROLÁVEL */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div><label className="block text-sm font-bold mb-1">Usina</label>
                <select value={formData.plantId} onChange={e => setFormData({ ...formData, plantId: e.target.value })} className={selectClasses} disabled={isEditing}>
                    <option value="">Selecione...</option>{plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select></div>

                {selectedPlant?.subPlants && selectedPlant.subPlants.length > 0 && (
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-bold mb-1">Subusina</label>
                        <select value={formData.subPlantId} onChange={e => setFormData({ ...formData, subPlantId: e.target.value })} className={selectClasses}>
                            <option value="">Geral / Toda Usina</option>{selectedPlant.subPlants.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                        </select></div>
                        {formData.subPlantId && (
                            <div><label className="block text-sm font-bold mb-1">Inversor</label>
                            <select value={formData.inverterId} onChange={e => setFormData({ ...formData, inverterId: e.target.value })} className={selectClasses}>
                                <option value="">Todos</option>{Array.from({length: selectedPlant.subPlants.find(sp => sp.id === formData.subPlantId)?.inverterCount || 0}).map((_, i) => <option key={i} value={`INV-${i+1}`}>Inversor {i+1}</option>)}
                            </select></div>
                        )}
                    </div>
                )}

                {!isEditing && formData.plantId && (
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded border border-blue-200 dark:border-blue-700">
                        <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3">Selecionar do Plano</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <select value={selectedAssetCategory} onChange={e => setSelectedAssetCategory(e.target.value)} className={selectClasses}><option value="">Ativo...</option>{availableAssets.map(a => <option key={a} value={a}>{a}</option>)}</select>
                            <select value={selectedPlanTask} onChange={e => handleTaskSelection(e.target.value)} className={selectClasses} disabled={!selectedAssetCategory}><option value="">Tarefa...</option>{availableTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                        </div>
                    </div>
                )}

                <div><label className="block text-sm font-bold mb-1">Atividade</label><input value={formData.activity} onChange={e => setFormData({...formData, activity: e.target.value})} className={inputClasses} required /></div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-sm font-bold mb-1">Criticidade</label><select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as Priority})} className={selectClasses}>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                     <div><label className="block text-sm font-bold mb-1">Data de Início</label><input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} required className={inputClasses} /></div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded border border-gray-300 dark:border-gray-600">
                     <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Detalhes Técnicos</h5>
                     <div className="grid grid-cols-2 gap-4">
                         <div><label className="block text-xs font-bold text-gray-500">Classificação 1</label><input value={formData.classification1} onChange={e => setFormData({...formData, classification1: e.target.value})} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm" /></div>
                         <div><label className="block text-xs font-bold text-gray-500">Classificação 2</label><input value={formData.classification2} onChange={e => setFormData({...formData, classification2: e.target.value})} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm" /></div>
                         <div><label className="block text-xs font-bold text-gray-500">Duração Est. (min)</label><input type="number" value={formData.estimatedDuration} onChange={e => setFormData({...formData, estimatedDuration: Number(e.target.value)})} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm" /></div>
                         <div><label className="block text-xs font-bold text-gray-500">Inatividade Plan. (min)</label><input type="number" value={formData.plannedDowntime} onChange={e => setFormData({...formData, plannedDowntime: Number(e.target.value)})} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded p-1 text-sm" /></div>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-sm font-bold mb-1">Técnico</label><select value={formData.technicianId} onChange={e => setFormData({...formData, technicianId: e.target.value})} required className={selectClasses}><option value="">Selecione...</option>{availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                     <div><label className="block text-sm font-bold mb-1">Supervisor</label><select value={formData.supervisorId} disabled className={`${selectClasses} bg-gray-100 opacity-70`}><option value="">{users.find(u => u.id === formData.supervisorId)?.name || 'Automático'}</option></select></div>
                </div>
                
                <div><label className="block text-sm font-bold mb-1">Descrição</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClasses} h-24`} /></div>
            </div>

            {/* RODAPÉ FIXO */}
            <div className="pt-4 border-t mt-auto flex justify-end gap-2 bg-white dark:bg-gray-800 shrink-0">
                <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar OS</button>
            </div>
        </form>
    </Modal>
  );
};
export default OSForm;