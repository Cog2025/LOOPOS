
import React, { useState } from 'react';
import { DataProvider } from './contexts/DataContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
    const { user } = useAuth();

    if (!user) {
        return <Login />;
    }

    return <Dashboard />;
};

const App: React.FC = () => {
  // A ordem dos provedores foi invertida. DataProvider agora envolve AuthProvider.
  // Isso corrige o erro, pois AuthProvider (que chama useData) agora é um filho de DataProvider.
  return (
    <DataProvider>
        <AuthProvider>
            <div className="min-h-screen text-gray-800 dark:text-gray-200">
                <AppContent />
            </div>
        </AuthProvider>
    </DataProvider>
  );
};

export default App;