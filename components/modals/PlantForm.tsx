// File: components/modals/PlantForm.tsx
// Componente para criação e edição de Usinas.

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, Role, SubPlant } from '../../types';
import { ChevronDown, ChevronRight, Trash2, Plus, RefreshCw, Download } from 'lucide-react';
import CustomInitializationModal from './CustomInitializationModal';
import { generateMaintenancePlanReport } from '../utils/pdfGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;
  presetClient?: string;
}

const PlantForm: React.FC<Props> = ({ isOpen, onClose, initialData, presetClient }) => {
  const { addPlant, updatePlant, users, maintenancePlans, fetchPlantPlan, initializePlantPlan } = useData();
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Plant>>({
    client: presetClient || '', name: '', stringCount: 0, trackerCount: 0,
    assets: [], subPlants: []
  });
  
  const [subPlants, setSubPlants] = useState<SubPlant[]>([]);
  const [expandedSubPlant, setExpandedSubPlant] = useState<string | null>(null);

  const [stdInverters, setStdInverters] = useState(0);
  const [stdStrings, setStdStrings] = useState(0);
  const [stdTrackers, setStdTrackers] = useState(0);

  const [assignments, setAssignments] = useState({ 
      coordinatorId: '', supervisorIds: [] as string[], technicianIds: [] as string[], assistantIds: [] as string[] 
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'equipe' | 'manutencao'>('geral');

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setFormData(initialData);
            setSubPlants(initialData.subPlants || []);
            setAssignments({
                coordinatorId: initialData.coordinatorId || '',
                supervisorIds: initialData.supervisorIds || [],
                technicianIds: initialData.technicianIds || [],
                assistantIds: initialData.assistantIds || []
            });
            if (initialData.subPlants?.[0]) {
                setStdInverters(initialData.subPlants[0].inverterCount);
                setStdStrings(initialData.subPlants[0].stringsPerInverter);
                setStdTrackers(initialData.subPlants[0].trackersPerInverter);
            }
            fetchPlantPlan(initialData.id);
        } else {
            // Reset para nova usina
            setFormData({ client: presetClient || '', name: '', stringCount: 0, trackerCount: 0, assets: [], subPlants: [] });
            setSubPlants([]);
            setAssignments({ coordinatorId: '', supervisorIds: [], technicianIds: [], assistantIds: [] });
        }
    }
  }, [isOpen, initialData, presetClient]);

  const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      const payload = { ...formData, subPlants };
      if (initialData) {
          await updatePlant(payload as Plant, assignments);
      } else {
          await addPlant(payload as Plant, assignments);
      }
      onClose();
  };

  const handleGenerateSubPlants = () => {
      const generated: SubPlant[] = Array.from({ length: 1 }).map((_, i) => ({
          id: crypto.randomUUID(),
          name: `Subusina ${i + 1}`,
          inverterCount: stdInverters,
          inverterStartIndex: 1,
          trackersPerInverter: stdTrackers,
          stringsPerInverter: stdStrings
      }));
      setSubPlants(generated);
  };

  const updateSubPlant = (id: string, field: keyof SubPlant, value: any) => {
      setSubPlants(prev => prev.map(sp => sp.id === id ? { ...sp, [field]: value } : sp));
  };

  const toggleAssignment = (role: 'supervisorIds' | 'technicianIds' | 'assistantIds', userId: string) => {
      setAssignments(prev => {
          const current = prev[role];
          const updated = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId];
          return { ...prev, [role]: updated };
      });
  };

  // Função de Download do Plano
  const handleDownloadPlan = () => {
      if (!initialData) return;
      const tasks = maintenancePlans[initialData.id] || [];
      
      if (tasks.length === 0) {
          alert("O plano de manutenção está vazio. Inicialize o plano primeiro.");
          return;
      }

      const doc = generateMaintenancePlanReport(tasks, initialData.name);
      doc.save(`Plano_Manutencao_${initialData.name.replace(/\s/g, '_')}.pdf`);
  };

  const inputClass = "w-full p-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-gray-700 dark:border-gray-600 dark:text-white";
  const labelClass = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase";

  // Agrupamento de Usuários
  const userGroups = [
      { role: Role.SUPERVISOR, label: 'Supervisores', key: 'supervisorIds', list: assignments.supervisorIds },
      { role: Role.TECHNICIAN, label: 'Técnicos', key: 'technicianIds', list: assignments.technicianIds },
      { role: Role.ASSISTANT, label: 'Auxiliares', key: 'assistantIds', list: assignments.assistantIds }
  ];

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? `Editar Usina: ${initialData.name}` : 'Nova Usina'}>
        <form onSubmit={handleSave} className="flex flex-col h-[80vh]">
            {/* TABS */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 shrink-0">
                <button type="button" onClick={() => setActiveTab('geral')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'geral' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Geral & Ativos</button>
                <button type="button" onClick={() => setActiveTab('equipe')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'equipe' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Equipe</button>
                {initialData && (
                    <button type="button" onClick={() => setActiveTab('manutencao')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'manutencao' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Plano de Manutenção</button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-1">
                {/* ABA GERAL */}
                {activeTab === 'geral' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nome da Usina</label><input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} /></div>
                            <div><label className={labelClass}>Cliente (Razão Social)</label><input required value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} className={inputClass} /></div>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded border dark:border-gray-700">
                            <h4 className="font-bold text-sm mb-3 flex items-center gap-2 dark:text-white"><FactoryIcon /> Configuração Padrão de Subusina</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div><label className={labelClass}>Inversores</label><input type="number" value={stdInverters} onChange={e => setStdInverters(Number(e.target.value))} className={inputClass} /></div>
                                <div><label className={labelClass}>Strings/Inv.</label><input type="number" value={stdStrings} onChange={e => setStdStrings(Number(e.target.value))} className={inputClass} /></div>
                                <div><label className={labelClass}>Trackers/Inv.</label><input type="number" value={stdTrackers} onChange={e => setStdTrackers(Number(e.target.value))} className={inputClass} /></div>
                            </div>
                            <div className="mt-3 flex justify-end">
                                <button type="button" onClick={handleGenerateSubPlants} className="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded font-bold flex items-center gap-1">
                                    <RefreshCw size={12} /> Gerar/Resetar Subusinas
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {subPlants.map((sp, idx) => (
                                <div key={sp.id} className="border rounded bg-white dark:bg-gray-700 dark:border-gray-600 overflow-hidden">
                                    <div className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 cursor-pointer" onClick={() => setExpandedSubPlant(expandedSubPlant === sp.id ? null : sp.id)}>
                                        <div className="flex items-center gap-2 font-bold text-sm dark:text-white">
                                            {expandedSubPlant === sp.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                                            {sp.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {sp.inverterCount} Inv | {sp.inverterCount * sp.stringsPerInverter} Strings
                                        </div>
                                    </div>
                                    {expandedSubPlant === sp.id && (
                                        <div className="p-3 grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800/50">
                                            <div><label className={labelClass}>Nome</label><input value={sp.name} onChange={e => updateSubPlant(sp.id, 'name', e.target.value)} className={inputClass} /></div>
                                            <div><label className={labelClass}>Qtd Inversores</label><input type="number" value={sp.inverterCount} onChange={e => updateSubPlant(sp.id, 'inverterCount', Number(e.target.value))} className={inputClass} /></div>
                                            <div><label className={labelClass}>Strings por Inversor</label><input type="number" value={sp.stringsPerInverter} onChange={e => updateSubPlant(sp.id, 'stringsPerInverter', Number(e.target.value))} className={inputClass} /></div>
                                            <div><label className={labelClass}>Trackers por Inversor</label><input type="number" value={sp.trackersPerInverter} onChange={e => updateSubPlant(sp.id, 'trackersPerInverter', Number(e.target.value))} className={inputClass} /></div>
                                            <div className="col-span-2">
                                                <label className={labelClass}>Índice Inicial (ex: 1 para INV 1.1)</label>
                                                <input type="number" value={sp.inverterStartIndex || 1} onChange={e => updateSubPlant(sp.id, 'inverterStartIndex', Number(e.target.value))} className={inputClass} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ABA EQUIPE */}
                {activeTab === 'equipe' && (
                    <div className="space-y-6">
                        <div>
                            <label className={labelClass}>Coordenador Responsável</label>
                            <select value={assignments.coordinatorId || ''} onChange={e => setAssignments({...assignments, coordinatorId: e.target.value})} className={inputClass}>
                                <option value="">Selecione...</option>
                                {users.filter(u => u.role === Role.COORDINATOR).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>

                        {userGroups.map(group => (
                            <div key={group.role} className="bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                                <h4 className="font-bold text-sm mb-2 dark:text-white">{group.label}</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                                    {users.filter(u => u.role === group.role).map(u => (
                                        <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 p-2 rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={(group.list as string[]).includes(u.id)} 
                                                onChange={() => toggleAssignment(group.key as any, u.id)} 
                                                className="rounded text-blue-600 focus:ring-blue-500" 
                                            />
                                            <span className="text-sm dark:text-gray-200">{u.name}</span>
                                        </label>
                                    ))}
                                    {users.filter(u => u.role === group.role).length === 0 && (
                                        <div className="text-xs text-gray-400 italic p-2">Nenhum usuário com este cargo.</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ABA PLANO DE MANUTENÇÃO */}
                {activeTab === 'manutencao' && initialData && (
                    <div className="space-y-4 h-full flex flex-col">
                        <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100">Status do Plano</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {maintenancePlans[initialData.id]?.length || 0} tarefas configuradas.
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button" 
                                    onClick={handleDownloadPlan}
                                    className="p-2 bg-white text-blue-600 border border-blue-200 rounded hover:bg-blue-50 shadow-sm"
                                    title="Baixar PDF Detalhado"
                                >
                                    <Download size={18} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => setIsInitModalOpen(true)} 
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow"
                                >
                                    Gerenciar Plano
                                </button>
                            </div>
                        </div>

                        {/* Tabela com tipagem corrigida (task: any) */}
                        <div className="flex-1 overflow-y-auto border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2">
                            {(maintenancePlans[initialData.id] || []).length > 0 ? (
                                <table className="w-full text-xs text-left text-gray-700 dark:text-gray-300">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-200 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-2 py-1">Ativo</th>
                                            <th className="px-2 py-1">Tarefa</th>
                                            <th className="px-2 py-1 text-center">Freq.</th>
                                            <th className="px-2 py-1 text-center">Criticidade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* ✅ CORREÇÃO: (task: any) resolve o erro "Property 'frequency' does not exist" */}
                                        {maintenancePlans[initialData.id].map((task: any, i) => (
                                            <tr key={i} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700">
                                                <td className="px-2 py-1 font-bold">{task.asset_category || 'Geral'}</td>
                                                <td className="px-2 py-1">{task.title}</td>
                                                <td className="px-2 py-1 text-center">{task.frequency}d</td>
                                                <td className={`px-2 py-1 text-center font-bold ${task.criticality === 'Alta' ? 'text-red-500' : 'text-green-500'}`}>{task.criticality}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center text-gray-400 mt-10">Nenhuma tarefa definida.</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* FOOTER AÇÕES */}
            <div className="pt-4 border-t mt-auto flex justify-end gap-3 shrink-0 bg-white dark:bg-gray-800">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 rounded-lg font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-transform transform active:scale-95">Salvar Usina</button>
            </div>
        </form>
    </Modal>

    {initialData && isInitModalOpen && (
        <CustomInitializationModal 
            isOpen={isInitModalOpen} 
            onClose={() => setIsInitModalOpen(false)} 
            plantId={initialData.id} 
            onSuccess={() => { setIsInitModalOpen(false); fetchPlantPlan(initialData.id); }} 
        />
    )}
    </>
  );
};

const FactoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>
);

export default PlantForm;