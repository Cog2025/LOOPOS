// File: components/Dashboard.tsx
// Este é o componente principal da aplicação após o login. Ele age como um orquestrador,
// juntando a barra lateral (Sidebar), o cabeçalho (Header) e o painel Kanban (Board),
// além de gerenciar a exibição de todos os modais (pop-ups).

import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ManagementModalConfig } from './modals/ManagementModal';
import { OS } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Board from './Board';
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';
import ManagementModal from './modals/ManagementModal';
import UserForm from './modals/UserForm';
import PlantForm from './modals/PlantForm';
import DownloadModal from './modals/DownloadModal';

// --- TIPOS ---
// Define a estrutura de configuração para abrir um modal.
// Inclui todos os tipos de modais da aplicação (OS, gerenciamento de usuários/usinas, downloads).
interface ModalConfig {
  type: 'OS_DETAIL' | 'OS_FORM' | 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM' | 'DOWNLOAD_FILTER';
  data?: any; // Dados a serem passados para o modal (ex: a OS a ser editada, usuário a editar, etc.).
}

// --- COMPONENTE PRINCIPAL ---
const Dashboard: React.FC = () => {
  // Acessa os dados e funções do contexto principal.
  const { osList, updateOS } = useData();

  // --- ESTADOS ---
  // Controla a visibilidade e estado da UI.
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false); // Visibilidade da sidebar em telas pequenas (drawer).
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false); // Estado de recolhimento da sidebar no desktop (collapse icon).
  const [searchTerm, setSearchTerm] = useState(''); // Termo de busca inserido no cabeçalho para filtrar OSs.
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null); // Configuração do modal atualmente aberto, ou nulo se nenhum.

  // --- FILTROS E MEMOIZAÇÃO ---
  // `useMemo` otimiza a performance filtrando as OSs apenas quando a lista ou o termo de busca mudam.
  const filteredOS = useMemo(() => {
    if (!searchTerm) return osList; // Se a busca estiver vazia, retorna todas as OSs.
    // Filtra as OSs cujo título ou ID contenham o termo de busca (ignorando maiúsculas/minúsculas).
    return osList.filter(os =>
      os.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      os.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [osList, searchTerm]);

  // --- MANIPULADORES DE MODAIS ---
  // Funções para abrir/fechar e configurar modais.
  const handleCloseModal = () => setModalConfig(null);
  const handleNewOS = () => setModalConfig({ type: 'OS_FORM' });
  const handleCardClick = (os: OS) => setModalConfig({ type: 'OS_DETAIL', data: os });
  const handleOpenDownloadFilter = () => setModalConfig({ type: 'DOWNLOAD_FILTER' });

  // --- RENDERIZAÇÃO DE MODAIS ---
  // Função que renderiza o modal correto com base na configuração atual em `modalConfig`.
  const renderModal = () => {
    if (!modalConfig) return null;

    // Um `switch` decide qual componente de modal renderizar baseado no tipo.
    switch (modalConfig.type) {
      // Detalhe de uma OS existente
      case 'OS_DETAIL':
        return (
          <OSDetailModal
            isOpen={true}
            onClose={handleCloseModal}
            os={modalConfig.data}
            setModalConfig={setModalConfig}
          />
        );

      // Formulário para criar ou editar uma OS
      case 'OS_FORM':
        return (
          <OSForm
            isOpen={true}
            onClose={handleCloseModal}
            initialData={modalConfig.data}
          />
        );

      // Gerenciamento de usuários ou usinas (lista + forms aninhados).
      // Encaminha a própria config para o ManagementModal, que orquestra lista e forms internos.
      case 'MANAGE_USERS':
      case 'MANAGE_PLANTS':
        // Type guard: garante que modalConfig é do tipo esperado antes de passar para ManagementModal
        if (
          modalConfig.type === 'MANAGE_USERS' ||
          modalConfig.type === 'MANAGE_PLANTS'
        ) {
          return (
            <ManagementModal
              isOpen={true}
              onClose={handleCloseModal}
              config={modalConfig as ManagementModalConfig}
              setModalConfig={(newConfig) =>
                setModalConfig(newConfig ? (newConfig as ModalConfig) : null)
              }
            />
          );
        }
        return null;

      // Formulário para criar ou editar um usuário (dentro do ManagementModal).
      // Permite voltar para a tela anterior (lista de usuários) ao fechar o form.
      case 'USER_FORM': {
        const parentConfigForUser = modalConfig.data?.parentConfig || null;
        return (
          <UserForm
            isOpen={true}
            onClose={() => setModalConfig(parentConfigForUser)}
            initialData={modalConfig.data?.user}
            role={modalConfig.data?.role}
          />
        );
      }

      // Formulário para criar ou editar uma usina (dentro do ManagementModal).
      // Permite voltar para a tela anterior (lista de usinas) ao fechar o form.
      // Passa presetClient quando o fluxo vem do PlantList (criar usina para cliente específico).
      case 'PLANT_FORM': {
        const parentConfigForPlant = modalConfig.data?.parentConfig || null;
        return (
          <PlantForm
            isOpen={true}
            onClose={() => setModalConfig(parentConfigForPlant)}
            initialData={modalConfig.data?.plant}
            presetClient={modalConfig.data?.presetClient}
          />
        );
      }

      // Modal de filtros e download de dados
      case 'DOWNLOAD_FILTER':
        return <DownloadModal isOpen={true} onClose={handleCloseModal} />;

      // Fallback para tipos desconhecidos
      default:
        return null;
    }
  };

  // --- RENDER JSX ---
  // Estrutura do layout principal da aplicação: sidebar + conteúdo (header + board) + modal.
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Barra lateral: navegação por papel, gerenciamento de usuários/usinas e logout */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        setModalConfig={setModalConfig}
      />

      {/* Conteúdo principal: header + painel Kanban */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Cabeçalho: menu mobile, busca e botão "Nova OS" */}
        <Header
          onMenuClick={() => setMobileSidebarOpen(true)}
          onNewOSClick={handleNewOS}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Painel Kanban: exibe OSs em colunas por status */}
        <main className="flex-1 overflow-x-auto overflow-y-hidden">
          <Board
            osList={filteredOS} // Passa a lista já filtrada por termo de busca
            onUpdateOS={updateOS}
            onCardClick={handleCardClick}
            onOpenDownloadFilter={handleOpenDownloadFilter}
          />
        </main>
      </div>

      {/* Renderiza o modal que estiver ativo baseado em modalConfig */}
      {renderModal()}
    </div>
  );
};

export default Dashboard;