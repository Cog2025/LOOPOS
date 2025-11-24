// File: contexts/AuthContext.tsx
// Este arquivo gerencia o estado de autenticação do usuário em toda a aplicação.
// Mantém comentários explicativos para facilitar manutenção e futuras integrações.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
import { useData } from './DataContext';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      if (raw) return JSON.parse(raw) as User;
    } catch { }
    return null;
  });

  const { setAuthHeaders, reloadFromAPI, clearData } = useData();

  useEffect(() => {
    // Recupera o token salvo
    const token = localStorage.getItem('token');
    if (user && token) {
      // Configura o header para todas as requisições futuras
      setAuthHeaders({ 
        'X-User-Id': user.id, 
        'X-Role': user.role,
        // Em um sistema JWT real, usaríamos: 'Authorization': `Bearer ${token}`
        // Mas como seu backend usa headers customizados por enquanto, mantemos o X-User-Id
        // Se quiser migrar 100%, o backend teria que ler o Bearer token.
      });
      reloadFromAPI();
    }
  }, [user, setAuthHeaders, reloadFromAPI]);

  const login = async (username: string, password: string) => {
    // O FastAPI espera x-www-form-urlencoded para o OAuth2PasswordRequestForm
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Usuário ou senha inválidos');
      }

      const data = await res.json();
      
      // Salva o token e o usuário
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      setUser(data.user);

    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    clearData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};