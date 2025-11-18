// File: components/modals/PlantForm.tsx
// Formulário modal para criar/editar usinas.
// Regras:
// - Criação: o usuário informa N subusinas, o formulário gera Subusina 1..N (inverterCount=0).
// - Edição: quantidade de subusinas é fixa; apenas atualiza campos existentes.
// - Novo: se vier com presetClient, o campo "Cliente" é pré-preenchido.
// - Atribuições: permite escolher Coordenador (único), Supervisores/Técnicos/Auxiliares (múltiplos).

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plant, Role } from '../../types';
import Modal from './Modal';
import { DEFAULT_PLANT_ASSETS } from '../../constants';

// Campo com rótulo
const FormField: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({label, children, className}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
    {children}
  </div>
);

// Lista de seleção múltipla (checkboxes) para atribuições
const MultiAssignField: React.FC<{
  title: string;
  users: Array<{ id: string; name: string }>;
  selected: string[];
  onToggle: (id: string) => void;
}> = ({ title, users, selected, onToggle }) => (
  <FormField label={title}>
    <div className="grid grid-cols-2 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">
      {users.map(user => (
        <label key={user.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected.includes(user.id)}
            onChange={() => onToggle(user.id)}
            className="rounded"
          />
          <span>{user.name}</span>
        </label>
      ))}
    </div>
  </FormField>
);

interface PlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Plant;      // Edição quando presente
  presetClient?: string;    // Cliente pré-selecionado quando criação parte de um cliente
}

// Estado do formulário (campos da usina)
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

  // Coleções por função (Coordenador e Auxiliar são novos papéis; ver patch no types/DataContext)
  const allCoordinators = users.filter(u => u.role === Role.COORDINATOR);
  const allSupervisors = users.filter(u => u.role === Role.SUPERVISOR);
  const allTechnicians = users.filter(u => u.role === Role.TECHNICIAN);
  const allAssistants  = users.filter(u => u.role === Role.ASSISTANT);

  const isEditing = !!initialData;

  // Título estável para evitar "flicker" ao digitar
  const stableTitleRef = React.useRef(
    isEditing ? `Editar Usina ${initialData?.name ?? ''}` : 'Nova Usina'
  );

  // Quantidade de subusinas (N). Em edição é fixo, em criação gera Subusina 1..N.
  const [qtdSubunidades, setQtdSubunidades] = useState<number>(
    isEditing ? (initialData?.subPlants?.length ?? 1) : 1
  );

  // Estado inicial:
  // - Em edição: clona os campos da usina existente.
  // - Em criação: usa presetClient (se vier) para pré-preencher "Cliente".
  const getInitialState = (): PlantFormData => {
    if (initialData) {
      return {
        client: initialData.client,
        name: initialData.name,
        subPlants: [...initialData.subPlants],
        stringCount: initialData.stringCount,
        trackerCount: initialData.trackerCount,
        assets: [...initialData.assets],
      };
    }
    // CRIAÇÃO: preset do cliente e subusinas geradas 1..N
    return {
      client: presetClient ?? '', // ← ponto-chave para o prefill do cliente
      name: '',
      subPlants: Array.from({ length: Math.max(1, qtdSubunidades) }, (_, i) => ({
        id: i + 1,
        inverterCount: 0
      })),
      stringCount: 0,
      trackerCount: 0,
      assets: DEFAULT_PLANT_ASSETS,
    };
  };

  // Estado principal do form
  const [formData, setFormData] = useState<PlantFormData>(getInitialState());

  // Atribuições (sempre visíveis: criação e edição)
  const [assignedCoordinator, setAssignedCoordinator] = useState<string | null>(null);
  const [assignedSupervisors, setAssignedSupervisors] = useState<string[]>([]);
  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>([]);
  const [assignedAssistants, setAssignedAssistants] = useState<string[]>([]);

  // Reset sempre que o modal abre OU quando presetClient muda (abrir "Nova Usina" em outro cliente)
  useEffect(() => {
    if (!isOpen) return;
    setFormData(getInitialState());

    if (initialData) {
      // ✅ BUSQUE DIRETAMENTE DA API
      const fetchAssignments = async () => {
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/plants/${initialData.id}/assignments`);
          if (res.ok) {
            const a = await res.json();
            console.log('DEBUG - Atribuições carregadas:', a);
            setAssignedCoordinator(a.coordinatorId || null);
            setAssignedSupervisors(a.supervisorIds || []);
            setAssignedTechnicians(a.technicianIds || []);
            setAssignedAssistants(a.assistantIds || []);
          } else {
            // Fallback: use initialData
            setAssignedCoordinator(initialData.coordinatorId ?? null);
            setAssignedSupervisors(initialData.supervisorIds ?? []);
            setAssignedTechnicians(initialData.technicianIds ?? []);
            setAssignedAssistants(initialData.assistantIds ?? []);
          }
        } catch (error) {
          console.error('Erro ao buscar atribuições:', error);
          // Fallback
          setAssignedCoordinator(initialData.coordinatorId ?? null);
          setAssignedSupervisors(initialData.supervisorIds ?? []);
          setAssignedTechnicians(initialData.technicianIds ?? []);
          setAssignedAssistants(initialData.assistantIds ?? []);
        }
      };
      
      fetchAssignments();
    } else {
      setAssignedCoordinator(null);
      setAssignedSupervisors([]);
      setAssignedTechnicians([]);
      setAssignedAssistants([]);
    }
  }, [isOpen, initialData, presetClient]);


  // Em CRIAÇÃO, sincroniza o array subPlants quando N muda, preservando valores já digitados.
  useEffect(() => {
    if (!isEditing) {
      setFormData(prev => {
        const n = Math.max(1, qtdSubunidades);
        const next = Array.from({ length: n }, (_, i) => ({
          id: i + 1,
          inverterCount: prev.subPlants[i]?.inverterCount ?? 0
        }));
        return { ...prev, subPlants: next };
      });
    }
  }, [qtdSubunidades, isEditing]);

  // Handlers genéricos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
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
    setter(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  // Submissão:
  // - Se DataContext já suporta as novas assinaturas com assignments, passe o objeto completo.
  // - Se ainda não, adapte para as funções antigas (ex.: updatePlant(plant, techIds, supIds)).
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ CRIE O PAYLOAD COM TIPO CORRETO
    const basePayload = {
      client: formData.client,
      name: formData.name,
      stringCount: formData.stringCount || 0,
      trackerCount: formData.trackerCount || 0,
      subPlants: formData.subPlants || [],
      assets: formData.assets || [],
      coordinatorId: assignedCoordinator || "",
      supervisorIds: assignedSupervisors || [],
      technicianIds: assignedTechnicians || [],
      assistantIds: assignedAssistants || [],
    };

    // ✅ ADICIONE ID APENAS PARA EDIÇÃO
    const payload = isEditing && initialData 
      ? { ...basePayload, id: initialData.id }
      : basePayload;

    // ✅ ENVIE O PAYLOAD CORRETO
    try {
      if (isEditing && initialData) {
        updatePlant(payload as Plant);
      } else {
        addPlant(basePayload);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar usina:', error);
      alert('Falha ao salvar usina');
    }
  };

  // Utilitário de estilo
  const inputBase =
    "w-full px-3 py-2 rounded-md shadow-sm bg-gray-800 border border-gray-600 text-gray-100 placeholder-gray-400 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 rounded-md hover:bg-gray-600"
          >
            Cancelar
          </button>
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
        {/* Cliente (pré-preenchido quando presetClient vem do PlantList) */}
        <FormField label="Cliente">
          <input
            type="text"
            name="client"
            value={formData.client}
            onChange={handleChange}
            required
            className={inputBase}
            placeholder="Nome do cliente"
          />
        </FormField>

        <FormField label="Nome da Usina">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputBase}
            placeholder="Ex.: Bom Jesus"
          />
        </FormField>

        {/* Métricas e quantidade de subusinas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Qtd. de Strings">
            <input
              type="number"
              name="stringCount"
              value={formData.stringCount}
              onChange={handleChange}
              min={0}
              className={inputBase}
            />
          </FormField>

          <FormField label="Qtd. de Trackers">
            <input
              type="number"
              name="trackerCount"
              value={formData.trackerCount}
              onChange={handleChange}
              min={0}
              className={inputBase}
            />
          </FormField>

          <FormField label="Qtd. de Subusinas">
            <input
              type="number"
              min={1}
              value={qtdSubunidades}
              onChange={(e) => setQtdSubunidades(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isEditing} // Edição: quantidade fixa
              className={inputBase + (isEditing ? " opacity-80 cursor-not-allowed" : "")}
            />
            <p className="text-xs text-gray-400 mt-1">
              {isEditing
                ? "A quantidade de subusinas é fixa para esta usina."
                : "Serão geradas Subusina 1, Subusina 2, ... até a quantidade informada."}
            </p>
          </FormField>
        </div>

        {/* Atribuições (Coordenador: único; demais: múltiplos) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
          <FormField label="Atribuir Coordenador">
            <select
              value={assignedCoordinator ?? ''}
              onChange={(e) => setAssignedCoordinator(e.target.value || null)}
              className={inputBase}
            >
              <option value="">— Nenhum —</option>
              {allCoordinators.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </FormField>

          <MultiAssignField
            title="Atribuir Supervisor"
            users={allSupervisors}
            selected={assignedSupervisors}
            onToggle={(id) => toggleInArray(id, setAssignedSupervisors)}
          />
          <MultiAssignField
            title="Atribuir Técnico"
            users={allTechnicians}
            selected={assignedTechnicians}
            onToggle={(id) => toggleInArray(id, setAssignedTechnicians)}
          />
          <MultiAssignField
            title="Atribuir Auxiliar"
            users={allAssistants}
            selected={assignedAssistants}
            onToggle={(id) => toggleInArray(id, setAssignedAssistants)}
          />
        </div>

        {/* Ativos padrão (com "Selecionar Todos") */}
        <FormField label="Ativos Padrão">
          <div className="flex items-center justify-end">
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={formData.assets.length === DEFAULT_PLANT_ASSETS.length}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    assets: e.target.checked ? DEFAULT_PLANT_ASSETS : []
                  }))
                }
                className="rounded"
              />
              <span>Selecionar Todos</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-48 overflow-y-auto mt-1">
            {DEFAULT_PLANT_ASSETS.map(asset => (
              <label key={asset} className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={formData.assets.includes(asset)}
                  onChange={() => handleAssetToggle(asset)}
                  className="rounded"
                />
                <span>{asset}</span>
              </label>
            ))}
          </div>
        </FormField>
      </form>
    </Modal>
  );
};

export default React.memo(PlantForm);