// File: src/components/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import ManagementModal, { ManagementModalConfig } from './modals/ManagementModal';
import { OS, ViewType, Role } from '../types';
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

interface DashboardModalConfig {
  type: 'OS_DETAIL' | 'OS_FORM' | 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM' | 'DOWNLOAD_FILTER' | 'SCHEDULE_RECURRENCE';
  data?: any;
}

const Dashboard: React.FC = () => {
  const { osList, filterOSForUser } = useData();
  const { user } = useAuth();

  const [currentView, setCurrentView] = useState<ViewType>('KANBAN');
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalConfig, setModalConfig] = useState<DashboardModalConfig | null>(null);

  const filteredOS = useMemo(() => {
    let list = filterOSForUser(user!);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(os => 
        os.title.toLowerCase().includes(lower) ||
        os.description.toLowerCase().includes(lower) ||
        os.id.toLowerCase().includes(lower)
      );
    }
    return list;
  }, [osList, user, searchTerm, filterOSForUser]);

  const closeModal = () => setModalConfig(null);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed} 
        setModalConfig={setModalConfig as any}
        currentView={currentView} 
        setCurrentView={setCurrentView} 
        onOpenManagement={() => setModalConfig({ type: 'MANAGE_USERS', data: { roleFilter: null } })} 
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onMenuClick={() => setMobileSidebarOpen(true)}
            toggleSidebar={() => setMobileSidebarOpen(!isMobileSidebarOpen)} 
            onNewOSClick={() => setModalConfig({ type: 'OS_FORM', data: null })} 
        />

        <main className="flex-1 overflow-x-auto overflow-y-hidden relative">
          {currentView === 'KANBAN' && (
            <Board osList={filteredOS} onOpenDownloadFilter={() => setModalConfig({ type: 'DOWNLOAD_FILTER' })} />
          )} 
          {currentView === 'CALENDAR' && (
            <Calendar osList={filteredOS} onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })} />
          )}
          {currentView === 'SCHEDULE_52_WEEKS' && (
            <Schedule52Weeks 
                osList={filteredOS} 
                onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })} 
                onOpenScheduler={() => setModalConfig({ type: 'SCHEDULE_RECURRENCE' })} 
            />
          )}
          {currentView === 'MAINTENANCE_PLANS' && <MaintenancePlans />}
        </main>
      </div>

      {/* RENDERIZAÇÃO DOS MODAIS */}
      {modalConfig?.type === 'OS_DETAIL' && (
        <OSDetailModal isOpen={true} os={modalConfig.data} onClose={closeModal} onEdit={() => setModalConfig({ type: 'OS_FORM', data: modalConfig.data })} />
      )}

      {modalConfig?.type === 'OS_FORM' && (
        <OSForm isOpen={true} initialData={modalConfig.data} onClose={closeModal} />
      )}

      {(modalConfig?.type === 'MANAGE_USERS' || modalConfig?.type === 'MANAGE_PLANTS') && (
        <ManagementModal
          isOpen={true}
          onClose={closeModal}
          config={modalConfig as unknown as ManagementModalConfig}
          // ✅ CORREÇÃO AQUI: Captura 'userToEdit' E 'roleToSet'
          onOpenUserForm={(userToEdit, roleToSet) => setModalConfig({ 
              type: 'USER_FORM', 
              data: { 
                  user: userToEdit, 
                  role: roleToSet, // Passa o cargo para o UserForm
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
          role={modalConfig.data?.role} // ✅ Recebe o cargo aqui
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

      {modalConfig?.type === 'DOWNLOAD_FILTER' && <DownloadModal isOpen={true} onClose={closeModal} />}
      {modalConfig?.type === 'SCHEDULE_RECURRENCE' && <ScheduleOSModal isOpen={true} onClose={closeModal} />}

    </div>
  );
};

export default Dashboard;