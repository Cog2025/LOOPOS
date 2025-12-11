// File: components/Header.tsx
// Este componente renderiza o cabeçalho superior da aplicação, visível no Dashboard.

import React from 'react';
import { Menu, Search, Plus, User as UserIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';
import { Role } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  onNewOSClick: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onNewOSClick, searchTerm, setSearchTerm }) => {
  const { user, logout } = useAuth();

  // ✅ CLIENTE NÃO PODE CRIAR OS
  const canCreateOS = user?.role !== Role.CLIENT;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-20">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={onMenuClick} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden">
            <Menu className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar OS, usina, técnico..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-blue-500 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ✅ SÓ MOSTRA O BOTÃO SE NÃO FOR CLIENTE */}
          {canCreateOS && (
            <button 
              onClick={onNewOSClick}
              className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden lg:inline">Nova OS</span>
            </button>
          )}

          <NotificationBell />
          
          <div className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700">
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
            </div>
            <button onClick={logout} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg group" title="Sair">
               <UserIcon className="w-8 h-8 p-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 group-hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;