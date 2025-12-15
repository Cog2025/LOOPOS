// File: components/modals/PlantForm.tsx
// Componente para criação e edição de Usinas.
// ATUALIZAÇÃO: Correção de sintaxe JSX no botão de submit (removidos caracteres de escape incorretos).

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, SubPlant, Role } from '../../types';

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
  
  // ✅ ITEM 3: Filtra apenas usuários que são CLIENTES para o select
  const clientUsers = useMemo(() => users.filter(u => u.role === Role.CLIENT), [users]);

  // Carrega dados iniciais
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setSubPlantQty(initialData.subPlants?.length || 0);
      setAssignments({
        coordinatorId: initialData.coordinatorId || '',
        supervisorIds: initialData.supervisorIds || [],
        technicianIds: initialData.technicianIds || [],
        assistantIds: initialData.assistantIds || []
      });
    } else {
      setFormData(prev => ({ ...prev, client: presetClient || '' }));
    }
  }, [initialData, presetClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Gera subusinas se necessário
    let finalSubPlants = formData.subPlants || [];
    if (subPlantQty > finalSubPlants.length) {
       const diff = subPlantQty - finalSubPlants.length;
       for (let i = 0; i < diff; i++) {
           finalSubPlants.push({ 
               id: crypto.randomUUID(), 
               name: `Subusina ${finalSubPlants.length + 1}`,
               inverterCount: 0, trackersPerInverter: 0, stringsPerInverter: 0 
           });
       }
    } else if (subPlantQty < finalSubPlants.length) {
       finalSubPlants = finalSubPlants.slice(0, subPlantQty);
    }

    const payload = { ...formData, subPlants: finalSubPlants } as Plant;
    
    if (initialData?.id) {
        await updatePlant(payload, assignments);
    } else {
        await addPlant(payload, assignments);
    }
    onClose();
  };

  const toggleAssignment = (field: keyof typeof assignments, userId: string) => {
    if (field === 'coordinatorId') {
        setAssignments(prev => ({ ...prev, coordinatorId: userId }));
    } else {
        setAssignments(prev => {
            const list = prev[field] as string[];
            return {
                ...prev,
                [field]: list.includes(userId) ? list.filter(id => id !== userId) : [...list, userId]
            };
        });
    }
  };

  // ✅ ITEM 4: Inputs com mais contraste (border-gray-400, text-gray-900)
  const inputClass = "w-full p-2 border border-gray-400 rounded text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none placeholder-gray-500";
  const labelClass = "block text-sm font-bold text-gray-800 mb-1";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Usina' : 'Nova Usina'}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
            
            {/* Abas */}
            <div className="flex border-b border-gray-300 mb-4 shrink-0">
                <button type="button" onClick={() => setActiveTab('DATA')} className={`flex-1 py-2 font-bold text-sm ${activeTab === 'DATA' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Dados da Usina</button>
                <button type="button" onClick={() => setActiveTab('TEAM')} className={`flex-1 py-2 font-bold text-sm ${activeTab === 'TEAM' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Equipe Técnica</button>
            </div>

            <div className="flex-1 overflow-y-auto px-1">
                {activeTab === 'DATA' && (
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Nome da Usina</label>
                            <input 
                                required 
                                value={formData.name || ''} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                className={inputClass} 
                                placeholder="Ex: UFV Sol Poente"
                            />
                        </div>
                        
                        {/* ✅ ITEM 3: Select de Clientes */}
                        <div>
                            <label className={labelClass}>Cliente / Proprietário</label>
                            <select 
                                required
                                value={formData.client || ''} 
                                onChange={e => setFormData({...formData, client: e.target.value})} 
                                className={inputClass}
                            >
                                <option value="">Selecione um cliente...</option>
                                {clientUsers.map(client => (
                                    <option key={client.id} value={client.name}>
                                        {client.name} (@{client.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Qtde. Strings</label>
                                <input type="number" value={formData.stringCount || 0} onChange={e => setFormData({...formData, stringCount: parseInt(e.target.value) || 0})} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Qtde. Trackers</label>
                                <input type="number" value={formData.trackerCount || 0} onChange={e => setFormData({...formData, trackerCount: parseInt(e.target.value) || 0})} className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Número de Subusinas</label>
                            <input type="number" min={0} max={20} value={subPlantQty} onChange={e => setSubPlantQty(parseInt(e.target.value) || 0)} className={inputClass} />
                            <p className="text-xs text-gray-600 mt-1">Ao salvar, as subusinas serão criadas automaticamente.</p>
                        </div>

                        {/* Ativos */}
                        <div>
                            <label className={labelClass}>Ativos e Equipamentos</label>
                            <div className="flex gap-2 mb-2">
                                <input 
                                    value={newAsset} 
                                    onChange={e => setNewAsset(e.target.value)} 
                                    placeholder="Novo ativo (ex: Transformador)" 
                                    className={inputClass} 
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (newAsset.trim()) {
                                                setFormData(prev => ({ ...prev, assets: [...(prev.assets || []), newAsset.trim()] }));
                                                setNewAsset('');
                                            }
                                        }
                                    }}
                                />
                                <button type="button" onClick={() => { if(newAsset) { setFormData(prev => ({...prev, assets: [...(prev.assets||[]), newAsset]})); setNewAsset(''); } }} className="px-3 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.assets?.map((asset, i) => (
                                    <span key={i} className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-sm flex items-center gap-2 border border-gray-300">
                                        {asset} 
                                        <button type="button" onClick={() => setFormData(prev => ({...prev, assets: prev.assets?.filter((_, idx) => idx !== i)}))} className="text-red-600 font-bold hover:text-red-800">×</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'TEAM' && (
                    <div className="space-y-6">
                        {/* Coordenador (Radio) */}
                        <div className="bg-gray-50 p-3 rounded border border-gray-300">
                            <h4 className="font-bold text-sm text-gray-800 mb-2 border-b border-gray-200 pb-1">Coordenador Responsável</h4>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {users.filter(u => u.role === Role.COORDINATOR).map(u => (
                                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                        <input 
                                            type="radio" 
                                            name="coordinator"
                                            checked={assignments.coordinatorId === u.id} 
                                            onChange={() => toggleAssignment('coordinatorId', u.id)}
                                            className="text-blue-600 border-gray-400"
                                        />
                                        <span className="text-sm text-gray-800 font-medium">{u.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Outros Cargos (Checkbox) */}
                        {[
                            { title: 'Supervisores', role: Role.SUPERVISOR, key: 'supervisorIds', list: assignments.supervisorIds },
                            { title: 'Técnicos', role: Role.TECHNICIAN, key: 'technicianIds', list: assignments.technicianIds },
                            { title: 'Auxiliares', role: Role.ASSISTANT, key: 'assistantIds', list: assignments.assistantIds },
                        ].map(group => (
                            <div key={group.key} className="bg-gray-50 p-3 rounded border border-gray-300">
                                <h4 className="font-bold text-sm text-gray-800 mb-2 border-b border-gray-200 pb-1">{group.title}</h4>
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                    {users.filter(u => u.role === group.role).map(u => (
                                        <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                            <input 
                                                type="checkbox" 
                                                checked={(group.list as string[]).includes(u.id)} 
                                                onChange={() => toggleAssignment(group.key as any, u.id)}
                                                className="rounded text-blue-600 w-4 h-4 border-gray-400"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{u.name}</span>
                                        </label>
                                    ))}
                                    {users.filter(u => u.role === group.role).length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Nenhum usuário encontrado.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-300 mt-auto flex justify-end gap-2 shrink-0 bg-white p-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-gray-800 font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow-md transition-transform transform active:scale-95">Salvar Usina</button>
            </div>
        </form>
    </Modal>
  );
};

export default PlantForm;