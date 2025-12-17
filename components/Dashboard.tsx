// File: components/Dashboard.tsx
import React, { useState } from 'react';
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

  // ✅ CORRIGIDO: Usa 'KANBAN' como padrão (igual ao Sidebar e types.ts)
  const [currentView, setCurrentView] = useState<ViewType>('KANBAN');
  
  // Estado para controle da Sidebar Mobile
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Estado para Busca Global
  const [searchTerm, setSearchTerm] = useState('');

  // Configuração centralizada de Modais
  const [modalConfig, setModalConfig] = useState<DashboardModalConfig | null>(null);

  // --- FILTROS DE BUSCA ---
  const filteredOSList = osList.filter(os => {
    const searchLower = searchTerm.toLowerCase();
    const plantName = plants.find(p => p.id === os.plantId)?.name.toLowerCase() || '';
    const technicianName = users.find(u => u.id === os.technicianId)?.name.toLowerCase() || '';
    
    return (
      os.title.toLowerCase().includes(searchLower) ||
      os.id.toLowerCase().includes(searchLower) ||
      plantName.includes(searchLower) ||
      technicianName.includes(searchLower) ||
      (os.activity && os.activity.toLowerCase().includes(searchLower))
    );
  });

  // --- HANDLERS ---
  const closeModal = () => setModalConfig(null);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        isMobileOpen={isMobileOpen}
        setMobileOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        currentView={currentView}
        setCurrentView={setCurrentView}
        setModalConfig={(cfg) => setModalConfig(cfg as any)} // Cast simples para compatibilidade
        onOpenManagement={() => setModalConfig({ type: 'MANAGE_PLANTS', data: {} })}
      />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* HEADER */}
        <Header 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          toggleSidebar={() => setMobileOpen(!isMobileOpen)}
          onMenuClick={() => setMobileOpen(true)}
          onNewOSClick={() => setModalConfig({ type: 'OS_FORM', data: null })}
        />

        {/* CONTEÚDO (Renderiza conforme a View selecionada no Sidebar) */}
        <main className="flex-1 overflow-hidden relative">
          
          {/* ✅ CORRIGIDO: Renderiza com base nos IDs restaurados */}
          {currentView === 'KANBAN' && (
            <Board 
              osList={filteredOSList} 
              onOpenDownloadFilter={(status) => setModalConfig({ 
                  type: 'DOWNLOAD_FILTER', 
                  data: { status: status || '' } 
              })}
              // ✅ Passa a função para abrir detalhes ao clicar no card
              onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })}
            />
          )}

          {currentView === 'CALENDAR' && (
            <Calendar 
              osList={filteredOSList}
              onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })}
            />
          )}

          {currentView === 'SCHEDULE_52_WEEKS' && (
            <Schedule52Weeks 
              osList={filteredOSList}
              onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })}
              onOpenScheduler={() => setModalConfig({ type: 'SCHEDULE_RECURRENCE' })}
            />
          )}

          {currentView === 'MAINTENANCE_PLANS' && (
            <MaintenancePlans />
          )}
        </main>
      </div>

      {/* --- RENDERIZAÇÃO DE MODAIS --- */}

      {modalConfig?.type === 'OS_DETAIL' && (
        <OSDetailModal 
          isOpen={true} 
          os={modalConfig.data} 
          onClose={closeModal} 
          onEdit={() => setModalConfig({ type: 'OS_FORM', data: modalConfig.data })}
        />
      )}

      {modalConfig?.type === 'OS_FORM' && (
        <OSForm 
          isOpen={true} 
          initialData={modalConfig.data} 
          onClose={closeModal} 
        />
      )}

      {modalConfig?.type === 'SCHEDULE_RECURRENCE' && (
        <ScheduleOSModal 
          isOpen={true} 
          onClose={closeModal} 
        />
      )}

      {/* Modais de Gestão (Usinas/Usuários) */}
      {(modalConfig?.type === 'MANAGE_USERS' || modalConfig?.type === 'MANAGE_PLANTS') && (
        <ManagementModal
          isOpen={true}
          onClose={closeModal}
          config={modalConfig as unknown as ManagementModalConfig} // Cast para compatibilidade
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