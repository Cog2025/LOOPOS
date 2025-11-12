// File: components/modals/ManagementModal.tsx
// Este componente é um modal genérico de gerenciamento (usuários e usinas).
// Ele pode exibir listas para gerenciar dados ou abrir formulários específicos
// de criação/edição (UserForm e PlantForm) dentro do próprio modal.

import React, { useRef, useEffect } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { User, Plant, Role } from '../../types';
import UserForm from './UserForm';
import PlantForm from './PlantForm';
import Portal from '../Portal';

// Define as props do modal de gerenciamento
interface ManagementModalProps {
  isOpen: boolean; // Controla abertura/fechamento do modal
  onClose: () => void; // Função chamada ao fechar o modal
  config: {
    type: 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM'; // Define qual tela ou formulário exibir
    data?: { // Dados extras para formularios ou listas
      roles?: Role[]; // Filtra usuários por função
      title?: string; // Título da lista
      user?: User; // Usuário a ser editado (se for form de usuário)
      role?: Role; // Função pré-selecionada ao criar um usuário
      plant?: Plant; // Usina a ser editada (se for form de planta)
      parentConfig?: any; // Permite voltar para a configuração anterior ao fechar formulário
    };
  };
  setModalConfig: (config: any) => void; // Função para mudar a configuração atual do modal
}

const ManagementModal: React.FC<ManagementModalProps> = ({ isOpen, onClose, config, setModalConfig }) => {
  const { users, plants } = useData(); // Obtém usuários e plantas do contexto
  const isManagingUsers = config.type === 'MANAGE_USERS'; // Flag para saber se estamos gerenciando usuários

  // --- título estável do modal ---
  // Define o título baseado no tipo de tela
  const title =
    config.type === 'USER_FORM'
      ? config.data?.user ? `Editar Usuário: ${config.data.user.name}` : 'Novo Usuário'
      : config.type === 'PLANT_FORM'
        ? config.data?.plant ? `Editar Usina: ${config.data.plant.name}` : 'Nova Usina'
        : isManagingUsers
          ? `Gerenciar ${config.data?.title}` // Lista de usuários
          : 'Gerenciar Usinas'; // Lista de usinas

  // Mantém o título estável entre renders para evitar flicker
  const stableTitleRef = useRef(title);
  useEffect(() => {
    stableTitleRef.current = title;
    console.log(`🪶 [ManagementModal] Tela mudou → ${config.type}`);
  }, [config.type]);

  // --- dados da lista ---
  // Filtra os itens da lista conforme o tipo de gerenciamento
  const items = isManagingUsers
    ? users.filter(u => (config.data?.roles || []).includes(u.role))
    : plants;

  // --- ações ---
  // Função para abrir um novo formulário de criação
  const handleAddItem = () => {
    if (isManagingUsers) {
      setModalConfig({
        type: 'USER_FORM',
        data: {
          role: config.data?.roles?.[0], // Pré-seleciona a primeira função disponível
          parentConfig: config // Permite voltar para a lista depois
        }
      });
    } else {
      setModalConfig({
        type: 'PLANT_FORM',
        data: { parentConfig: config } // Volta para lista de usinas
      });
    }
  };

  // Função para abrir formulário de edição de item existente
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

  // --- renderização das linhas da lista ---
  // Linha de usuário na lista
  const renderUserRow = (user: User) => (
    <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <div>
        <p className="font-semibold">{user.name}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <button onClick={() => handleEditItem(user)} className="btn-secondary text-sm">Editar</button>
    </div>
  );

  // Linha de usina na lista
  const renderPlantRow = (plant: Plant) => (
    <div key={plant.id} className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
      <div>
        <p className="font-semibold">{plant.name}</p>
        <p className="text-sm text-gray-500">{plant.client}</p>
      </div>
      <button onClick={() => handleEditItem(plant)} className="btn-secondary text-sm">Editar</button>
    </div>
  );

  // --- chave única para cada "tela" do modal ---
  const screenKey =
    config.type === 'USER_FORM'
      ? config.data?.user?.id ?? 'new-user'
      : config.type === 'PLANT_FORM'
        ? config.data?.plant?.id ?? 'new-plant'
        : 'list';

  // --- componente de formulário ativo ---
  // Decide qual formulário renderizar (UserForm ou PlantForm)
  const ActiveForm = () => {
    if (config.type === 'USER_FORM') {
      console.log(`🧩 Renderizando UserForm (${config.data?.user ? 'editando' : 'novo'})`);
      return (
        <Portal key={`user-${config.data?.user?.id ?? 'new'}`}>
          <UserForm
            isOpen
            onClose={() => setModalConfig(config.data?.parentConfig)} // volta para lista após fechar
            initialData={config.data?.user}
            role={config.data?.role}
          />
        </Portal>
      );
    }
    if (config.type === 'PLANT_FORM') {
      console.log(`🌿 Renderizando PlantForm (${config.data?.plant ? 'editando' : 'nova'})`);
      return (
        <Portal key={`plant-${config.data?.plant?.id ?? 'new'}`}>
          <PlantForm
            isOpen
            onClose={() => setModalConfig(config.data?.parentConfig)} // volta para lista após fechar
            initialData={config.data?.plant}
          />
        </Portal>
      );
    }
    return null; // Nenhum formulário ativo
  };

  // --- render principal ---
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current} // título estável
      footer={
        // Botão "Adicionar Novo" apenas em telas de gerenciamento de listas
        (config.type === 'MANAGE_USERS' || config.type === 'MANAGE_PLANTS') && (
          <button onClick={handleAddItem} className="btn-primary">
            {isManagingUsers ? `Novo ${config.data?.title?.slice(0, -1) || 'Usuário'}` : 'Nova Usina'}
          </button>
        )
      }
    >
      {React.useMemo(() => (
        <>
          {/* Lista de itens (usuários ou usinas) */}
          {(config.type === 'MANAGE_USERS' || config.type === 'MANAGE_PLANTS') ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {items.length > 0
                ? items.map(item =>
                    isManagingUsers
                      ? renderUserRow(item as User)
                      : renderPlantRow(item as Plant)
                  )
                : <p className="text-center text-gray-500 p-4">Nenhum item encontrado.</p>}
            </div>
          ) : null}

          {/* Formulário ativo — permanece montado enquanto digita */}
          <ActiveForm />
        </>
      ), [config.type, items])}
    </Modal>
  );
};

// Evita re-render desnecessário do modal
export default React.memo(ManagementModal);