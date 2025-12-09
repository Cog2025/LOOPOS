// File: components/Dashboard.tsx
import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { ManagementModalConfig } from './modals/ManagementModal';
import { OS, ViewType } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Board from './Board';
import Calendar from './Calendar';
import Schedule52Weeks from './Schedule52Weeks';
import MaintenancePlans from './MaintenancePlans';
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';
import ManagementModal from './modals/ManagementModal';
import UserForm from './modals/UserForm';
import PlantForm from './modals/PlantForm';
import DownloadModal from './modals/DownloadModal';
import ScheduleOSModal from './modals/ScheduleOSModal';

interface ModalConfig {
  type: 'OS_DETAIL' | 'OS_FORM' | 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM' | 'DOWNLOAD_FILTER' | 'SCHEDULE_RECURRENCE';
  data?: any;
}

const Dashboard: React.FC = () => {
  const { osList, plants, users } = useData();

  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('KANBAN');

  // ✅ FUNÇÃO DE NORMALIZAÇÃO
  const normalizeStr = (str: string | undefined | null) => {
      if (!str) return '';
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
  };

  // ✅ SUPER BUSCA
  const filteredOS = useMemo(() => {
    if (!searchTerm.trim()) return osList;
    
    const terms = normalizeStr(searchTerm).split(/\s+/).filter(t => t);

    return osList.filter(os => {
        // Relacionamentos
        const plant = plants.find(p => p.id === os.plantId);
        
        // Pessoas Diretas
        const techOS = users.find(u => u.id === os.technicianId);
        const supervisorOS = users.find(u => u.id === os.supervisorId);

        // Pessoas da Usina
        const plantCoordinator = users.find(u => u.id === plant?.coordinatorId);
        
        const plantSupervisors = (plant?.supervisorIds || []).map(id => users.find(u => u.id === id)?.name).join(' ');
        const plantTechnicians = (plant?.technicianIds || []).map(id => users.find(u => u.id === id)?.name).join(' ');
        const plantAssistants = (plant?.assistantIds || []).map(id => users.find(u => u.id === id)?.name).join(' ');

        // Campos Pesquisáveis
        const searchableFields = [
            os.title,           
            os.id,              
            os.activity,        
            os.description,     
            os.status,          
            os.priority,
            os.classification1, 
            os.classification2, 
            
            plant?.name,        
            plant?.client,      
            
            techOS?.name,         
            supervisorOS?.name,   
            plantCoordinator?.name,
            plantSupervisors,
            plantTechnicians,
            plantAssistants
        ];

        const fullSearchString = searchableFields.map(normalizeStr).join(' '); 
        return terms.every(term => fullSearchString.includes(term));
    });
  }, [osList, searchTerm, plants, users]);

  const handleCloseModal = () => setModalConfig(null);
  const handleNewOS = () => setModalConfig({ type: 'OS_FORM' });
  const handleCardClick = (os: OS) => setModalConfig({ type: 'OS_DETAIL', data: os });
  const handleOpenDownloadFilter = () => setModalConfig({ type: 'DOWNLOAD_FILTER' });
  const handleOpenScheduler = () => setModalConfig({ type: 'SCHEDULE_RECURRENCE' });

  const renderModal = () => {
    if (!modalConfig) return null;
    switch (modalConfig.type) {
      case 'OS_DETAIL': 
        return (
            <OSDetailModal 
                isOpen={true} 
                onClose={handleCloseModal} 
                os={modalConfig.data} 
                onEdit={() => setModalConfig({ type: 'OS_FORM', data: modalConfig.data })} 
            />
        );
      case 'OS_FORM': return <OSForm isOpen={true} onClose={handleCloseModal} initialData={modalConfig.data} />;
      case 'MANAGE_USERS':
      case 'MANAGE_PLANTS': return <ManagementModal isOpen={true} onClose={handleCloseModal} config={modalConfig as ManagementModalConfig} setModalConfig={(newConfig) => setModalConfig(newConfig ? (newConfig as ModalConfig) : null)} />;
      case 'USER_FORM': return <UserForm isOpen={true} onClose={() => setModalConfig(modalConfig.data?.parentConfig)} initialData={modalConfig.data?.user} role={modalConfig.data?.role} />;
      case 'PLANT_FORM': return <PlantForm isOpen={true} onClose={() => setModalConfig(modalConfig.data?.parentConfig)} initialData={modalConfig.data?.plant} presetClient={modalConfig.data?.presetClient} />;
      case 'DOWNLOAD_FILTER': return <DownloadModal isOpen={true} onClose={handleCloseModal} />;
      case 'SCHEDULE_RECURRENCE': return <ScheduleOSModal isOpen={true} onClose={handleCloseModal} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar 
        isMobileOpen={isMobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed} 
        setModalConfig={setModalConfig} 
        currentView={currentView} 
        setCurrentView={setCurrentView} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} onNewOSClick={handleNewOS} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <main className="flex-1 overflow-x-auto overflow-y-hidden relative">
          {/* ✅ CORREÇÃO: Passando filteredOS para o Board */}
          {currentView === 'KANBAN' && (<Board onOpenDownloadFilter={handleOpenDownloadFilter} osList={filteredOS} />)} 
          {currentView === 'CALENDAR' && <Calendar osList={filteredOS} onCardClick={handleCardClick} />}
          {currentView === 'SCHEDULE_52_WEEKS' && <Schedule52Weeks osList={filteredOS} onCardClick={handleCardClick} onOpenScheduler={handleOpenScheduler} />}
          {currentView === 'MAINTENANCE_PLANS' && <MaintenancePlans />}
        </main>
      </div>
      {renderModal()}
    </div>
  );
};
export default Dashboard;