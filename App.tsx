// App.tsx (ordem final dos providers)
// A ordem é crucial: DataProvider POR FORA, AuthProvider POR DENTRO.
// Motivo: o AuthProvider consome useData; se ele estiver fora, dispara o erro.

import React from 'react';
import './style.css';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
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
// A ordem dos provedores é crucial: o DataProvider PRECISA ficar por fora,
// pois o AuthProvider usa useData internamente para autenticar/injetar headers.
const App: React.FC = () => {
  return (
    // DataProvider: Fornece todos os dados da aplicação (usuários, usinas, OSs).
    <DataProvider>
      {/* AuthProvider: Gerencia o estado de login/logout do usuário.
          Ele fica DENTRO do DataProvider, pois consome a lista de usuários via useData
          e injeta headers no DataContext após o login. */}
      <AuthProvider>
        {/* Div principal que define o tema de cores da aplicação. */}
        <div className="min-h-screen text-gray-800 dark:text-gray-200">
          {/* Renderiza o conteúdo da aplicação, que será ou Login ou Dashboard. */}
          <AppContent />
        </div>
      </AuthProvider>
    </DataProvider>
  );
};

export default App;
