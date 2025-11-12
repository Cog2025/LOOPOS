// File: components/modals/PlantForm.tsx
// Este componente renderiza um formulário modal para criar ou editar usinas.

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plant, Role } from '../../types';
import Modal from './Modal';
import { DEFAULT_PLANT_ASSETS } from '../../constants';

// Componentes auxiliares movidos para o escopo do módulo para evitar remounts e perda de foco.
const FormField: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({label, children, className}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const UserAssignmentField: React.FC<{
  title: string,
  users: Array<{ id: string; name: string }>,
  selected: string[],
  onChange: (id: string) => void
}> = ({ title, users, selected, onChange }) => (
  <FormField label={title}>
    <div className="grid grid-cols-2 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">
      {users.map(user => (
        <label key={user.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={selected.includes(user.id)}
            onChange={() => onChange(user.id)}
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
  initialData?: Plant; // Dados da usina a ser editada. Se ausente, é um formulário de criação.
}

// Tipo para o estado interno do formulário de usina
type PlantFormData = {
  client: string;
  name: string;
  subPlants: { id: number; inverterCount: number }[];
  stringCount: number;
  trackerCount: number;
  assets: string[];
};

const PlantForm: React.FC<PlantFormProps> = ({ isOpen, onClose, initialData }) => {
  // Acessa os dados e funções do DataContext.
  const { users, addPlant, updatePlant } = useData();

  // Filtra usuários por função
  const allTechnicians = users.filter(u => u.role === Role.TECHNICIAN);
  const allSupervisors = users.filter(u => u.role === Role.SUPERVISOR);

  const isEditing = !!initialData;

  // ADICIONADO: título estável para esta abertura do modal
  const stableTitleRef = React.useRef(
    isEditing ? `Editar Usina ${initialData?.name ?? ''}` : 'Nova Usina'
  );

  // Função para obter estado inicial
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
    return {
      client: '',
      name: '',
      subPlants: [{ id: 1, inverterCount: 0 }],
      stringCount: 0,
      trackerCount: 0,
      assets: DEFAULT_PLANT_ASSETS,
    };
  };

  // Estado principal do formulário
  const [formData, setFormData] = useState<PlantFormData>(getInitialState());

  // Estados separados para gerenciar as associações de usuários (apenas no modo de edição).
  const [assignedTechnicians, setAssignedTechnicians] = useState<string[]>([]);
  const [assignedSupervisors, setAssignedSupervisors] = useState<string[]>([]);

  // ADICIONADO: reset do formulário sempre que o modal abre (deps reduzidas para evitar resets em digitação)
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());

      if (initialData) {
        // Se for edição, preenche usuários associados
        setAssignedTechnicians(
          allTechnicians.filter(u => u.plantIds?.includes(initialData.id)).map(u => u.id)
        );
        setAssignedSupervisors(
          allSupervisors.filter(u => u.plantIds?.includes(initialData.id)).map(u => u.id)
        );
      } else {
        setAssignedTechnicians([]);
        setAssignedSupervisors([]);
      }
    }
    // Importante: não incluir `users` nas dependências para não provocar remounts e perda de foco
    // enquanto o modal está aberto sem necessidade.
  }, [isOpen, initialData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Manipuladores de eventos para atualizar o estado do formulário.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubPlantChange = (index: number, value: number) => {
    const newSubPlants = [...formData.subPlants];
    newSubPlants[index].inverterCount = value;
    setFormData(prev => ({ ...prev, subPlants: newSubPlants }));
  };

  const addSubPlant = () => {
    setFormData(prev => ({
      ...prev,
      subPlants: [...prev.subPlants, { id: prev.subPlants.length + 1, inverterCount: 0 }]
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

  const handleUserAssignmentChange = (userId: string, type: 'technician' | 'supervisor') => {
    const setter = type === 'technician' ? setAssignedTechnicians : setAssignedSupervisors;
    setter(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      // No modo de edição, chama `updatePlant` passando os IDs dos usuários associados para sincronização.
      updatePlant({ ...initialData, ...formData }, assignedTechnicians, assignedSupervisors);
    } else {
      // No modo de criação, apenas adiciona a nova usina.
      addPlant(formData);
    }
    onClose();
  };

  // Manipulador para o checkbox "Selecionar Todos" dos ativos.
  const handleSelectAllAssets = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      assets: e.target.checked ? DEFAULT_PLANT_ASSETS : []
    }));
  };
  const allAssetsSelected = formData.assets.length === DEFAULT_PLANT_ASSETS.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
          {/* Removido onClick duplicado; manter apenas type="submit" + form para evitar interferir no foco */}
          <button type="submit" form="plant-form" className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Salvar</button>
        </>
      }
    >
      <form id="plant-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Cliente">
          <input
            type="text"
            name="client"
            value={formData.client}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 caret-blue-600"
          />
        </FormField>

        <FormField label="Nome da Usina">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 caret-blue-600"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Qtd. de Strings">
            <input
              type="number"
              name="stringCount"
              value={formData.stringCount}
              onChange={handleChange}
              min={0}
              className="w-full input text-gray-900 dark:text-gray-100 caret-blue-600"
            />
          </FormField>
          <FormField label="Qtd. de Trackers">
            <input
              type="number"
              name="trackerCount"
              value={formData.trackerCount}
              onChange={handleChange}
              min={0}
              className="w-full input text-gray-900 dark:text-gray-100 caret-blue-600"
            />
          </FormField>
        </div>

        <FormField label="Subusinas">
          <div className="space-y-2">
            {formData.subPlants.map((sub, index) => (
              <div key={sub.id} className="flex items-center space-x-2">
                <span className="font-semibold">Subusina {sub.id}:</span>
                <input
                  type="number"
                  min={0}
                  value={sub.inverterCount}
                  onChange={(e) => handleSubPlantChange(index, parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 caret-blue-600"
                  placeholder="Qtd. Inversores"
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={addSubPlant} className="mt-2 text-sm text-blue-600 hover:underline">+ Adicionar Subusina</button>
        </FormField>

        {isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-gray-700">
            <UserAssignmentField
              title="Técnicos Atribuídos"
              users={allTechnicians}
              selected={assignedTechnicians}
              onChange={(id) => handleUserAssignmentChange(id, 'technician')}
            />
            <UserAssignmentField
              title="Supervisores Atribuídos"
              users={allSupervisors}
              selected={assignedSupervisors}
              onChange={(id) => handleUserAssignmentChange(id, 'supervisor')}
            />
          </div>
        )}

        <FormField label="Ativos Padrão">
          <div className="flex items-center justify-end">
            <label className="flex items-center space-x-2 text-sm cursor-pointer">
              <input type="checkbox" checked={allAssetsSelected} onChange={handleSelectAllAssets} className="rounded"/>
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