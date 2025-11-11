import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { OS, Role } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Board from './Board';
import Modal from './modals/Modal'; // A generic modal for dynamic content
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';
import PlantForm from './modals/PlantForm';
import UserForm from './modals/UserForm';
import ManagementModal from './modals/ManagementModal';
import DownloadModal from './modals/DownloadModal';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { osList, plants, users, updateOS } = useData();

    const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [modalConfig, setModalConfig] = useState<any>(null);

    const closeModal = () => setModalConfig(null);

    const filteredOS = useMemo(() => {
        let filtered = osList;

        // Filter by user role
        if (user?.role === Role.SUPERVISOR) {
            filtered = filtered.filter(os => os.supervisorId === user.id);
        } else if (user?.role === Role.TECHNICIAN) {
            filtered = filtered.filter(os => os.technicianId === user.id);
        }

        // Filter by search term
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(os =>
                os.title.toLowerCase().includes(lowercasedTerm) ||
                os.description.toLowerCase().includes(lowercasedTerm) ||
                os.id.toLowerCase().includes(lowercasedTerm) ||
                plants.find(p => p.id === os.plantId)?.name.toLowerCase().includes(lowercasedTerm)
            );
        }
        return filtered;
    }, [osList, searchTerm, user, plants]);
    
    const handleUpdateOS = (os: OS) => {
        updateOS(os);
    };

    const renderModal = () => {
        if (!modalConfig) return null;

        switch (modalConfig.type) {
            case 'OS_DETAIL':
                return <OSDetailModal isOpen={true} onClose={closeModal} os={modalConfig.data} setModalConfig={setModalConfig} />;
            case 'OS_FORM':
                return <OSForm isOpen={true} onClose={closeModal} initialData={modalConfig.data} />;
            case 'PLANT_FORM':
                return <PlantForm isOpen={true} onClose={closeModal} initialData={modalConfig.data} />;
            case 'USER_FORM':
                return <UserForm isOpen={true} onClose={closeModal} initialData={modalConfig.data} roleToCreate={modalConfig.data?.role} />;
            case 'DOWNLOAD_FILTER':
                return <DownloadModal isOpen={true} onClose={closeModal} />;
            case 'MANAGE_PLANTS':
                return <ManagementModal
                    isOpen={true}
                    onClose={closeModal}
                    title="Gerenciar Usinas"
                    items={plants}
                    displayAttribute="name"
                    onEdit={(plant) => setModalConfig({ type: 'PLANT_FORM', data: plant })}
                />;
            case 'MANAGE_USERS':
                return <ManagementModal
                    isOpen={true}
                    onClose={closeModal}
                    title={`Gerenciar ${modalConfig.data.title}`}
                    items={users.filter(u => modalConfig.data.roles.includes(u.role))}
                    displayAttribute="name"
                    onEdit={(userToEdit) => setModalConfig({ type: 'USER_FORM', data: userToEdit })}
                />;
            default:
                return null;
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
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    onMenuClick={() => setMobileSidebarOpen(true)}
                    onNewOSClick={() => setModalConfig({ type: 'OS_FORM' })}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-hidden">
                    <Board 
                        osList={filteredOS}
                        onUpdateOS={handleUpdateOS}
                        onCardClick={(os) => setModalConfig({ type: 'OS_DETAIL', data: os })}
                        onOpenDownloadFilter={() => setModalConfig({ type: 'DOWNLOAD_FILTER' })}
                    />
                </main>
            </div>
            {renderModal()}
        </div>
    );
};

export default Dashboard;
