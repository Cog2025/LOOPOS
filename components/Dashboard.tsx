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
import Calendar from './Calendar';
import Schedule52Weeks from './Schedule52Weeks';
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';
import ManagementModal from './modals/ManagementModal';
import UserForm from './modals/UserForm';
import PlantForm from './modals/PlantForm';
import DownloadModal from './modals/DownloadModal';
import ScheduleOSModal from './modals/ScheduleOSModal';

export type ViewType = 'KANBAN' | 'CALENDAR' | 'SCHEDULE_52_WEEKS';

interface ModalConfig {
  type: 'OS_DETAIL' | 'OS_FORM' | 'MANAGE_USERS' | 'MANAGE_PLANTS' | 'USER_FORM' | 'PLANT_FORM' | 'DOWNLOAD_FILTER' | 'SCHEDULE_RECURRENCE';
  data?: any;
}

const Dashboard: React.FC = () => {
  // ✅ CORREÇÃO: Extraindo plants e users para a busca funcionar
  const { osList, updateOS, plants, users } = useData();

  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('KANBAN');

  // 🔥 LÓGICA DE FILTRO CORRIGIDA
  const filteredOS = useMemo(() => {
    if (!searchTerm.trim()) return osList;
    
    const terms = searchTerm.toLowerCase().split(' ').filter(t => t);

    return osList.filter(os => {
        const plant = plants.find(p => p.id === os.plantId);
        const tech = users.find(u => u.id === os.technicianId);
        const sup = users.find(u => u.id === os.supervisorId);

        const searchableText = [
            os.title,
            os.id,
            os.activity,
            os.description,
            plant?.name,
            plant?.client,
            tech?.name,
            sup?.name
        ].filter(Boolean).join(' ').toLowerCase();

        return terms.every(term => searchableText.includes(term));
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
      case 'OS_DETAIL': return <OSDetailModal isOpen={true} onClose={handleCloseModal} os={modalConfig.data} setModalConfig={setModalConfig} />;
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
      <Sidebar isMobileOpen={isMobileSidebarOpen} setMobileOpen={setMobileSidebarOpen} isCollapsed={isSidebarCollapsed} setIsCollapsed={setSidebarCollapsed} setModalConfig={setModalConfig} currentView={currentView} setCurrentView={setCurrentView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} onNewOSClick={handleNewOS} searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <main className="flex-1 overflow-x-auto overflow-y-hidden relative">
          {currentView === 'KANBAN' && <Board osList={filteredOS} onUpdateOS={updateOS} onCardClick={handleCardClick} onOpenDownloadFilter={handleOpenDownloadFilter} />}
          {currentView === 'CALENDAR' && <Calendar osList={filteredOS} onCardClick={handleCardClick} />}
          {currentView === 'SCHEDULE_52_WEEKS' && <Schedule52Weeks osList={filteredOS} onCardClick={handleCardClick} onOpenScheduler={handleOpenScheduler} />}
        </main>
      </div>
      {renderModal()}
    </div>
  );
};
export default Dashboard;