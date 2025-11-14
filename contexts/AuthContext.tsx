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
  // Estado do usuário autenticado com persistência em localStorage.
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('currentUser');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const didReloadRef = React.useRef<string | null>(null);

  // Acesso ao DataContext: lista de usuários e função para injetar headers para RBAC.
  const { users, setAuthHeaders, reloadFromAPI } = useData();

  /**
 * Sincroniza headers (RBAC) e recarrega dados do backend após login.
 * - setAuthHeaders atualiza o headersRef do DataContext imediatamente.
 * - reloadFromAPI busca /api/users|plants|os já com X-User-Id/X-Role,
 *   garantindo que os modais abram com os JSONs reais.
 */
useEffect(() => {
  if (user) {
    setAuthHeaders({ 'X-User-Id': user.id, 'X-Role': user.role });
    reloadFromAPI();
  } else {
    setAuthHeaders({});
  }
}, [user, setAuthHeaders, reloadFromAPI]);

  /**
   * Realiza login usando identificador (usuário ou e‑mail) e senha.
   * 1) Tenta encontrar o usuário no estado do DataContext.
   * 2) Faz fallback para a API caso a lista local esteja vazia.
   * 3) Compara senha simples (mock); em produção, usar fluxo seguro.
   * 4) Em caso de sucesso, atualiza `user` e injeta headers.
   */
  const login = async (identifier: string, password: string) => {
    const id = identifier.trim().toLowerCase();

    // 1) tenta no estado atual
    let found = users.find(
        (u) => u.username?.toLowerCase() === id || u.email?.toLowerCase() === id
    );

    // 2) fallback para API se não achar
    if (!found) {
        try {
        const r = await fetch('/api/users');
        if (r.ok) {
            const data: User[] = await r.json();
            found = data.find(
            (u) => u.username?.toLowerCase() === id || u.email?.toLowerCase() === id
            );
        }
        } catch {
        // silencioso
        }
    }

    // 3) senha vinda do mock quando o objeto não tem 'password'
    const mockPwdById: Record<string, string> = {
        'admin': 'admin', 'admin@admin.com': 'admin',
        'maria': '123', 'maria@supervisor.com': '123',
        'ana': '123', 'ana@supervisor.com': '123',
        'carlos': '123', 'carlos@technician.com': '123',
        'joao': '123', 'joao@technician.com': '123',
        'pedro': '123', 'pedro@technician.com': '123',
        'luiza': '123', 'luiza@operator.com': '123',
    };

    const candidateId =
        id ||
        found?.email?.toLowerCase() ||
        found?.username?.toLowerCase() ||
        '';

    const effectivePwd =
        (found as any)?.password ??
        mockPwdById[candidateId];

    if (!found || effectivePwd !== password) {
        throw new Error('Usuário ou senha inválidos');
    }

    setUser(found);
    };

  // Realiza logout limpando estado e headers.
  const logout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};