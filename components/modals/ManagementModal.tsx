// File: components/modals/ManagementModal.tsx
// Este componente é um modal genérico de gerenciamento (usuários e usinas).
// Para usinas, ele delega a listagem ao PlantList e abre o PlantForm com ou sem presetClient.
// Para usuários, mantém a lista/edição como já existente.

import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Search, Factory, Users } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Role } from '../../types';

export interface ManagementModalConfig {
  type: string; 
  data: any; 
}

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ManagementModalConfig; 
  onOpenUserForm: (user?: any, role?: Role) => void; 
  onOpenPlantForm: (plant?: any) => void;
}

const ManagementModal: React.FC<ManagementModalProps> = ({
  isOpen,
  onClose,
  config,
  onOpenUserForm,
  onOpenPlantForm
}) => {
  const { users, plants, deleteUser, deletePlant } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const isPlants = config.type === 'MANAGE_PLANTS';
  const roleFilter = config.data?.roleFilter;
  const roleLabel = config.data?.label || 'Usuários';

  // ✅ CORREÇÃO GRAMATICAL: Mapeamento Plural -> Singular
  const getSingularLabel = (role?: Role): string => {
      if (!role) return "Usuário";
      const map: Record<string, string> = {
          [Role.ADMIN]: "Administrador",
          [Role.OPERATOR]: "Operador",
          [Role.COORDINATOR]: "Coordenador",
          [Role.SUPERVISOR]: "Supervisor",
          [Role.TECHNICIAN]: "Técnico",
          [Role.ASSISTANT]: "Auxiliar",
          [Role.CLIENT]: "Cliente"
      };
      return map[role] || "Usuário";
  };

  // Títulos
  const modalTitle = isPlants ? 'Gerenciar Usinas' : `Gerenciar ${roleLabel}`;
  const buttonLabel = isPlants ? 'Nova Usina' : `Novo ${getSingularLabel(roleFilter)}`;

  const filteredList = isPlants
    ? plants.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users.filter(u => {
        const matchesSearch = 
          u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.username.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesRole = roleFilter ? u.role === roleFilter : true;
        return matchesSearch && matchesRole;
      });

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
      if (isPlants) {
        await deletePlant(id);
      } else {
        await deleteUser(id);
      }
    }
  };

  const handleNewItem = () => {
    if (isPlants) {
        onOpenPlantForm();
    } else {
        // ✅ PASSA O ROLE FILTER PARA PRÉ-SELECIONAR
        onOpenUserForm(undefined, roleFilter); 
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              {isPlants ? <Factory className="text-blue-600" /> : <Users className="text-blue-600" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{modalTitle}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isPlants ? 'Gerencie as usinas cadastradas no sistema' : `Gerencie os usuários do tipo ${roleLabel}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={isPlants ? "Buscar usina..." : "Buscar usuário..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <button
            onClick={handleNewItem}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            <Plus size={20} />
            {buttonLabel}
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            {filteredList.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">Nenhum item encontrado.</div>
            ) : (
              filteredList.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-blue-600 shadow-sm">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        {isPlants ? (
                          <>
                            <span>{item.client}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span>{item.assets?.length || 0} ativos</span>
                          </>
                        ) : (
                          <>
                            <span>{item.role}</span>
                            {item.username && <><span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" /><span>@{item.username}</span></>}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => isPlants ? onOpenPlantForm(item) : onOpenUserForm(item, item.role)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Editar"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Excluir"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagementModal;