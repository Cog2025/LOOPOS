// File: components/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ViewType, Role, OSStatus } from '../types';

// Componentes de Layout e Visualização
import Sidebar from './Sidebar';
import Header from './Header';
import Board from './Board';
import Calendar from './Calendar';
import Schedule52Weeks from './Schedule52Weeks';
import MaintenancePlans from './MaintenancePlans';

// Modais
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';
import UserForm from './modals/UserForm';
import PlantForm from './modals/PlantForm';
import DownloadModal from './modals/DownloadModal';
import ScheduleOSModal from './modals/ScheduleOSModal';
import ManagementModal, { ManagementModalConfig } from './modals/ManagementModal';

interface DashboardModalConfig {
  type: 'OS_DETAIL' | 'OS_FORM' | 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM' | 'DOWNLOAD_FILTER' | 'SCHEDULE_RECURRENCE';
  data?: any;
}

const Dashboard: React.FC = () => {
  const { osList, plants, users } = useData();
  const { user } = useAuth();

  // Define a view padrão (Kanban)
  const [currentView, setCurrentView] = useState<ViewType>('KANBAN');
  
  // Estado do termo de busca (Search) do Header
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<DashboardModalConfig | null>(null);

  // 🔥 LÓGICA DE FILTRO (SEARCH) - ATUALIZADA
  // Filtra a lista de OSs com base no texto digitado no Header.
  const filteredOSList = useMemo(() => {
    if (!searchTerm.trim()) return osList;

    const lowerTerm = searchTerm.toLowerCase();

    return osList.filter(os => {
        const plantName = plants.find(p => p.id === os.plantId)?.name.toLowerCase() || '';
        const techName = users.find(u => u.id === os.technicianId)?.name.toLowerCase() || '';
        const osTitle = os.title.toLowerCase();
        const osId = os.id.toLowerCase();
        const osDesc = os.description?.toLowerCase() || '';
        
        // ✅ CORREÇÃO 1: Incluir busca nos Ativos (ex: Transformador, Disjuntor)
        // Verifica se existe array de assets ou assetName legado
        const assetsStr = os.assets 
            ? os.assets.join(' ').toLowerCase() 
            : ((os as any).assetName || '').toLowerCase();

        return (
            osTitle.includes(lowerTerm) ||
            osId.includes(lowerTerm) ||
            plantName.includes(lowerTerm) ||
            techName.includes(lowerTerm) ||
            osDesc.includes(lowerTerm) ||
            assetsStr.includes(lowerTerm) // <--- Agora busca "Transformador" funciona
        );
    });
  }, [osList, searchTerm, plants, users]);

  // Handlers
  const closeModal = () => setModalConfig(null);

  // Renderização da área principal baseada na View selecionada
  const renderContent = () => {
    switch (currentView) {
      case 'KANBAN':
        return (
          <Board 
            osList={filteredOSList} 
            onOpenDownloadFilter={(status) => setModalConfig({ type: 'DOWNLOAD_FILTER', data: { status } })}
            onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: { os } })}
          />
        );
      case 'CALENDAR':
        return (
          <Calendar 
            osList={filteredOSList} 
            onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: { os } })}
          />
        );
      case 'SCHEDULE_52_WEEKS': 
        return (
          <Schedule52Weeks 
            // Você pode passar a lista já filtrada OU a lista completa.
            // Passando a filteredOSList, garantimos que o filtro do Dashboard manda.
            osList={filteredOSList} 
            
            // ✅ CORREÇÃO 2: Passar o termo de busca para o componente
            searchTerm={searchTerm}

            onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: { os } })}
            onOpenScheduler={() => setModalConfig({ type: 'SCHEDULE_RECURRENCE' })}
          />
        );
      case 'MAINTENANCE_PLANS':
        return <MaintenancePlans />;
      default:
        return <div>Em construção...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileOpen}
        setMobileOpen={setIsMobileOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenManagement={() => {}} 
        setModalConfig={(cfg) => setModalConfig(cfg as any)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onMenuClick={() => setIsMobileOpen(true)}
          onNewOSClick={() => setModalConfig({ type: 'OS_FORM' })}
        />

        <main className="flex-1 overflow-hidden relative p-0 sm:p-2">
            {renderContent()}
        </main>
      </div>

      {/* --- MODAIS GLOBAIS --- */}

      {modalConfig?.type === 'OS_DETAIL' && (
        <OSDetailModal
          isOpen={true}
          os={modalConfig.data.os}
          onClose={closeModal}
          onEdit={() => setModalConfig({ type: 'OS_FORM', data: { os: modalConfig.data.os } })}
        />
      )}

      {modalConfig?.type === 'OS_FORM' && (
        <OSForm
          isOpen={true}
          initialData={modalConfig.data?.os}
          onClose={closeModal}
        />
      )}

      {modalConfig?.type === 'SCHEDULE_RECURRENCE' && (
        <ScheduleOSModal
          isOpen={true}
          onClose={closeModal}
        />
      )}

      {(modalConfig?.type === 'MANAGE_USERS' || modalConfig?.type === 'MANAGE_PLANTS') && (
        <ManagementModal
          isOpen={true}
          onClose={closeModal}
          config={modalConfig as unknown as ManagementModalConfig} 
          onOpenUserForm={(userToEdit, roleToSet) => setModalConfig({ 
              type: 'USER_FORM', 
              data: { 
                  user: userToEdit, 
                  role: roleToSet, 
                  parentConfig: modalConfig 
              } 
          })}
          onOpenPlantForm={(plantToEdit) => setModalConfig({ 
              type: 'PLANT_FORM', 
              data: { plant: plantToEdit, parentConfig: modalConfig } 
          })}
        />
      )}

      {modalConfig?.type === 'USER_FORM' && (
        <UserForm
          isOpen={true}
          user={modalConfig.data?.user}
          role={modalConfig.data?.role} 
          onClose={() => modalConfig.data?.parentConfig ? setModalConfig(modalConfig.data.parentConfig) : closeModal()}
        />
      )}

      {modalConfig?.type === 'PLANT_FORM' && (
        <PlantForm
          isOpen={true}
          initialData={modalConfig.data?.plant}
          onClose={() => modalConfig.data?.parentConfig ? setModalConfig(modalConfig.data.parentConfig) : closeModal()}
        />
      )}

      {modalConfig?.type === 'DOWNLOAD_FILTER' && (
        <DownloadModal 
            isOpen={true} 
            onClose={closeModal}
            initialStatus={modalConfig.data?.status}
        />
      )}

    </div>
  );
};

export default Dashboard;