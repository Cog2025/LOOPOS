// File: components/modals/PlantForm.tsx
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { Plant, SubPlant } from '../../types';
import { STANDARD_ASSETS } from '../../constants'; // ✅ IMPORTAÇÃO DA LISTA CENTRAL

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;
  presetClient?: string;
}

const PlantForm: React.FC<Props> = ({ isOpen, onClose, initialData, presetClient }) => {
  const { addPlant, updatePlant } = useData();
  
  const [formData, setFormData] = useState<Partial<Plant>>({
    client: presetClient || '', name: '', stringCount: 0, trackerCount: 0,
    assets: [], subPlants: []
  });
  
  const [subPlantQty, setSubPlantQty] = useState(0);
  const [assignments, setAssignments] = useState({ 
      coordinatorId: '', supervisorIds: [] as string[], technicianIds: [] as string[], assistantIds: [] as string[] 
  });
  const [newAsset, setNewAsset] = useState('');
  
  const inputClass = "w-full border border-gray-300 p-2 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500";

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
              const autoName = `${baseName} ${i + 1}`;
              
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

  const toggleAll = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (initialData?.id) await updatePlant({ ...initialData, ...formData } as Plant, assignments);
        else await addPlant(formData as Plant, assignments);
        onClose();
    } catch (e) { alert("Erro ao salvar usina."); }
  };

  const customAssets = (formData.assets || []).filter(a => !STANDARD_ASSETS.includes(a));
  const isAllSelected = STANDARD_ASSETS.every(a => (formData.assets || []).includes(a));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? "Editar Usina" : "Nova Usina"}>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1 text-gray-800">
            <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Nome da Usina</label>
                <input className={inputClass} placeholder="Ex: Bom Jesus" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-600 uppercase mb-1 block">Cliente</label>
                <input className={inputClass} placeholder="Cliente" value={formData.client} onChange={e => setFormData({...formData, client: e.target.value})} required />
            </div>

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-700">Subusinas (Automático)</h4>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-500">Qtd:</label>
                        <input type="number" min="0" max="50" className="border p-1 w-16 text-center rounded bg-white text-black font-bold" value={subPlantQty} onChange={(e) => setSubPlantQty(parseInt(e.target.value) || 0)} />
                    </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {formData.subPlants?.map((sp, i) => (
                        <div key={i} className="bg-gray-100 p-2 rounded border border-gray-300">
                            <p className="text-xs font-bold text-blue-600 mb-1">{sp.name}</p>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div><label className="text-[9px] text-gray-500">Inversores</label><input type="number" value={sp.inverterCount} onChange={e => updateSub(i, 'inverterCount', Number(e.target.value))} className={inputClass} /></div>
                                <div><label className="text-[9px] text-gray-500">Trackers/Inv</label><input type="number" value={sp.trackersPerInverter} onChange={e => updateSub(i, 'trackersPerInverter', Number(e.target.value))} className={inputClass} /></div>
                                <div><label className="text-[9px] text-gray-500">Strings/Inv</label><input type="number" value={sp.stringsPerInverter} onChange={e => updateSub(i, 'stringsPerInverter', Number(e.target.value))} className={inputClass} /></div>
                            </div>
                        </div>
                    ))}
                    {subPlantQty === 0 && <p className="text-xs text-gray-400 text-center">Defina a quantidade para gerar subusinas.</p>}
                </div>
            </div>

            <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="font-bold text-gray-700">Ativos Padrão</h4>
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-blue-600 font-bold hover:text-blue-800">
                        <input type="checkbox" checked={isAllSelected} onChange={toggleAll} className="w-4 h-4 rounded text-blue-600" />
                        Selecionar Todos
                    </label>
                </div>
                
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-gray-50 p-2 rounded border border-gray-200">
                    {STANDARD_ASSETS.map(asset => (
                        <label key={asset} className="flex items-center gap-2 cursor-pointer hover:bg-gray-200 p-1 rounded">
                            <input 
                                type="checkbox" 
                                checked={(formData.assets || []).includes(asset)} 
                                onChange={() => toggleAsset(asset)}
                                className="w-4 h-4 text-blue-600 rounded"
                            />
                            <span className="text-sm text-gray-700">{asset}</span>
                        </label>
                    ))}
                </div>

                <div className="mt-4">
                    <h4 className="font-bold text-gray-700 mb-2 text-sm">Ativos Personalizados</h4>
                    <div className="flex gap-2 mb-2">
                        <input className={inputClass} placeholder="Adicionar Ativo Extra (ex: Jardinagem)" value={newAsset} onChange={e => setNewAsset(e.target.value)} />
                        <button type="button" onClick={addCustomAsset} className="bg-green-600 text-white px-3 rounded font-bold">+</button>
                    </div>
                    {customAssets.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {customAssets.map(a => (
                                <span key={a} className="bg-yellow-100 border border-yellow-300 px-2 py-1 rounded text-sm text-yellow-800 flex gap-1 items-center shadow-sm">
                                    {a}
                                    <button type="button" onClick={() => removeAsset(a)} className="text-red-500 font-bold ml-1 hover:text-red-700">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-gray-800 font-medium">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-bold shadow">Salvar</button>
            </div>
        </form>
    </Modal>
  );
};
export default PlantForm;