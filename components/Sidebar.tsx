// File: components/Sidebar.tsx
import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  CalendarDays,
  Factory,        // Usinas
  ClipboardList,  // Planos
  ShieldCheck,    // Admin
  Monitor,        // Operador
  UserCheck,      // Coordenador
  Eye,            // Supervisor
  Wrench,         // Técnico
  HelpingHand,    // Auxiliar
  Briefcase       // Cliente
} from 'lucide-react';
import { ViewType, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  setModalConfig: (config: { type: any; data: any }) => void;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  onOpenManagement: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setMobileOpen,
  isCollapsed,
  setIsCollapsed,
  setModalConfig,
  currentView,
  setCurrentView,
  onOpenManagement
}) => {
  const { user, logout } = useAuth();

  // --- MENU PRINCIPAL ---
  const menuItems = [
    { 
      id: 'KANBAN' as ViewType, 
      label: 'Painel Kanban', 
      icon: LayoutDashboard 
    },
    { 
      id: 'CALENDAR' as ViewType, 
      label: 'Calendário', 
      icon: Calendar 
    },
    { 
      id: 'SCHEDULE_52_WEEKS' as ViewType, 
      label: 'Cronograma 52 Semanas', 
      icon: CalendarDays 
    },
    { 
      id: 'MAINTENANCE_PLANS' as ViewType, 
      label: 'Planos de Manutenção', 
      icon: ClipboardList 
    },
  ];

  // --- BOTÕES DE CARGOS ---
  const allRoleButtons = [
    { role: Role.ADMIN, label: 'Administradores', icon: ShieldCheck },
    { role: Role.OPERATOR, label: 'Operadores', icon: Monitor },
    { role: Role.COORDINATOR, label: 'Coordenadores', icon: UserCheck },
    { role: Role.SUPERVISOR, label: 'Supervisores', icon: Eye },
    { role: Role.TECHNICIAN, label: 'Técnicos', icon: Wrench },
    { role: Role.ASSISTANT, label: 'Auxiliares', icon: HelpingHand },
    { role: Role.CLIENT, label: 'Clientes', icon: Briefcase },
  ];

  // ✅ FILTRO DE VISIBILIDADE DO MENU (RBAC)
  const visibleRoleButtons = allRoleButtons.filter(btn => {
      if (!user) return false;
      
      // Admin e Operador veem tudo
      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return true;

      // Outros cargos não devem ver o botão de gerenciar Admins ou Operadores
      if (btn.role === Role.ADMIN || btn.role === Role.OPERATOR) return false;

      return true;
  });

  const handleOpenUserRole = (roleFilter: Role, label: string) => {
    setModalConfig({ 
      type: 'MANAGE_USERS', 
      data: { roleFilter, label } 
    });
    setMobileOpen(false);
  };

  const handleOpenPlants = () => {
    setModalConfig({ type: 'MANAGE_PLANTS', data: null });
    setMobileOpen(false);
  };

  const canViewTeam = user && user.role !== Role.CLIENT;

  return (
    <>
      {/* Overlay Mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Container Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent truncate">
              LoopOS
            </span>
          )}
          {isCollapsed && (
             <span className="mx-auto text-xl font-bold text-blue-600">L</span>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hidden lg:block"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 lg:hidden"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Menu Principal */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setMobileOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} className={isActive ? 'text-blue-600 dark:text-blue-400' : ''} />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}

          <div className="my-4 border-t border-gray-200 dark:border-gray-700" />

          {/* Seção de Gestão (Equipe e Usinas) */}
          {canViewTeam && (
            <>
              {!isCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Equipe e Usinas
                </div>
              )}

              {/* Botões de Cargos Filtrados */}
              {visibleRoleButtons.map((roleItem) => (
                <button
                  key={roleItem.role}
                  onClick={() => handleOpenUserRole(roleItem.role, roleItem.label)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 
                    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? roleItem.label : undefined}
                >
                  <roleItem.icon size={20} />
                  {!isCollapsed && <span className="font-medium text-sm">{roleItem.label}</span>}
                </button>
              ))}

              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

              {/* Botão Usinas */}
              <button
                onClick={handleOpenPlants}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${isCollapsed ? 'justify-center' : ''}
                `}
                title={isCollapsed ? "Usinas" : undefined}
              >
                <Factory size={20} />
                {!isCollapsed && <span className="font-medium">Usinas</span>}
              </button>
            </>
          )}

        </nav>

        {/* Rodapé */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || 'Visitante'}
                </p>
              </div>
            )}
            
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;