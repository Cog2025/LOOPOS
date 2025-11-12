// File: components/Sidebar.tsx
// Este componente renderiza a barra de navegação lateral, que é responsiva e possui controle de acesso baseado na função do usuário.

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

// Define a estrutura das propriedades que o componente Sidebar espera receber do Dashboard.
interface SidebarProps {
    isMobileOpen: boolean; // Controla a visibilidade no modo mobile.
    setMobileOpen: (isOpen: boolean) => void; // Função para alterar a visibilidade no modo mobile.
    isCollapsed: boolean; // Controla se a sidebar está recolhida no modo desktop.
    setIsCollapsed: (isCollapsed: boolean) => void; // Função para alterar o estado de recolhimento.
    setModalConfig: (config: any) => void; // Função para abrir modais de gerenciamento.
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setMobileOpen, isCollapsed, setIsCollapsed, setModalConfig }) => {
    // Acessa os dados do usuário logado e a função de logout.
    const { user, logout } = useAuth();

    // Verificações de permissão para renderização condicional dos itens de menu.
    const isAdmin = user?.role === Role.ADMIN;
    const isSupervisor = user?.role === Role.SUPERVISOR;

    // Array de objetos que define os itens de navegação da sidebar.
    const navItems = [
        {
            title: 'Gerenciar Técnicos',
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.TECHNICIAN], title: 'Técnicos' } }),
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
            show: isAdmin || isSupervisor, // Visível para Admin e Supervisor.
        },
        {
            title: 'Gerenciar Supervisores',
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.SUPERVISOR], title: 'Supervisores' } }),
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
            show: isAdmin, // Visível apenas para Admin.
        },
        {
            title: 'Gerenciar Operadores',
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { roles: [Role.OPERATOR], title: 'Operadores' } }),
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
            show: isAdmin, // Visível apenas para Admin.
        },
         {
            title: 'Gerenciar Usinas',
            onClick: () => setModalConfig({ type: 'MANAGE_PLANTS' }),
            icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
            show: isAdmin, // Visível apenas para Admin.
        },
    ];

    // Componente interno que renderiza o conteúdo da sidebar, para ser reutilizado nos modos mobile e desktop.
    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Cabeçalho da Sidebar com o logo e nome do sistema */}
            <div className="flex items-center justify-center p-4 border-b dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-8 w-8 text-blue-500 transition-transform duration-300 ${isCollapsed ? 'rotate-12' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                {!isCollapsed && <h1 className="ml-2 text-xl font-bold">LOOP.OS Manager</h1>}
            </div>
            {/* Navegação Principal */}
            <nav className="flex-1 px-2 py-4 space-y-2">
                {navItems.filter(item => item.show).map(item => (
                    <button key={item.title} onClick={item.onClick} className="w-full flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                        {item.icon}
                        {!isCollapsed && <span className="ml-3">{item.title}</span>}
                    </button>
                ))}
            </nav>
            {/* Seção do Usuário e Logout */}
            <div className="px-2 py-4 border-t dark:border-gray-700">
                <div className="flex items-center px-4">
                    <div className={`w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold`}>
                        {user?.name.charAt(0)}
                    </div>
                    {!isCollapsed && (
                        <div className="ml-3">
                            <p className="font-semibold text-sm">{user?.name}</p>
                            <p className="text-xs text-gray-500">{user?.role}</p>
                        </div>
                    )}
                </div>
                 <button onClick={logout} className="w-full flex items-center px-4 py-2 mt-4 text-gray-600 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    {!isCollapsed && <span className="ml-3">Sair</span>}
                </button>
            </div>
            {/* Botão para recolher/expandir a sidebar no desktop */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hidden lg:block"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
        </div>
    );

    // JSX principal que renderiza a sidebar para mobile e desktop.
    return (
        <>
            {/* Sidebar para dispositivos móveis (fica escondida e aparece como um overlay) */}
            <div
                className={`fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden transition-opacity ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setMobileOpen(false)}
            ></div>
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 transform transition-transform lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <SidebarContent />
            </aside>

            {/* Sidebar para desktop (sempre visível) */}
            <aside
                className={`relative hidden lg:flex flex-col flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
            >
                 <SidebarContent />
            </aside>
        </>
    );
};

export default Sidebar;
