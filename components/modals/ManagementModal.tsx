// File: components/modals/ManagementModal.tsx
// Este componente é um modal genérico de gerenciamento (usuários e usinas).
// Para usinas, ele delega a listagem ao PlantList e abre o PlantForm com ou sem presetClient.
// Para usuários, mantém a lista/edição como já existente.

import React, { useRef, useEffect } from 'react';
import { canViewUser, canEditUser } from '../utils/rbac';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { User, Plant, Role } from '../../types';
import UserForm from './UserForm';
import PlantForm from './PlantForm';
import Portal from '../Portal';
import PlantList from '../PlantList'; 

// ============ TIPO EXPORTADO ============
export type ManagementModalConfig = {
  type: 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM';
  data?: {
    roles?: Role[];
    title?: string;
    user?: User;
    role?: Role;
    plant?: Plant;
    parentConfig?: any;
    presetClient?: string;
  };
};

// ============ INTERFACE SIMPLIFICADA ============
interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ManagementModalConfig;
  setModalConfig: (config: ManagementModalConfig | null) => void;
}

const ROLE_SINGULAR: Partial<Record<Role, string>> = {
  [Role.ADMIN]: 'Admin',
  [Role.COORDINATOR]: 'Coordenador',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.OPERATOR]: 'Operador',
  [Role.TECHNICIAN]: 'Técnico',
  [Role.ASSISTANT]: 'Auxiliar',
  [Role.CLIENT]: 'Cliente', 
};

const ManagementModal: React.FC<ManagementModalProps> = ({ isOpen, onClose, config, setModalConfig }) => {
  const { users, plants, deleteUser } = useData();
  const { user: currentUser } = useAuth();

  // --- ATOR (usuário logado) ---
  const actor = (currentUser ?? {
    id: 'anon', name: '—', username: 'anon',
    role: Role.OPERATOR, plantIds: []
  } as unknown as User);

  const handleDeleteUser = async (user: User) => {
    if (actor.role !== Role.ADMIN) {
      alert('Apenas admins podem deletar');
      return;
    }
    
    if (!window.confirm(`Deletar ${user.name}?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      await deleteUser(user.id);
    } catch (error) {
      console.error('❌ Erro ao deletar:', error);
      alert('❌ Erro ao deletar usuário');
    }
  };

  // --- CONTEXTO RBAC ---
  const ctx = { me: actor, plants };

  // --- PERMISSÕES ---
  const canCreatePlant =
    actor.role === Role.ADMIN ||
    actor.role === Role.OPERATOR ||
    actor.role === Role.COORDINATOR ||
    actor.role === Role.SUPERVISOR;

  // --- ESTADO DO MODAL ---
  const isManagingUsers = config.type === 'MANAGE_USERS';

  const getSingular = () => {
    const r = config.data?.roles?.[0];
    return r ? (ROLE_SINGULAR[r] || 'Usuário') : 'Usuário';
  };

  const title =
    config.type === 'USER_FORM'
      ? (config.data?.user ? `Editar Usuário: ${config.data.user.name}` : `Novo ${getSingular()}`)
      : config.type === 'PLANT_FORM'
        ? (config.data?.plant ? `Editar Usina: ${config.data.plant.name}` : 'Nova Usina')
        : isManagingUsers
          ? `Gerenciar ${config.data?.title}`
          : 'Gerenciar Usinas';

  const stableTitleRef = useRef(title);
  useEffect(() => { stableTitleRef.current = title; }, [config.type, title]);


  // dados (MANAGE_USERS)
  // --- DADOS FILTRADOS ---
  const items = isManagingUsers
    ? users.filter(u => {
        const canView = canViewUser(ctx, u, plants);
        const matchesRole = !config.data?.roles || config.data.roles.length === 0 || config.data.roles.includes(u.role as Role);
        return canView && matchesRole;
      })
    : [];

  const canCreateUserRole = (role?: Role) =>
    !!role && canEditUser(ctx, { id: 'tmp', name: '', username: 'tmp', phone: '', role } as User, ctx.plants);

  const handleAddItem = () => {
    if (isManagingUsers) {
      setModalConfig({ type: 'USER_FORM', data: { role: config.data?.roles?.[0], parentConfig: config } });
    } else {
      if (!canCreatePlant) return;
      setModalConfig({ type: 'PLANT_FORM', data: { parentConfig: config } });
    }
  };

  const handleEditItem = (item: User | Plant) => {
    if (isManagingUsers) {
      setModalConfig({ type: 'USER_FORM', data: { user: item as User, parentConfig: config } });
    } else {
      setModalConfig({ type: 'PLANT_FORM', data: { plant: item as Plant, parentConfig: config } });
    }
  };

  const renderUserRow = (user: User) => (
    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <div>
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => handleEditItem(user)}
          className="btn-secondary text-sm"
          disabled={!canEditUser(ctx, user, ctx.plants)}
        >
          Editar
        </button>
        
        {actor.role === Role.ADMIN && (
          <button
            onClick={() => handleDeleteUser(user)}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
            title="Deletar usuário"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        (config.type === 'MANAGE_USERS' || config.type === 'MANAGE_PLANTS') && (
          <button
            onClick={handleAddItem}
            className="btn-primary"
            disabled={isManagingUsers ? !canCreateUserRole(config.data?.roles?.[0]) : !canCreatePlant}
          >
            {isManagingUsers ? `Novo ${getSingular()}` : 'Nova Usina'}
          </button>
        )
      }
    >
      <>
        {config.type === 'MANAGE_PLANTS' && (
          <div className="space-y-4">
            <PlantList
              onEdit={(plant) => handleEditItem(plant)}
              onCreateForClient={(clientName) => {
                if (!canCreatePlant) return;
                setModalConfig({ type: 'PLANT_FORM', data: { parentConfig: config, presetClient: clientName } });
              }}
            />
          </div>
        )}

        {config.type === 'MANAGE_USERS' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.length > 0 ? items.map(item => renderUserRow(item as User)) : (
              <p className="text-center text-gray-500 p-4">Nenhum item encontrado.</p>
            )}
          </div>
        )}

        <Portal>{/* Forms via Portal ficam aqui */}
          {config.type === 'USER_FORM' && (
            <UserForm
              isOpen
              onClose={() => setModalConfig(config.data?.parentConfig)}
              initialData={config.data?.user}
              role={config.data?.role}
            />
          )}
          {config.type === 'PLANT_FORM' && (
            <PlantForm
              isOpen
              onClose={() => setModalConfig(config.data?.parentConfig)}
              initialData={config.data?.plant}
              presetClient={config.data?.presetClient}
            />
          )}
        </Portal>
      </>
    </Modal>
  );
};

export default React.memo(ManagementModal);