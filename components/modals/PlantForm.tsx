// File: components/modals/PlantForm.tsx
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, SubPlant, Role } from '../../types';
import { STANDARD_ASSETS } from '../../constants';

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
  
  // ✅ CORREÇÃO DE CONTRASTE: text-gray-900 (Preto) e font-bold
  const inputClass = "w-full border border-gray-400 p-2 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 placeholder-gray-500";
  const labelClass = "text-xs font-bold text-gray-900 uppercase mb-1 block"; 

  const coordinators = useMemo(() => users.filter(u => u.role === Role.COORDINATOR || u.role === Role.ADMIN), [users]);
  const supervisors = useMemo(() => users.filter(u => u.role === Role.SUPERVISOR), [users]);
  const technicians = useMemo(() => users.filter(u => u.role === Role.TECHNICIAN), [users]);
  const assistants = useMemo(() => users.filter(u => u.role === Role.ASSISTANT), [users]);

  useEffect(() => {
    if (isOpen) {
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
            setFormData({ client: presetClient || '', name: '', stringCount: 0, trackerCount: 0, assets: [], subPlants: [] });
            setSubPlantQty(0);
            setAssignments({ coordinatorId: '', supervisorIds: [], technicianIds: [], assistantIds: [] });
        }
    }
  }, [initialData, isOpen, presetClient]);

  useEffect(() => {
      const current = formData.subPlants || [];
      if (subPlantQty >= 0) {
          const newSubs = Array.from({ length: subPlantQty }).map((_, i) => {
              const existing = current[i];
              const baseName = formData.name && formData.name.trim() !== "" ? formData.name : "Subusina";
              const autoName = subPlantQty === 1 ? baseName : `${baseName} ${i + 1}`;
              
              if (existing) return { ...existing, name: autoName };
              
              return {
                  id: `SP-${Date.now()}-${i}`,
                  name: autoName,
                  inverterCount: 0, trackersPerInverter: 0, stringsPerInverter: 0
              };
          });
          if (newSubs.length !== current.length || newSubs.some((s, i) => s.name !== current[i]?.name)) {
              setFormData(prev => ({ ...prev, subPlants: newSubs }));
          }
      }
  }, [subPlantQty, formData.name]);

  const updateSub = (i: number, f: keyof SubPlant, v: any) => {
      const up = [...(formData.subPlants || [])];
      up[i] = { ...up[i], [f]: v };
      setFormData(prev => ({ ...prev, subPlants: up }));
  };

  const toggleAsset = (asset: string) => {
      const current = formData.assets || [];
      if (current.includes(asset)) {
          setFormData(prev => ({ ...prev, assets: current.filter(a => a !== asset) }));
      } else {
          setFormData(prev => ({ ...prev, assets: [...current, asset].sort() }));
      }
  };

  const toggleAllAssets = () => {
      const current = formData.assets || [];
      const allStandardSelected = STANDARD_ASSETS.every(a => current.includes(a));
      if (allStandardSelected) {
          setFormData(prev => ({ ...prev, assets: current.filter(a => !STANDARD_ASSETS.includes(a)) }));
      } else {
          const custom = current.filter(a => !STANDARD_ASSETS.includes(a));
          setFormData(prev => ({ ...prev, assets: [...STANDARD_ASSETS, ...custom].sort() }));
      }
  };

  const addCustomAsset = () => {
      if(newAsset && !formData.assets?.includes(newAsset)) {
          setFormData(prev => ({ ...prev, assets: [...(prev.assets||[]), newAsset].sort() }));
          setNewAsset('');
      }
  };

  const removeAsset = (asset: string) => {
      setFormData(prev => ({ ...prev, assets: prev.assets?.filter(x => x !== asset) }));
  };

  const toggleAssignment = (field: 'supervisorIds' | 'technicianIds' | 'assistantIds', id: string) => {
      setAssignments(prev => {
          const current = prev[field];
          const updated = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
          return { ...prev, [field]: updated };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (initialData?.id) await updatePlant({ ...initialData, ...formData } as Plant, assignments);
        else await addPlant(formData as Plant, assignments);
        onClose();
    } catch (e) { alert("Erro ao salvar usina."); }
  };

  const customAssets = (formData.assets || []).filter(a => !STANDARD_ASSETS.includes(a));
  const isAllAssetsSelected = STANDARD_ASSETS.every(a => (formData.assets || []).includes(a));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Usina" : "Nova Usina"}>
        <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
            <div className="flex border-b border-gray-300 mb-4 shrink-0 bg-gray-50 rounded-t-lg">
                <button type="button" onClick={() => setActiveTab('DATA')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'DATA' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>Dados & Ativos</button>
                <button type="button" onClick={() => setActiveTab('TEAM')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'TEAM' ? 'text-blue-700 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}>Equipe & Responsáveis</button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 pr-2 space-y-5">
                {activeTab === 'DATA' && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nome da Usina</label><input className={inputClass} placeholder="Ex: Bom Jesus" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required /></div>
                            <div><label className={labelClass}>Cliente</label><input className={inputClass} placeholder="Cliente" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required /></div>
                        </div>

                        <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 shadow-inner">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">🏢 Topologia (Subusinas)</h4>
                                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-300">
                                    <label className="text-xs font-bold text-gray-600">Qtd:</label>
                                    <input type="number" min="0" max="50" className="w-12 text-center text-sm font-bold outline-none text-blue-700" value={subPlantQty} onChange={(e) => setSubPlantQty(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {formData.subPlants?.map((sp, i) => (
                                    <div key={i} className="bg-white p-3 rounded-md border border-gray-300 shadow-sm hover:border-blue-400 transition-colors">
                                        <p className="text-sm font-bold text-blue-700 mb-2 border-b pb-1 border-gray-100">{sp.name}</p>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div><label className="text-[10px] font-bold text-gray-600 block mb-0.5">Inversores</label><input type="number" value={sp.inverterCount} onChange={e => updateSub(i, 'inverterCount', Number(e.target.value))} className="w-full border border-gray-300 p-1.5 text-sm rounded text-gray-900 font-medium focus:ring-1 focus:ring-blue-500" /></div>
                                            <div><label className="text-[10px] font-bold text-gray-600 block mb-0.5">Trackers/Sub</label><input type="number" value={sp.trackersPerInverter} onChange={e => updateSub(i, 'trackersPerInverter', Number(e.target.value))} className="w-full border border-gray-300 p-1.5 text-sm rounded text-gray-900 font-medium focus:ring-1 focus:ring-blue-500" /></div>
                                            <div><label className="text-[10px] font-bold text-gray-600 block mb-0.5">Strings/Inv</label><input type="number" value={sp.stringsPerInverter} onChange={e => updateSub(i, 'stringsPerInverter', Number(e.target.value))} className="w-full border border-gray-300 p-1.5 text-sm rounded text-gray-900 font-medium focus:ring-1 focus:ring-blue-500" /></div>
                                        </div>
                                    </div>
                                ))}
                                {subPlantQty === 0 && <p className="text-sm text-gray-500 text-center py-4 bg-white/50 rounded border border-dashed border-gray-300">Defina a quantidade acima para configurar a topologia.</p>}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h4 className={labelClass}>Ativos da Usina</h4>
                                <label className="flex items-center gap-1 cursor-pointer text-xs text-blue-700 font-bold hover:underline">
                                    <input type="checkbox" checked={isAllAssetsSelected} onChange={toggleAllAssets} className="rounded border-gray-400" /> Selecionar Todos
                                </label>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto border border-gray-300 p-2 rounded bg-white shadow-sm">
                                {STANDARD_ASSETS.map(asset => (
                                    <label key={asset} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1.5 rounded transition-colors group">
                                        <input type="checkbox" checked={(formData.assets || []).includes(asset)} onChange={() => toggleAsset(asset)} className="rounded text-blue-600 border-gray-400 w-4 h-4" />
                                        <span className={`text-xs ${ (formData.assets || []).includes(asset) ? 'text-blue-800 font-bold' : 'text-gray-700' } group-hover:text-black`}>{asset}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-3 flex gap-2">
                                <input className="flex-1 border border-gray-300 p-2 text-sm rounded bg-white text-gray-900" placeholder="Ativo personalizado..." value={newAsset} onChange={e => setNewAsset(e.target.value)} />
                                <button type="button" onClick={addCustomAsset} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded font-bold shadow-sm transition-colors">+</button>
                            </div>
                            {customAssets.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                                    <p className="w-full text-[10px] font-bold text-yellow-800 uppercase mb-1">Personalizados</p>
                                    {customAssets.map(a => (
                                        <span key={a} className="bg-white px-2 py-1 rounded text-xs text-gray-800 border border-yellow-300 flex items-center gap-1 shadow-sm">
                                            {a} <button type="button" onClick={() => removeAsset(a)} className="text-red-500 font-bold hover:bg-red-50 rounded px-1 transition-colors">×</button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'TEAM' && (
                    <div className="space-y-5 p-1">
                        <div>
                            {/* ✅ LABEL COM CONTRASTE CORRIGIDO */}
                            <label className={labelClass}>Coordenador Responsável</label>
                            <select className={inputClass} value={assignments.coordinatorId || ''} onChange={e => setAssignments({...assignments, coordinatorId: e.target.value})}>
                                <option value="">Selecione...</option>
                                {coordinators.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>

                        {[{role: 'Supervisor', list: supervisors, key: 'supervisorIds'}, {role: 'Técnico', list: technicians, key: 'technicianIds'}, {role: 'Auxiliar', list: assistants, key: 'assistantIds'}].map((group) => (
                            <div key={group.key as string} className="bg-white border border-gray-300 p-3 rounded-lg shadow-sm">
                                <h4 className="font-bold text-gray-800 text-sm mb-2 border-b pb-1 border-gray-100 flex justify-between">
                                    {group.role}es 
                                    <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs py-0.5">{assignments[group.key as keyof typeof assignments].length} selecionados</span>
                                </h4>
                                <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto pr-1">
                                    {group.list.map(u => (
                                        <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-1.5 rounded transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={(assignments[group.key as keyof typeof assignments] as string[]).includes(u.id)} 
                                                onChange={() => toggleAssignment(group.key as any, u.id)}
                                                className="rounded text-blue-600 w-4 h-4 border-gray-400"
                                            />
                                            <span className="text-sm text-gray-700 font-medium">{u.name}</span>
                                        </label>
                                    ))}
                                    {group.list.length === 0 && <p className="text-xs text-gray-400 italic p-2">Nenhum usuário com cargo {group.role} encontrado.</p>}
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