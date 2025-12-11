// File: components/modals/PlantForm.tsx
// Componente para criação e edição de Usinas.
// ATUALIZAÇÃO: Correção de sintaxe JSX no botão de submit (removidos caracteres de escape incorretos).

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, SubPlant, Role } from '../../types';
import { STANDARD_ASSETS } from '../../constants'; //

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;
  presetClient?: string;
}

const PlantForm: React.FC<Props> = ({ isOpen, onClose, initialData, presetClient }) => {
  const { addPlant, updatePlant, users } = useData();
  
  const [formData, setFormData] = useState<Partial<Plant>>({
    client: presetClient || '', name: '', stringCount: 0, trackerCount: 0,
    assets: [], subPlants: []
  });
  
  const [subPlantQty, setSubPlantQty] = useState(0);
  const [assignments, setAssignments] = useState({ 
      coordinatorId: '', supervisorIds: [] as string[], technicianIds: [] as string[], assistantIds: [] as string[] 
  });
  const [newAsset, setNewAsset] = useState('');
  const [activeTab, setActiveTab] = useState<'DATA' | 'TEAM'>('DATA');
  
  // ✅ ESTILO DE INPUT REFORÇADO: Texto preto, borda visível, foco claro
  const inputClass = "w-full border border-gray-300 p-2.5 rounded bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent placeholder-gray-400 shadow-sm";
  // ✅ ESTILO DE LABEL REFORÇADO: Negrito e escuro
  const labelClass = "block text-sm font-bold text-gray-800 dark:text-gray-200 mb-1.5 uppercase tracking-wide";

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setSubPlantQty(initialData.subPlants?.length || 0);
      // Carregar atribuições (simulado via usuários)
      const coord = users.find(u => u.plantIds?.includes(initialData.id) && u.role === Role.COORDINATOR);
      const sups = users.filter(u => u.plantIds?.includes(initialData.id) && u.role === Role.SUPERVISOR).map(u => u.id);
      const techs = users.filter(u => u.plantIds?.includes(initialData.id) && u.role === Role.TECHNICIAN).map(u => u.id);
      const assts = users.filter(u => u.plantIds?.includes(initialData.id) && u.role === Role.ASSISTANT).map(u => u.id);
      
      setAssignments({
          coordinatorId: coord?.id || '',
          supervisorIds: sups,
          technicianIds: techs,
          assistantIds: assts
      });
    } else {
        // Inicializa com ativos padrão se for nova usina
        setFormData(prev => ({ ...prev, assets: STANDARD_ASSETS }));
    }
  }, [initialData, users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Gerar subusinas se necessário
    let finalSubPlants = [...(formData.subPlants || [])];
    if (subPlantQty > finalSubPlants.length) {
        for (let i = finalSubPlants.length; i < subPlantQty; i++) {
            finalSubPlants.push({
                id: crypto.randomUUID(),
                name: `Subusina ${i + 1}`,
                inverterCount: 0, trackersPerInverter: 0, stringsPerInverter: 0
            });
        }
    } else if (subPlantQty < finalSubPlants.length) {
        finalSubPlants = finalSubPlants.slice(0, subPlantQty);
    }

    const payload = { ...formData, subPlants: finalSubPlants } as Plant;
    
    // Converte assignments para o formato que o backend espera
    const assignPayload = {
        coordinatorId: assignments.coordinatorId,
        supervisorIds: assignments.supervisorIds,
        technicianIds: assignments.technicianIds,
        assistantIds: assignments.assistantIds
    };

    if (initialData?.id) {
      await updatePlant(payload, assignPayload);
    } else {
      await addPlant(payload as Omit<Plant, 'id'>, assignPayload);
    }
    onClose();
  };

  const toggleAssignment = (group: 'supervisorIds'|'technicianIds'|'assistantIds', userId: string) => {
      setAssignments(prev => {
          const list = prev[group];
          const newList = list.includes(userId) ? list.filter(id => id !== userId) : [...list, userId];
          return { ...prev, [group]: newList };
      });
  };

  const usersByRole = useMemo(() => ({
      coordinators: users.filter(u => u.role === Role.COORDINATOR),
      supervisors: users.filter(u => u.role === Role.SUPERVISOR),
      technicians: users.filter(u => u.role === Role.TECHNICIAN),
      assistants: users.filter(u => u.role === Role.ASSISTANT),
  }), [users]);

  // Handler para adicionar ativo customizado
  const handleAddCustomAsset = (e: React.FormEvent) => {
      e.preventDefault();
      if(newAsset && !formData.assets?.includes(newAsset)){
          setFormData(prev => ({...prev, assets: [...(prev.assets||[]), newAsset].sort()}));
          setNewAsset('');
      }
  }

  const handleRemoveAsset = (asset: string) => {
      setFormData(prev => ({...prev, assets: (prev.assets||[]).filter(a => a !== asset)}));
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? `Editar Usina: ${initialData.name}` : "Nova Usina"}>
        <form onSubmit={handleSubmit} className="flex flex-col h-[70vh]">
            <div className="flex border-b border-gray-300 dark:border-gray-700 mb-4 shrink-0">
                <button type="button" onClick={() => setActiveTab('DATA')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'DATA' ? 'border-b-4 border-blue-600 text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>🏢 Dados da Usina</button>
                <button type="button" onClick={() => setActiveTab('TEAM')} className={`px-6 py-3 font-bold text-sm ${activeTab === 'TEAM' ? 'border-b-4 border-blue-600 text-blue-700 bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>👥 Equipe Responsável</button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar p-1">
                {activeTab === 'DATA' && (
                    <div className="space-y-6">
                        {/* SEÇÃO 1: Identificação */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="text-xs font-black text-gray-400 uppercase mb-3 border-b pb-1">Identificação</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Nome da Usina</label>
                                    <input required className={inputClass} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: UFV Sol Poente" />
                                </div>
                                <div>
                                    <label className={labelClass}>Cliente Proprietário</label>
                                    <input required className={inputClass} value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} placeholder="Ex: Raízen" list="clients-list" />
                                    <datalist id="clients-list">
                                        {Array.from(new Set(users.filter(u=>u.role===Role.CLIENT).map(u=>u.name))).map(c=><option key={c} value={c}/>)}
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 2: Configuração Técnica */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <h3 className="text-xs font-black text-gray-400 uppercase mb-3 border-b pb-1">Configuração Técnica</h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Qtde. Strings</label>
                                    <input type="number" className={inputClass} value={formData.stringCount} onChange={e => setFormData({...formData, stringCount: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className={labelClass}>Qtde. Trackers</label>
                                    <input type="number" className={inputClass} value={formData.trackerCount} onChange={e => setFormData({...formData, trackerCount: Number(e.target.value)})} />
                                </div>
                                <div>
                                    <label className={labelClass}>Qtde. Subusinas</label>
                                    <input type="number" min={0} max={20} className={inputClass} value={subPlantQty} onChange={e => setSubPlantQty(Number(e.target.value))} />
                                </div>
                            </div>
                        </div>

                        {/* SEÇÃO 3: Ativos e Equipamentos */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-end mb-2 border-b pb-1">
                                <h3 className="text-xs font-black text-gray-400 uppercase">Ativos e Equipamentos</h3>
                                <div className="flex gap-2">
                                    <input 
                                        className="text-xs p-1 border rounded w-32" 
                                        placeholder="Novo ativo..." 
                                        value={newAsset} 
                                        onChange={e=>setNewAsset(e.target.value)} 
                                        onKeyDown={e => e.key === 'Enter' && handleAddCustomAsset(e)}
                                    />
                                    <button type="button" onClick={handleAddCustomAsset} className="bg-green-600 text-white text-xs px-2 py-1 rounded font-bold hover:bg-green-700">+</button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {formData.assets?.map(asset => (
                                    <div key={asset} className="flex justify-between items-center bg-white border border-gray-300 p-2 rounded shadow-sm hover:border-blue-400 transition-colors">
                                        <span className="text-sm font-medium text-gray-800">{asset}</span>
                                        <button type="button" onClick={() => handleRemoveAsset(asset)} className="text-red-400 hover:text-red-600 font-bold px-2">×</button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 italic">* Estes ativos definirão as opções disponíveis ao criar OSs para esta usina.</p>
                        </div>
                    </div>
                )}

                {activeTab === 'TEAM' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800">
                            <p><strong>Nota:</strong> Ao salvar, os usuários selecionados terão esta usina adicionada automaticamente à sua lista de permissões.</p>
                        </div>

                        <div>
                            <label className={labelClass}>Coordenador (Responsável Geral)</label>
                            <select 
                                className={inputClass}
                                value={assignments.coordinatorId}
                                onChange={e => setAssignments({...assignments, coordinatorId: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {usersByRole.coordinators.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        {[
                            { title: 'Supervisores', list: usersByRole.supervisors, key: 'supervisorIds' },
                            { title: 'Técnicos', list: usersByRole.technicians, key: 'technicianIds' },
                            { title: 'Auxiliares', list: usersByRole.assistants, key: 'assistantIds' }
                        ].map(group => (
                            <div key={group.key} className="bg-white p-3 border rounded-lg shadow-sm">
                                <label className={labelClass}>{group.title}</label>
                                <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
                                    {group.list.map(u => (
                                        <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={(assignments[group.key as keyof typeof assignments] as string[]).includes(u.id)} 
                                                onChange={() => toggleAssignment(group.key as any, u.id)}
                                                className="rounded text-blue-600 w-4 h-4 border-gray-400"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{u.name}</span>
                                        </label>
                                    ))}
                                    {group.list.length === 0 && <p className="text-xs text-gray-400 italic p-2">Nenhum usuário com cargo {group.title} encontrado.</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-300 mt-auto flex justify-end gap-2 shrink-0 bg-white p-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-bold transition-colors">Cancelar</button>
                {/* ✅ CORREÇÃO: Removidas as barras invertidas que causavam o erro */}
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-md transition-transform transform active:scale-95">Salvar Usina</button>
            </div>
        </form>
    </Modal>
  );
};
export default PlantForm;