// File: components/modals/PlantForm.tsx
// Formulário modal para criar/editar usinas.
// Regras:
// - Criação: o usuário informa N subusinas, o formulário gera Subusina 1..N (inverterCount=0).
// - Edição: quantidade de subusinas é fixa; apenas atualiza campos existentes.
// - Novo: se vier com presetClient, o campo "Cliente" é pré-preenchido.
// - Atribuições: permite escolher Coordenador (único), Supervisores/Técnicos/Auxiliares (múltiplos).


import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plant, Role } from '../../types';
import Modal from './Modal';
import { DEFAULT_PLANT_ASSETS } from '../../constants';

const FormField: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({label, children, className}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{label}</label>
    {children}
  </div>
);

const MultiAssignField: React.FC<{
  title: string;
  users: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}> = ({ title, users, selected, onToggle }) => (
  <FormField label={title}>
    <div className="grid grid-cols-2 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto bg-white dark:bg-gray-800">
      {users.map(user => (
        <label key={user.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected.includes(user.id)}
            onChange={() => onToggle(user.id)}
            className="rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-800 dark:text-gray-200">{user.name}</span>
        </label>
      ))}
    </div>
  </FormField>
);

interface PlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;
  presetClient?: string;
}

type PlantFormData = {
  client: string;
  name: string;
  subPlants: { id: number; inverterCount: number }[];
  stringCount: number;
  trackerCount: number;
  assets: string[];
};

const PlantForm: React.FC<PlantFormProps> = ({ isOpen, onClose, initialData, presetClient }) => {
  const { users, addPlant, updatePlant } = useData();

  const allCoordinators = users.filter(u => u.role === Role.COORDINATOR);
  const allSupervisors = users.filter(u => u.role === Role.SUPERVISOR);
  const allTechnicians = users.filter(u => u.role === Role.TECHNICIAN);
  const allAssistants  = users.filter(u => u.role === Role.ASSISTANT);

  const isEditing = !!initialData;
  const stableTitleRef = useRef(isEditing ? `Editar Usina ${initialData?.name ?? ''}` : 'Nova Usina');

  const [qtdSubunidades, setQtdSubunidades] = useState<number>(1);

  const [formData, setFormData] = useState<PlantFormData>({
    client: '', name: '', subPlants: [], stringCount: 0, trackerCount: 0, assets: DEFAULT_PLANT_ASSETS
  });

  const [assignedCoordinator, setAssignedCoordinator] = useState<string | null>(null);
  const [assignedSupervisors, setAssignedSupervisors] = useState<string[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>([]);
  const [assignedAssistants, setAssignedAssistants] = useState<string[]>([]);

  // ✅ Inicialização única e direta
  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            console.log("📥 [PlantForm] Carregando dados para:", initialData.name);
            
            setQtdSubunidades(initialData.subPlants?.length || 1);
            setFormData({
                client: initialData.client,
                name: initialData.name,
                subPlants: initialData.subPlants ? [...initialData.subPlants] : [],
                stringCount: initialData.stringCount,
                trackerCount: initialData.trackerCount,
                assets: initialData.assets ? [...initialData.assets] : [],
            });

            // Lógica de Cálculo Local (Sem Fetch)
            const pid = initialData.id;
            
            const coords = users.filter(u => u.role === Role.COORDINATOR && u.plantIds?.includes(pid)).map(u => u.id);
            const sups = users.filter(u => u.role === Role.SUPERVISOR && u.plantIds?.includes(pid)).map(u => u.id);
            const techs = users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(pid)).map(u => u.id);
            const assts = users.filter(u => u.role === Role.ASSISTANT && u.plantIds?.includes(pid)).map(u => u.id);

            // Força atualização do estado
            setAssignedCoordinator(coords[0] || null);
            setAssignedSupervisors(sups);
            setAssignedTechnicians(techs);
            setAssignedAssistants(assts);

            console.log("✅ [PlantForm] Estado inicial definido:", { techs, sups });

        } else {
            // Nova Usina - Reset Total
            setFormData({
                client: presetClient ?? '',
                name: '',
                subPlants: [{ id: 1, inverterCount: 0 }],
                stringCount: 0,
                trackerCount: 0,
                assets: DEFAULT_PLANT_ASSETS,
            });
            setQtdSubunidades(1);
            setAssignedCoordinator(null);
            setAssignedSupervisors([]);
            setAssignedTechnicians([]);
            setAssignedAssistants([]);
        }
    }
  }, [isOpen, initialData?.id]); // ⚠️ Dependência APENAS no ID para evitar reload se user mudar

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value) || 0 : value }));
  };

  const handleAssetToggle = (assetName: string) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.includes(assetName)
        ? prev.assets.filter(a => a !== assetName)
        : [...prev.assets, assetName]
    }));
  };

  const toggleInArray = (id: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => {
        const exists = prev.includes(id);
        const newValue = exists ? prev.filter(x => x !== id) : [...prev, id];
        console.log(`🔄 Toggle ID ${id}: ${exists ? 'Removendo' : 'Adicionando'} -> Novo estado:`, newValue);
        return newValue;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Snapshot do estado no momento do envio
    const assignments = {
      coordinatorId: assignedCoordinator || null,
      supervisorIds: [...assignedSupervisors],
      technicianIds: [...assignedTechnicians],
      assistantIds: [...assignedAssistants],
    };

    console.log("📤 [PlantForm] Enviando Save:", assignments);

    const basePayload = {
      client: formData.client,
      name: formData.name,
      stringCount: formData.stringCount || 0,
      trackerCount: formData.trackerCount || 0,
      subPlants: formData.subPlants || [],
      assets: formData.assets || [],
    };

    const payload = isEditing && initialData 
      ? { ...basePayload, id: initialData.id }
      : basePayload;

    try {
      if (isEditing && initialData) {
        await updatePlant(payload as Plant, assignments);
      } else {
        await addPlant(basePayload, assignments);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Falha ao salvar usina');
    }
  };

  const inputBase = "w-full px-3 py-2 rounded-md shadow-sm bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200">Cancelar</button>
          <button 
            type="submit" 
            form="plant-form" 
            className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Salvar
          </button>
        </>
      }
    >
      <form id="plant-form" onSubmit={handleSubmit} className="space-y-4">
         <FormField label="Cliente">
          <input type="text" name="client" value={formData.client} onChange={handleChange} required className={inputBase} />
        </FormField>
        <FormField label="Nome da Usina">
          <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputBase} />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Qtd. de Strings">
                <input type="number" name="stringCount" value={formData.stringCount} onChange={handleChange} min={0} className={inputBase} />
            </FormField>
            <FormField label="Qtd. de Trackers">
                <input type="number" name="trackerCount" value={formData.trackerCount} onChange={handleChange} min={0} className={inputBase} />
            </FormField>
            <FormField label="Qtd. de Subusinas">
                <input type="number" min={1} value={qtdSubunidades} onChange={(e) => setQtdSubunidades(Math.max(1, parseInt(e.target.value) || 1))} disabled={isEditing} className={inputBase + (isEditing ? " opacity-80 cursor-not-allowed" : "")} />
            </FormField>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700 mt-4">
            <FormField label="Atribuir Coordenador">
                <select value={assignedCoordinator ?? ''} onChange={(e) => setAssignedCoordinator(e.target.value || null)} className={inputBase}>
                <option value="">— Nenhum —</option>
                {allCoordinators.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
            </FormField>

            <MultiAssignField title="Atribuir Supervisor" users={allSupervisors} selected={assignedSupervisors} onToggle={(id) => toggleInArray(id, setAssignedSupervisors)} />
            <MultiAssignField title="Atribuir Técnico" users={allTechnicians} selected={assignedTechnicians} onToggle={(id) => toggleInArray(id, setAssignedTechnicians)} />
            <MultiAssignField title="Atribuir Auxiliar" users={allAssistants} selected={assignedAssistants} onToggle={(id) => toggleInArray(id, setAssignedAssistants)} />
        </div>

        <FormField label="Ativos Padrão">
          <div className="flex items-center justify-end">
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.assets.length === DEFAULT_PLANT_ASSETS.length} onChange={(e) => setFormData(prev => ({ ...prev, assets: e.target.checked ? DEFAULT_PLANT_ASSETS : [] }))} className="rounded" />
              <span>Selecionar Todos</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-48 overflow-y-auto mt-1">
            {DEFAULT_PLANT_ASSETS.map(asset => (
              <label key={asset} className="flex items-center space-x-2 text-xs">
                <input type="checkbox" checked={formData.assets.includes(asset)} onChange={() => handleAssetToggle(asset)} className="rounded" />
                <span className="text-gray-800 dark:text-gray-200">{asset}</span>
              </label>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
};
export default React.memo(PlantForm);