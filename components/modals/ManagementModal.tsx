// File: components/modals/ManagementModal.tsx
// Este componente é um modal genérico de gerenciamento (usuários e usinas).
// Para usinas, ele delega a listagem ao PlantList e abre o PlantForm com ou sem presetClient.
// Para usuários, mantém a lista/edição como já existente.

import React, { useRef, useEffect } from 'react';
import { canViewUser, canEditUser, canEditPlant } from '../utils/rbac';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { User, Plant, Role } from '../../types';
import UserForm from './UserForm';
import PlantForm from './PlantForm';
import Portal from '../Portal';
import PlantList from '../PlantList'; // Lista hierárquica: Cliente → Usinas (com botões)

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

const ROLE_SINGULAR: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.COORDINATOR]: 'Coordenador',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.OPERATOR]: 'Operador',
  [Role.TECHNICIAN]: 'Técnico',
  [Role.ASSISTANT]: 'Auxiliar',
};

const ManagementModal: React.FC<ManagementModalProps> = ({ isOpen, onClose, config, setModalConfig }) => {
  const { users, plants } = useData();
  const { user: currentUser } = useAuth();

  // --- ATOR (usuário logado) ---
  const actor = (currentUser ?? {
    id: 'anon', name: '—', username: 'anon',
    role: Role.OPERATOR, plantIds: []
  } as unknown as User);

  // --- CONTEXTO RBAC ---
  // Contém informações do usuário e plantas para decisões de acesso
  const ctx = { me: actor, plants };

  // --- PERMISSÕES ---
  // Quem pode criar/editar usinas
  const canCreatePlant =
    actor.role === Role.ADMIN ||
    actor.role === Role.OPERATOR ||
    actor.role === Role.COORDINATOR ||
    actor.role === Role.SUPERVISOR;

  // --- ESTADO DO MODAL ---
  // Determina se estamos gerenciando usuários ou usinas
  const isManagingUsers = config.type === 'MANAGE_USERS';

  const getSingular = () => {
    const r = config.data?.roles?.[0];
    return r ? ROLE_SINGULAR[r] : 'Usuário';
  };

  const title =
    config.type === 'USER_FORM'
      ? (config.data?.user ? `Editar Usuário: ${config.data.user.name}` : 'Novo Usuário')
      : config.type === 'PLANT_FORM'
        ? (config.data?.plant ? `Editar Usina: ${config.data.plant.name}` : 'Nova Usina')
        : isManagingUsers
          ? `Gerenciar ${config.data?.title}`
          : 'Gerenciar Usinas';

  const stableTitleRef = useRef(title);
  useEffect(() => { stableTitleRef.current = title; }, [config.type, title]);

  // dados (MANAGE_USERS)
  // --- DADOS FILTRADOS ---
  // Filtra usuários com base no RBAC do ator E pelo papel selecionado
  const items = isManagingUsers
    ? users.filter(u => {
        // Verifica visibilidade por RBAC
        if (!canViewUser(ctx, u, plants)) return false;
        
        // Verifica se é do papel selecionado (se houver filtro)
        if (config.data?.roles && config.data.roles.length > 0) {
          return config.data.roles.includes(u.role as Role);
        }
        
        return true;
      })
    : [];


  // helper para habilitar "Novo Usuário" com base no papel alvo
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
      if (!canEditPlant(ctx, item as Plant)) return;
      setModalConfig({ type: 'PLANT_FORM', data: { plant: item as Plant, parentConfig: config } });
    }
  };

  const renderUserRow = (user: User) => (
    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <div>
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <button
        onClick={() => handleEditItem(user)}
        className="btn-secondary text-sm"
        disabled={!canEditUser(ctx, user, ctx.plants)}
      >
        Editar
      </button>
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