// File: components/modals/PlantForm.tsx
// Componente para criação e edição de Usinas.

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, Role } from '../../types';

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
  
  const clientUsers = useMemo(() => users.filter(u => u.role === Role.CLIENT), [users]);

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

  const inputClass = "w-full p-2.5 border border-gray-400 rounded text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 outline-none placeholder-gray-500 font-medium";
  // ✅ Labels dentro dos cartões podem ser um pouco mais simples, pois o título do cartão já dá contexto
  const innerLabelClass = "block text-xs font-bold text-gray-700 mb-1 uppercase";
  
  // ✅ Estilo do Cartão (Igual ao de Equipe)
  const cardClass = "bg-gray-50 p-4 rounded-lg border border-gray-300";
  const cardTitleClass = "font-extrabold text-sm text-gray-900 mb-3 border-b border-gray-300 pb-2 uppercase";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Usina' : 'Nova Usina'}>
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
            
            <div className="flex border-b border-gray-300 mb-4 shrink-0 bg-gray-50 rounded-t-lg">
                <button type="button" onClick={() => setActiveTab('DATA')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'DATA' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Dados da Usina</button>
                <button type="button" onClick={() => setActiveTab('TEAM')} className={`flex-1 py-3 font-bold text-sm transition-colors ${activeTab === 'TEAM' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>Equipe Técnica</button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar">
                {activeTab === 'DATA' && (
                    <div className="space-y-4">
                        
                        {/* CARTÃO 1: Informações Básicas */}
                        <div className={cardClass}>
                            <h4 className={cardTitleClass}>Informações Básicas</h4>
                            <div className="space-y-3">
                                <div>
                                    <label className={innerLabelClass}>Nome da Usina</label>
                                    <input 
                                        required 
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className={inputClass} 
                                        placeholder="Ex: UFV Sol Poente"
                                    />
                                </div>
                                <div>
                                    <label className={innerLabelClass}>Cliente / Proprietário</label>
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
                            </div>
                        </div>

                        {/* CARTÃO 2: Dimensionamento */}
                        <div className={cardClass}>
                            <h4 className={cardTitleClass}>Dimensionamento</h4>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <label className={innerLabelClass}>Qtde. Strings</label>
                                    <input type="number" value={formData.stringCount || 0} onChange={e => setFormData({...formData, stringCount: parseInt(e.target.value) || 0})} className={inputClass} />
                                </div>
                                <div>
                                    <label className={innerLabelClass}>Qtde. Trackers</label>
                                    <input type="number" value={formData.trackerCount || 0} onChange={e => setFormData({...formData, trackerCount: parseInt(e.target.value) || 0})} className={inputClass} />
                                </div>
                            </div>
                            <div>
                                <label className={innerLabelClass}>Número de Subusinas</label>
                                <input type="number" min={0} max={20} value={subPlantQty} onChange={e => setSubPlantQty(parseInt(e.target.value) || 0)} className={inputClass} />
                                <p className="text-xs text-blue-700 mt-1 font-bold">ℹ️ Ao salvar, as subusinas serão geradas automaticamente.</p>
                            </div>
                        </div>

                        {/* CARTÃO 3: Ativos */}
                        <div className={cardClass}>
                            <h4 className={cardTitleClass}>Ativos e Equipamentos</h4>
                            <div className="flex gap-2 mb-3">
                                <input 
                                    value={newAsset} 
                                    onChange={e => setNewAsset(e.target.value)} 
                                    placeholder="Adicionar novo ativo..." 
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
                                <button type="button" onClick={() => { if(newAsset) { setFormData(prev => ({...prev, assets: [...(prev.assets||[]), newAsset]})); setNewAsset(''); } }} className="px-4 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-sm text-lg">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.assets?.map((asset, i) => (
                                    <span key={i} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-800 rounded-md text-sm flex items-center gap-2 font-bold shadow-sm">
                                        {asset} 
                                        <button type="button" onClick={() => setFormData(prev => ({...prev, assets: prev.assets?.filter((_, idx) => idx !== i)}))} className="text-red-500 hover:text-red-700 font-bold ml-1 text-lg leading-none">×</button>
                                    </span>
                                ))}
                                {formData.assets?.length === 0 && <span className="text-sm text-gray-500 italic">Nenhum ativo cadastrado.</span>}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'TEAM' && (
                    <div className="space-y-4">
                        {/* Coordenador */}
                        <div className={cardClass}>
                            <h4 className={cardTitleClass}>Coordenador Responsável</h4>
                            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                {users.filter(u => u.role === Role.COORDINATOR).map(u => (
                                    <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded border border-transparent hover:border-gray-200 transition-colors">
                                        <input 
                                            type="radio" 
                                            name="coordinator"
                                            checked={assignments.coordinatorId === u.id} 
                                            onChange={() => toggleAssignment('coordinatorId', u.id)}
                                            className="text-blue-600 w-4 h-4 border-gray-400 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-900 font-bold">{u.name}</span>
                                        <span className="text-xs text-gray-500">@{u.username}</span>
                                    </label>
                                ))}
                                {users.filter(u => u.role === Role.COORDINATOR).length === 0 && <p className="text-sm text-red-500">Nenhum coordenador encontrado.</p>}
                            </div>
                        </div>

                        {/* Outros Cargos */}
                        {[
                            { title: 'Supervisores', role: Role.SUPERVISOR, key: 'supervisorIds', list: assignments.supervisorIds },
                            { title: 'Técnicos', role: Role.TECHNICIAN, key: 'technicianIds', list: assignments.technicianIds },
                            { title: 'Auxiliares', role: Role.ASSISTANT, key: 'assistantIds', list: assignments.assistantIds },
                        ].map(group => (
                            <div key={group.key} className={cardClass}>
                                <h4 className={cardTitleClass}>{group.title}</h4>
                                <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                    {users.filter(u => u.role === group.role).map(u => (
                                        <label key={u.id} className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded border border-transparent hover:border-gray-200 transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={(group.list as string[]).includes(u.id)} 
                                                onChange={() => toggleAssignment(group.key as any, u.id)}
                                                className="text-blue-600 w-4 h-4 border-gray-400 rounded focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-900 font-medium">{u.name}</span>
                                        </label>
                                    ))}
                                    {users.filter(u => u.role === group.role).length === 0 && (
                                        <p className="text-xs text-gray-500 italic p-1">Nenhum usuário encontrado.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="pt-4 border-t border-gray-300 mt-auto flex justify-end gap-3 shrink-0 bg-white p-3 rounded-b-xl">
                <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg text-gray-800 font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-transform transform active:scale-95">Salvar Usina</button>
            </div>
        </form>
    </Modal>
  );
};

export default PlantForm;