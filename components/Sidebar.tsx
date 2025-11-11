import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface SidebarProps {
    isMobileOpen: boolean;
    setMobileOpen: (isOpen: boolean) => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    setModalConfig: (config: any) => void;
}

interface NavLinkProps {
    icon: React.ReactElement;
    text: string;
    isCollapsed: boolean;
    onClick?: () => void;
    className?: string;
}

// NOTE: Changed from <a> to <button> to prevent default browser navigation and ensure onClick fires correctly for modals.
// This is semantically more correct for actions that don't change the URL.
const NavLink: React.FC<NavLinkProps> = ({ icon, text, isCollapsed, onClick, className = '' }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-3 my-1 text-sm font-medium rounded-lg transition-colors text-gray-300 hover:bg-gray-700 hover:text-white ${className}`}
    >
        {React.cloneElement(icon, { className: "w-6 h-6 text-gray-400"})}
        {!isCollapsed && <span className="ml-3 whitespace-nowrap">{text}</span>}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setMobileOpen, isCollapsed, setIsCollapsed, setModalConfig }) => {
    const { user, logout } = useAuth();

    const canSeeAdminItems = user?.role === Role.ADMIN;
    const canSeeOperatorItems = user?.role === Role.ADMIN || user?.role === Role.OPERATOR;
    const canSeeSupervisorItems = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.SUPERVISOR;

    const sidebarContent = (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-center p-4 border-b border-gray-700">
                 <SunIcon className="w-8 h-8 text-yellow-400" />
                 {!isCollapsed && <span className="ml-3 text-xl font-bold text-white">OS Solar</span>}
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                <div className="mb-4">
                    <div className="px-3 text-center">
                        {!isCollapsed && (
                             <>
                                <h4 className="font-semibold text-white">{user?.name}</h4>
                                <p className="text-xs text-gray-400">{user?.role}</p>
                             </>
                        )}
                    </div>
                </div>

                <nav>
                    {!isCollapsed && <h3 className="px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Cadastro</h3>}
                    
                    {canSeeOperatorItems && <NavLink isCollapsed={isCollapsed} icon={<PlusIcon />} text="Nova Usina" onClick={() => setModalConfig({ type: 'PLANT_FORM' })} />}
                    {canSeeSupervisorItems && <NavLink isCollapsed={isCollapsed} icon={<PlusIcon />} text="Novo Técnico" onClick={() => setModalConfig({ type: 'USER_FORM', data: { role: Role.TECHNICIAN } })} />}
                    {canSeeOperatorItems && <NavLink isCollapsed={isCollapsed} icon={<PlusIcon />} text="Novo Supervisor" onClick={() => setModalConfig({ type: 'USER_FORM', data: { role: Role.SUPERVISOR } })} />}
                    {canSeeSupervisorItems && <NavLink isCollapsed={isCollapsed} icon={<PlusIcon />} text="Novo Ativo" onClick={() => alert('Funcionalidade "Novo Ativo" a ser implementada.')} />}
                    {canSeeAdminItems && <NavLink isCollapsed={isCollapsed} icon={<PlusIcon />} text="Novo Usuário de Acesso" onClick={() => setModalConfig({ type: 'USER_FORM', data: { role: Role.OPERATOR } })} />}
                    
                    {!isCollapsed && <h3 className="mt-4 px-3 text-xs font-semibold tracking-wider text-gray-400 uppercase">Edição</h3>}
                    
                    {canSeeOperatorItems && <NavLink isCollapsed={isCollapsed} icon={<PencilIcon />} text="Editar Usina" onClick={() => setModalConfig({ type: 'MANAGE_PLANTS' })} />}
                    {canSeeSupervisorItems && <NavLink isCollapsed={isCollapsed} icon={<PencilIcon />} text="Editar Técnicos" onClick={() => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.TECHNICIAN], title: 'Técnicos' } })} />}
                    {canSeeOperatorItems && <NavLink isCollapsed={isCollapsed} icon={<PencilIcon />} text="Editar Supervisores" onClick={() => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.SUPERVISOR], title: 'Supervisores' } })} />}
                    {canSeeAdminItems && <NavLink isCollapsed={isCollapsed} icon={<PencilIcon />} text="Editar Usuários" onClick={() => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.ADMIN, Role.OPERATOR], title: 'Usuários' } })} />}
                </nav>
            </div>
            
            <div className="p-2 border-t border-gray-700">
                 {/* Sidebar toggle button for desktop */}
                 <button 
                    onClick={() => setIsCollapsed(!isCollapsed)} 
                    className="hidden lg:flex items-center justify-center w-full p-2 text-gray-400 rounded-lg hover:bg-gray-700"
                    title={isCollapsed ? "Expandir menu" : "Recolher menu"}
                >
                   <ChevronDoubleLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
                </button>
                <NavLink 
                    isCollapsed={isCollapsed} 
                    icon={<LogoutIcon />} 
                    text="Sair" 
                    onClick={logout} 
                    className="!text-red-400 hover:!bg-red-800/50 hover:!text-white"
                />
            </div>
        </div>
    );
    
    return (
        <>
            {/* Mobile Sidebar (Overlay) */}
            <div className={`fixed inset-0 z-30 bg-gray-900/80 lg:hidden transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setMobileOpen(false)}></div>
            <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-gray-800 text-white transform transition-transform lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar (Static) */}
            <aside className={`hidden lg:flex lg:flex-shrink-0 bg-gray-800 text-white transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
                {sidebarContent}
            </aside>
        </>
    );
};

// --- SVG Icons ---
const SunIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const PlusIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const PencilIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const LogoutIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>;
const ChevronDoubleLeftIcon: React.FC<{className?: string}> = ({className}) => <svg className={className} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;

export default Sidebar;
