// File: components/modals/ManagementModal.tsx
// Este componente é um modal genérico de gerenciamento (usuários e usinas).
// Para usinas, ele delega a listagem ao PlantList e abre o PlantForm com ou sem presetClient.
// Para usuários, mantém a lista/edição como já existente.

import React, { useRef, useEffect } from 'react';
import { canViewUser, canEditUser, canViewPlant, canEditPlant } from '../utils/rbac';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { User, Plant, Role } from '../../types';
import UserForm from './UserForm';
import PlantForm from './PlantForm';
import Portal from '../Portal';
import PlantList from '../PlantList'; // Lista hierárquica: Cliente → Usinas (com botões)

const ROLE_SINGULAR: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.COORDINATOR]: 'Coordenador',
  [Role.SUPERVISOR]: 'Supervisor',
  [Role.OPERATOR]: 'Operador',
  [Role.TECHNICIAN]: 'Técnico',
  [Role.ASSISTANT]: 'Auxiliar',
};


interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: {
    type: 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM';
    data?: {
      roles?: Role[];       // Para MANAGE_USERS: filtra por função
      title?: string;       // Para MANAGE_USERS: título do grupo (ex.: "Supervisores")
      user?: User;
      role?: Role;
      plant?: Plant;
      parentConfig?: any;   // Usado para "voltar" à tela anterior ao fechar um form
      presetClient?: string;// NOVO: nome do cliente quando criação parte do PlantList
    };
  };
  setModalConfig: (config: any) => void;
}

const ManagementModal: React.FC<ManagementModalProps> = ({ isOpen, onClose, config, setModalConfig }) => {
  const { users } = useData();                               // sem currentUser aqui
  const { user: currentUser } = useAuth();                   // <— PEGUE AQUI
  const actor = (currentUser ?? {                            // <— Fallback seguro
    id: 'anon', name: '—', username: 'anon',
    role: Role.OPERATOR, plantIds: []
  } as unknown as User);

  const isManagingUsers = config.type === 'MANAGE_USERS';

  // dentro do componente ManagementModal, após calcular isManagingUsers
  const getSingular = () => {
    const r = config.data?.roles?.[0];
    return r ? ROLE_SINGULAR[r] : 'Usuário';
  };


  // --- título estável do modal ---
  const title =
    config.type === 'USER_FORM'
      ? (config.data?.user ? `Editar Usuário: ${config.data.user.name}` : 'Novo Usuário')
      : config.type === 'PLANT_FORM'
        ? (config.data?.plant ? `Editar Usina: ${config.data.plant.name}` : 'Nova Usina')
        : isManagingUsers
          ? `Gerenciar ${config.data?.title}`
          : 'Gerenciar Usinas';

  const stableTitleRef = useRef(title);
  useEffect(() => {
    stableTitleRef.current = title;
    // Log leve útil no dev
    // console.log(`🪶 [ManagementModal] Tela mudou → ${config.type}`);
  }, [config.type, title]);

  // --- dados (apenas para MANAGE_USERS; plantas são renderizadas pelo PlantList) ---
  const items = isManagingUsers
    ? users.filter(u => canViewUser(actor, u))
    : [];

  // --- ações padrão ---
  const handleAddItem = () => {
    if (isManagingUsers) {
      // Criação de usuário com função pré-selecionada (se houver)
      setModalConfig({
        type: 'USER_FORM',
        data: { role: config.data?.roles?.[0], parentConfig: config }
      });
    } else {
      // Criação de usina genérica (sem presetClient)
      setModalConfig({
        type: 'PLANT_FORM',
        data: { parentConfig: config }
      });
    }
  };

  const handleEditItem = (item: User | Plant) => {
    if (isManagingUsers) {
      setModalConfig({
        type: 'USER_FORM',
        data: { user: item as User, parentConfig: config }
      });
    } else {
      setModalConfig({
        type: 'PLANT_FORM',
        data: { plant: item as Plant, parentConfig: config }
      });
    }
  };

  // --- lista de usuários (mantida) ---
  const renderUserRow = (user: User) => (
    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <div>
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <button
        onClick={() => handleEditItem(user)}
        className="btn-secondary text-sm"
        disabled={!canEditUser(actor, user)}                  // <— use actor aqui
      >
        Editar
      </button>
    </div>
  );

  // --- componente de formulário ativo (UserForm / PlantForm) ---
  const ActiveForm = () => {
    if (config.type === 'USER_FORM') {
      return (
        <Portal key={`user-${config.data?.user?.id ?? 'new'}`}>
          <UserForm
            isOpen
            onClose={() => setModalConfig(config.data?.parentConfig)}
            initialData={config.data?.user}
            role={config.data?.role}
          />
        </Portal>
      );
    }
    if (config.type === 'PLANT_FORM') {
      return (
        <Portal key={`plant-${config.data?.plant?.id ?? 'new'}`}>
          <PlantForm
            isOpen
            onClose={() => setModalConfig(config.data?.parentConfig)}
            initialData={config.data?.plant}
            presetClient={config.data?.presetClient} // Passa o cliente pré-selecionado, se houver
          />
        </Portal>
      );
    }
    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        (config.type === 'MANAGE_USERS' || config.type === 'MANAGE_PLANTS') && (
          <button onClick={handleAddItem} className="btn-primary">
            {isManagingUsers ? `Novo ${getSingular()}` : 'Nova Usina'}
          </button>
        )
      }
    >
      <>
        {/* Lista hierárquica de usinas por cliente */}
        {config.type === 'MANAGE_PLANTS' && (
          <div className="space-y-4">
            <PlantList
              onEdit={(plant) => handleEditItem(plant)}
              onCreateForClient={(clientName) =>
                setModalConfig({
                  type: 'PLANT_FORM',
                  data: { parentConfig: config, presetClient: clientName } // Aqui nasce o prefill
                })
              }
            />
          </div>
        )}

        {/* Lista de usuários (mantida) */}
        {config.type === 'MANAGE_USERS' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {items.length > 0
              ? items.map(item => renderUserRow(item as User))
              : <p className="text-center text-gray-500 p-4">Nenhum item encontrado.</p>}
          </div>
        )}

        {/* O formulário ativo (UserForm/PlantForm) é montado via Portal, sem derrubar a lista */}
        <ActiveForm />
      </>
    </Modal>
  );
};

export default React.memo(ManagementModal);