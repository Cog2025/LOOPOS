// File: App.tsx
// A ordem é crucial: DataProvider > AuthProvider > OfflineProvider.
// Motivo: DataProvider é a base, AuthProvider gerencia o usuário, e OfflineProvider usa ambos.

import React from 'react';
import './style.css';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
// 👇 1. IMPORT NOVO OBRIGATÓRIO
import { OfflineProvider } from './contexts/OfflineContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  // Acessa o estado de autenticação.
  const { user } = useAuth();

  // Se não houver usuário logado, exibe a tela de login.
  if (!user) return <Login />;

  // Se houver um usuário logado, exibe o painel principal (Dashboard).
  return <Dashboard />;
};

// O componente App principal envolve a aplicação com os provedores de contexto necessários.
// A ordem dos provedores é crucial: DataProvider > AuthProvider > OfflineProvider
const App: React.FC = () => {
  return (
    // DataProvider: Fornece todos os dados da aplicação (usuários, usinas, OSs).
    <DataProvider>
      
      {/* AuthProvider: Gerencia o estado de login/logout do usuário.
          Ele fica DENTRO do DataProvider, pois consome a lista de usuários via useData
          e injeta headers no DataContext após o login. */}
      <AuthProvider>

        {/* 👇 2. MUDANÇA DE ORDEM: OfflineProvider agora fica DENTRO do AuthProvider.
            Isso é a "blindagem" arquitetural. Garante que o sistema offline
            já tenha acesso ao contexto de autenticação se precisar, evitando erros de inicialização.
        */}
        <OfflineProvider>
          
          {/* Div principal que define o tema de cores da aplicação. */}
          <div className="min-h-screen text-gray-800 dark:text-gray-200">
            {/* Renderiza o conteúdo da aplicação, que será ou Login ou Dashboard. */}
            <AppContent />
          </div>

        </OfflineProvider>

      </AuthProvider>
    </DataProvider>
  );
};

export default App;