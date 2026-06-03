// File: App.tsx
import React, { useEffect } from 'react';
import './style.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// Importando as páginas
import Board from './pages/Board';
import Calendar from './pages/Calendar';
import Schedule52Weeks from './pages/Schedule52Weeks';
import MaintenancePlans from './pages/MaintenancePlans';
import AdminPermissoes from './pages/AdminPermissoes';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />

      {/* Rota Pai (Layout do Dashboard) */}
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" replace />}>
         {/* Redirecionamento padrão: / -> /kanban */}
         <Route index element={<Navigate to="kanban" replace />} />
         
         {/* Rotas Filhas (Renderizadas dentro do Outlet do Dashboard) */}
         <Route path="kanban" element={<Board />} />
         <Route path="calendar" element={<Calendar />} />
         <Route path="schedule" element={<Schedule52Weeks />} />
         <Route path="plans" element={<MaintenancePlans />} />
         <Route path="admin/permissoes" element={<AdminPermissoes />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    const hasCleaned = localStorage.getItem('HAS_CLEANED_GHOSTS_V1');
    if (!hasCleaned) {
      console.warn("🧹 Executando Limpeza Nuclear de Dados Fantasmas...");
      localStorage.clear();
      if (window.indexedDB) {
        const req = window.indexedDB.deleteDatabase('loopos-offline-db');
        req.onsuccess = () => console.log("✅ Banco Offline deletado com sucesso.");
        req.onerror = () => console.log("⚠️ Erro ao deletar banco offline.");
      }
      localStorage.setItem('HAS_CLEANED_GHOSTS_V1', 'true');
      alert("O sistema realizou uma limpeza de segurança. Por favor, faça login novamente.");
      window.location.reload();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <DataProvider>
        <AuthProvider>
          <OfflineProvider>
            <BrowserRouter>
              <div className="min-h-screen text-gray-800 dark:text-gray-200">
                <AppContent />
              </div>
            </BrowserRouter>
          </OfflineProvider>
        </AuthProvider>
      </DataProvider>
    </QueryClientProvider>
  );
};

export default App;