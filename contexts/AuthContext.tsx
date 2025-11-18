// File: contexts/AuthContext.tsx
// Este arquivo gerencia o estado de autenticação do usuário em toda a aplicação.
// Mantém comentários explicativos para facilitar manutenção e futuras integrações.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types';
// O AuthProvider consome o DataContext para (1) ler usuários de mock/backend e (2) injetar headers após login.
import { useData } from './DataContext';

// Interface pública do contexto de autenticação.
interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
}

// Contexto interno e hook de acesso.
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
      if (raw) {
        const parsed = JSON.parse(raw) as User;
        console.log('👤 Usuário recuperado do localStorage:', parsed.name);
        return parsed;
      }
    } catch (error) {
      console.error('Erro ao recuperar usuário:', error);
    }
    return null;
  });

  // ✅ Pega tudo que precisa NO ESCOPO DO COMPONENTE
  const { users, setAuthHeaders, reloadFromAPI, clearData, loadUserData } = useData();

  /**
   * Sincroniza headers (RBAC) e recarrega dados do backend após login.
   */
  useEffect(() => {
    if (user) {
      console.log('🔐 Injetando headers de autenticação...');
      setAuthHeaders({ 'X-User-Id': user.id, 'X-Role': user.role });
      
      // ✅ AGORA reloadFromAPI() é chamado automaticamente
      reloadFromAPI();
    } else {
      setAuthHeaders({});
    }
  }, [user, setAuthHeaders, reloadFromAPI]);

  const login = async (identifier: string, password: string) => {
    const id = identifier.trim().toLowerCase();

    let found = users.find(
      (u) => u.username?.toLowerCase() === id || u.email?.toLowerCase() === id
    );

    if (!found && users.length === 0) {
      try {
        console.log('📦 Users vazio, carregando do JSON...');
        const r = await fetch('/data/users.json');
        if (r.ok) {
          const data: User[] = await r.json();
          found = data.find(
            (u) => u.username?.toLowerCase() === id || u.email?.toLowerCase() === id
          );
        }
      } catch (error) {
        console.error('Erro ao carregar JSON:', error);
      }
    }

    const effectivePwd = (found as any)?.password;

    if (!found || effectivePwd !== password) {
      throw new Error('Usuário ou senha inválidos');
    }

    // ✅ SIMPLES: Apenas seta o usuário
    setUser(found);
    localStorage.setItem('currentUser', JSON.stringify(found));
    
    // ✅ O useEffect acima vai detectar a mudança e chamar reloadFromAPI()
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    clearData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};