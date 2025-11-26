// File: components/Sidebar.tsx
// Este componente renderiza a barra de navegação lateral, que é responsiva e possui
// controle de acesso baseado na função do usuário. Ajustamos a normalização de "role"
// para evitar sumiço do menu quando o backend/UI enviar rótulos como "Admin" ao invés de "ADMIN".

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import { ViewType } from './Dashboard';

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1m-6 6H3v-2a4 4 0 014-4h1m8-6a4 4 0 11-8 0 4 4 0 018 0z"/>
  </svg>
);

interface SidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (isOpen: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (isCollapsed: boolean) => void;
  setModalConfig: (config: any) => void;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setMobileOpen,
  isCollapsed,
  setIsCollapsed,
  setModalConfig,
  currentView,
  setCurrentView,
}) => {
  const { user, logout } = useAuth();

  // --- RÓTULOS ---
  // Mapa de rótulos amigáveis para exibir na UI
  const roleLabelMap: Record<string, string> = {
    ADMIN: 'Admin',
    SUPERVISOR: 'Supervisor',
    TECHNICIAN: 'Técnico',
    OPERATOR: 'Operador',
    COORDINATOR: 'Coordenador',
    ASSISTANT: 'Auxiliar',
  };
  const roleLabel = roleLabelMap[user?.role ?? ''] ?? '—';

  // --- ITENS DE NAVEGAÇÃO ---
  // Renderiza menus conforme a função do usuário e RBAC
  const navItems = [
    // ============ NAVEGAÇÃO PRINCIPAL (VIEWS) ============
    {
      title: 'Kanban',
      onClick: () => {
        setCurrentView('KANBAN');
        setMobileOpen(false);
      },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
      show: true,
      isActive: currentView === 'KANBAN',
    },
    {
      title: 'Cronograma 52 Semanas',
      onClick: () => {
        setCurrentView('SCHEDULE_52_WEEKS');
        setMobileOpen(false);
      },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      show: true,
      isActive: currentView === 'SCHEDULE_52_WEEKS',
    },
    {
      title: 'Calendário',
      onClick: () => {
        setCurrentView('CALENDAR');
        setMobileOpen(false);
      },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      show: true,
      isActive: currentView === 'CALENDAR',
    },
    // ============ GERENCIAMENTO ============
    // ============ GERENCIAMENTO DE USUÁRIOS POR PAPEL ============
    ...(user?.role === Role.ADMIN || user?.role === Role.OPERATOR
        ? [
            { 
            title: 'Administradores', 
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { title: 'Administradores', roles: [Role.ADMIN] } }), 
            icon: <UsersIcon />,
            show: true 
            },
        ]
        : []),

    ...(user?.role === Role.ADMIN || user?.role === Role.OPERATOR
    ? [
        { 
          title: 'Operadores', 
          onClick: () => setModalConfig({ 
            type: 'MANAGE_USERS', 
            data: { title: 'Operadores', roles: [Role.OPERATOR] } 
          }), 
          icon: <UsersIcon />,
          show: true 
        },
    ]
    : []),
    
    ...(user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.COORDINATOR
        ? [
            { 
            title: 'Coordenadores', 
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { title: 'Coordenadores', roles: [Role.COORDINATOR] } }), 
            icon: <UsersIcon />,
            show: true 
            },
        ]
        : []),
    
    ...(user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.COORDINATOR || user?.role === Role.SUPERVISOR
        ? [
            { 
            title: 'Supervisores', 
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { title: 'Supervisores', roles: [Role.SUPERVISOR] } }), 
            icon: <UsersIcon />,
            show: true 
            },
        ]
        : []),
    
    ...(user?.role !== Role.ASSISTANT // Todos menos Auxiliar
        ? [
            { 
            title: 'Técnicos', 
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { title: 'Técnicos', roles: [Role.TECHNICIAN] } }), 
            icon: <UsersIcon />,
            show: true 
            },
        ]
        : []),
    
    ...(user?.role !== Role.ASSISTANT // Todos menos Auxiliar
        ? [
            { 
            title: 'Auxiliares', 
            onClick: () => setModalConfig({ type: 'MANAGE_USERS', data: { title: 'Auxiliares', roles: [Role.ASSISTANT] } }), 
            icon: <UsersIcon />,
            show: true 
            },
        ]
        : []),

    // ============ GERENCIAMENTO DE USINAS ============
    ...(user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.COORDINATOR || user?.role === Role.SUPERVISOR
        ? [
            {
            title: 'Gerenciar Usinas',
            onClick: () => setModalConfig({ type: 'MANAGE_PLANTS' }),
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            ),
            show: true,
            },
        ]
        : []),
    ];

  // Conteúdo reutilizável da sidebar (mobile e desktop)
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Cabeçalho com logo e nome do sistema; gira levemente quando recolhida */}
      <div className="flex items-center justify-center p-4 border-b dark:border-gray-700">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-8 w-8 text-blue-500 transition-transform duration-300 ${isCollapsed ? 'rotate-12' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        {!isCollapsed && <h1 className="ml-2 text-xl font-bold">LOOP.OS Manager</h1>}
      </div>

      {/* Navegação Principal: renderiza somente itens permitidos */}
      <nav className="flex-1 px-2 py-4 space-y-2">
        {navItems.filter(item => item.show).map(item => (
          <button
            key={item.title}
            onClick={item.onClick}
            className={`w-full flex items-center px-4 py-2 rounded-md transition-colors ${
              (item.isActive ?? false)
                ? 'bg-blue-500 text-white dark:bg-blue-600'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {item.icon}
            {!isCollapsed && <span className="ml-3">{item.title}</span>}
          </button>
        ))}

        {/* Caso nada esteja visível por papel, mostre uma dica (opcional) */}
        {navItems.every(i => !i.show) && (
          <p className="text-xs text-gray-500 px-4 py-2">Sem permissões para navegação.</p>
        )}
      </nav>

      {/* Seção do Usuário e Logout */}
      <div className="px-2 py-4 border-t dark:border-gray-700">
        <div className="flex items-center px-4">
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0) ?? '?'}
          </div>
          {!isCollapsed && (
            <div className="ml-3">
              <p className="font-semibold text-sm">{user?.name ?? '—'}</p>
              <p className="text-xs text-gray-500">{roleLabel || '—'}</p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center px-4 py-2 mt-4 text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!isCollapsed && <span className="ml-3">Sair</span>}
        </button>
      </div>

      {/* Botão de recolher/expandir (desktop) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute top-1/2 -right-3 transform -translate-y-1/2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 hidden lg:block"
        title={isCollapsed ? 'Expandir' : 'Recolher'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </div>
  );

  // Render responsivo: drawer no mobile, fixa no desktop
  return (
    <>
      {/* Overlay do drawer (mobile) */}
      <div
        className={`fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden transition-opacity ${isMobileOpen ? 'opacity-30' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />
      {/* Sidebar mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 transform transition-transform lg:hidden ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={`relative hidden lg:flex flex-col flex-shrink-0 bg-white dark:bg-gray-800 border-r dark:border-gray-700 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;