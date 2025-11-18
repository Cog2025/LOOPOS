// File: contexts/DataContext.tsx
// Este é o "coração" da aplicação, atuando como um banco de dados em memória.
// Ele gerencia todos os dados (usuários, usinas, OSs), fornece funções para manipulá-los
// e usa o localStorage para persistência (via hook useLocalStorage abaixo).

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OS, User, Plant, Notification, OSLog, ImageAttachment, Role } from '../types';
import { DEFAULT_PLANT_ASSETS } from '../constants';
//import { useAuth } from './AuthContext';
// --- DADOS DE EXEMPLO (MOCK DATA) ---
// Estes dados são usados para popular a aplicação inicialmente, facilitando o desenvolvimento e testes.
// Observação: você pode acrescentar usuários COORDINATOR/ASSISTANT aqui se desejar testá-los.

  
const API_BASE: string =
    (import.meta as any).env?.VITE_API_TARGET ||
    (import.meta as any).env?.VITE_API_BASE ||
    'http://127.0.0.1:8000';

const SEED = (import.meta as any).env?.VITE_SEED_MOCKS === 'true';

const initialUsers: User[] = [
  { id: 'user-1', name: 'Admin User',     username: 'admin',  email: 'admin@admin.com',     password: 'admin', phone: '111', role: Role.ADMIN },
  { id: 'user-2', name: 'Maria Oliveira',  username: 'maria',  email: 'maria@supervisor.com', password: '123',   phone: '222', role: Role.SUPERVISOR, plantIds: ['plant-1', 'plant-2'] },
  { id: 'user-3', name: 'Carlos Souza',    username: 'carlos', email: 'carlos@technician.com',password: '123',   phone: '333', role: Role.TECHNICIAN, plantIds: ['plant-1'], supervisorId: 'user-2' },
  { id: 'user-4', name: 'João Pereira',    username: 'joao',   email: 'joao@technician.com',  password: '123',   phone: '444', role: Role.TECHNICIAN, plantIds: ['plant-2'], supervisorId: 'user-2' },
  { id: 'user-5', name: 'Ana Costa',       username: 'ana',    email: 'ana@supervisor.com',   password: '123',   phone: '555', role: Role.SUPERVISOR, plantIds: ['plant-3'] },
  { id: 'user-6', name: 'Pedro Lima',      username: 'pedro',  email: 'pedro@technician.com', password: '123',   phone: '667', role: Role.TECHNICIAN, plantIds: ['plant-3'], supervisorId: 'user-5' },
  { id: 'user-7', name: 'Luiza Fernandes', username: 'luiza',  email: 'luiza@operator.com',   password: '123',   phone: '777', role: Role.OPERATOR },
];

// Mock de plantas (mantido para eventual fallback local)
const initialPlants: Plant[] = [
  { id: 'plant-1', client: 'Cliente A', name: 'UFV Solar I',  subPlants: [{ id: 1, inverterCount: 10 }], stringCount: 100, trackerCount: 50,  assets: DEFAULT_PLANT_ASSETS },
  { id: 'plant-2', client: 'Cliente B', name: 'UFV Solar II', subPlants: [{ id: 1, inverterCount: 15 }], stringCount: 150, trackerCount: 75,  assets: DEFAULT_PLANT_ASSETS.slice(0, 10) },
  { id: 'plant-3', client: 'Cliente C', name: 'UFV Solar III',subPlants: [{ id: 1, inverterCount: 20 }], stringCount: 200, trackerCount: 100, assets: DEFAULT_PLANT_ASSETS },
];

interface AssignmentsDTO {
  coordinatorId: string | null;
  supervisorIds: string[];
  technicianIds: string[];
  assistantIds: string[];
}

// Inicia sem Ordens de Serviço, para que o usuário possa criar as suas.
const initialOS: OS[] = [];
const initialNotifications: Notification[] = [];

// --- CONTEXTO ---
// Define a estrutura do objeto que o DataContext fornecerá aos seus consumidores.
interface DataContextType {
  users: User[];
  plants: Plant[];
  osList: OS[];
  notifications: Notification[];
  setAuthHeaders: (h: Record<string, string>) => void;
  reloadFromAPI: () => Promise<void>;
  loadUserData: () => Promise<void>;
  clearData: () => void;  // ← ADICIONE ISSO
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  addPlant: (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO) => Promise<Plant>;
  updatePlant: (plant: Plant, assignments?: AssignmentsDTO) => Promise<void>;
  addOS: (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => Promise<void>;
  updateOS: (os: OS) => Promise<void>;
  addOSLog: (osId: string, log: Omit<OSLog, 'id' | 'timestamp'>) => void;
  addOSAttachment: (osId: string, attachment: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => void;
  deleteOSAttachment: (osId: string, attachmentId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  filterOSForUser: (u: User) => OS[];
}

// Cria o contexto.
const DataContext = createContext<DataContextType | undefined>(undefined);

/**
 * Hook customizado para abstrair a lógica de ler e salvar dados no localStorage.
 * @param key Chave usada no localStorage.
 * @param initialValue Valor inicial se não houver nada salvo.
 */
// Persistência de cache local (mesmo hook que você já tinha)
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const next = value instanceof Function ? value(storedValue) : value;
      setStoredValue(next);
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // no-op
    }
  };
  return [storedValue, setValue];
};

const normalizePlant = (p: any) => ({
  ...p,
  coordinatorId: p?.coordinatorId ?? null,
  supervisorIds: Array.isArray(p?.supervisorIds) ? p.supervisorIds : [],
  technicianIds: Array.isArray(p?.technicianIds) ? p.technicianIds : [],
  assistantIds: Array.isArray(p?.assistantIds) ? p.assistantIds : [],
});


/**
 * DataProvider é o componente que gerencia e fornece todos os dados da aplicação.
 * Ele persiste os dados no localStorage por "tabela" (users, plants, osList, notifications).
 * IMPORTANTE: Hooks (useAuth, etc.) e funções que dependem de setState DEVEM ficar dentro do Provider.
 */
export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [plants, setPlants] = useLocalStorage<Plant[]>('plants', []);
  const [osList, setOsList] = useLocalStorage<OS[]>('osList', []);
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);

  // ✅ loadUserData - carrega dados APÓS login
  const loadUserData = React.useCallback(async () => {
    try {
      const [usersRes, plantsRes, osRes] = await Promise.all([
        fetch('/data/users.json'),
        fetch('/data/plants.json'),
        fetch('/data/os.json'),
      ]);

      if (usersRes.ok) {
        const U = await usersRes.json();
        console.log('✅ Dados carregados após login');
        setUsers(U);
      }
      if (plantsRes.ok) {
        const P = (await plantsRes.json()).map(normalizePlant);
        setPlants(P);
      }
      if (osRes.ok) {
        const O = await osRes.json();
        setOsList(O);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, [setUsers, setPlants, setOsList]); // ← Dependências

  // ✅ clearData - FORA de loadUserData e com indentação correta
  const clearData = React.useCallback(() => {
    setUsers([]);
    setPlants([]);
    setOsList([]);
    setNotifications([]);
  }, [setUsers, setPlants, setOsList, setNotifications]);

  const headersRef = React.useRef<Record<string, string>>({});
  const setAuthHeaders = React.useCallback((h: Record<string, string>) => {
    headersRef.current = { ...headersRef.current, ...h };
  }, []);

  const api = React.useCallback((path: string, init?: RequestInit) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = { ...(init?.headers || {}), ...headersRef.current };
    return fetch(url, { ...init, headers });
  }, []);

  const waitHealth = React.useCallback(async () => {
    try { const r = await api('/api/health'); return r.ok; } catch { return false; }
  }, [api]);

  const toArray = (x: any): any[] =>
    Array.isArray(x) ? x :
    Array.isArray(x?.items) ? x.items :
    Array.isArray(x?.results) ? x.results :
    Array.isArray(x?.data) ? x.data : [];

  const reloadFromAPI = React.useCallback(async () => {
    try {
        const [u, p, o] = await Promise.all([
        api('/api/users').then(r => r.ok ? r.json() : []),
        api('/api/plants').then(r => r.ok ? r.json() : []),  // ✅ Pega do backend
        api('/api/os').then(r => r.ok ? r.json() : []),
        ]);
        const U = toArray(u);
        const P = toArray(p).map(normalizePlant);  // ✅ Normaliza
        const O = toArray(o);

        if (U.length) setUsers(() => U);
        if (P.length) setPlants(() => P);  // ✅ Salva no estado
        if (O.length) setOsList(() => O);
    } catch {
        /* mantém estado atual */
    }
    }, [api]);

  const createNotification = (userId: string, message: string) => {
    const n: Notification = { id: `notif-${Date.now()}`, userId, message, read: false, timestamp: new Date().toISOString() };
    setNotifications(prev => [n, ...prev]);
  };

  const filterOSForUser = (u: User): OS[] => {
    if (u.role === Role.ADMIN || u.role === Role.OPERATOR) return osList;
    if (u.role === Role.COORDINATOR) {
      const myPlants = new Set(u.plantIds || []);
      return osList.filter(os => myPlants.has(os.plantId));
    }
    if (u.role === Role.SUPERVISOR) {
      const techIds = users
        .filter(x => x.role === Role.TECHNICIAN && x.supervisorId === u.id)
        .map(x => x.id);
      return osList.filter(os => techIds.includes(os.technicianId));
    }
    if (u.role === Role.TECHNICIAN) return osList.filter(os => os.technicianId === u.id);
    if (u.role === Role.ASSISTANT) {
      const myPlants = new Set(u.plantIds || []);
      return osList.filter(os => myPlants.has(os.plantId));
    }
    return osList;
  };

  // CRUD Users, Plants, OS... (resto do código igual)
  const addUser = async (u: Omit<User, 'id'>) => {
    const res = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Falha ao criar usuário');
    const saved: User = await res.json();
    setUsers(prev => [...prev, saved]);
    return saved;
  };

  const updateUser = async (u: User) => {
    const res = await api(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Falha ao atualizar usuário');
    const saved: User = await res.json();
    setUsers(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    return saved;
  };

  const deleteUser = async (id: string) => {
    const res = await api(`/api/users/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao excluir usuário');
    setUsers(prev => prev.filter(x => x.id !== id));
  };

  const putAssignments = async (plantId: string, a: AssignmentsDTO) => {
    try {
      await api(`/api/plants/${plantId}/assignments`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(a) });
      setUsers(prev => prev.map(u => {
        const list = new Set(u.plantIds || []);
        const inAssign = u.id === a.coordinatorId || a.supervisorIds.includes(u.id) || a.technicianIds.includes(u.id) || a.assistantIds.includes(u.id);
        if (inAssign) list.add(plantId); else list.delete(plantId);
        return { ...u, plantIds: Array.from(list) };
      }));
    } catch {
      // fallback silencioso
    }
  };

  const addPlant = async (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO): Promise<Plant> => {
    try {
      const res = await api('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plant),
      });
      if (!res.ok) throw new Error();
      const saved: Plant = await res.json();
      setPlants(prev => [...prev, normalizePlant(saved)]);
      if (assignments) {
        await putAssignments(saved.id, {
          coordinatorId: assignments.coordinatorId ?? null,
          supervisorIds: assignments.supervisorIds || [],
          technicianIds: assignments.technicianIds || [],
          assistantIds: assignments.assistantIds || [],
        });
      }
      return saved;
    } catch {
      const local: Plant = { ...plant, id: `plant-${Date.now()}` } as Plant;
      setPlants(prev => [...prev, normalizePlant(local)]);
      return local;
    }
  };

  const updatePlant = async (plant: Plant, assignments?: AssignmentsDTO): Promise<void> => {
    try {
      const res = await api(`/api/plants/${plant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plant),
      });
      if (!res.ok) throw new Error();
      const saved: Plant = await res.json();
      setPlants(prev => prev.map(p => (p.id === saved.id ? normalizePlant(saved) : p)));
      if (assignments) {
        await putAssignments(saved.id, {
          coordinatorId: assignments.coordinatorId ?? null,
          supervisorIds: assignments.supervisorIds || [],
          technicianIds: assignments.technicianIds || [],
          assistantIds: assignments.assistantIds || [],
        });
      }
    } catch {
      setPlants(prev => prev.map(p => (p.id === plant.id ? normalizePlant(plant) : p)));
    }
  };

  const addOS = async (osData: Omit<OS, 'id'|'title'|'createdAt'|'updatedAt'|'logs'|'imageAttachments'>) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10))) : 0) + 1;
    const newId = `OS${String(nextIdNumber).padStart(4, '0')}`;
    const newTitle = `${newId} - ${osData.activity}`;
    const payload: OS = {
      ...osData,
      id: newId,
      title: newTitle,
      createdAt: now,
      updatedAt: now,
      attachmentsEnabled: true,
      logs: [],
      imageAttachments: []
    };
    try {
      const res = await api('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved: OS = await res.json();
      setOsList(prev => [saved, ...prev]);
    } catch {
      setOsList(prev => [payload, ...prev]);
    }
    if (osData.supervisorId) createNotification(osData.supervisorId, `Nova OS "${newTitle}" criada.`);
    if (osData.technicianId) createNotification(osData.technicianId, `Você foi atribuído à nova OS "${newTitle}".`);
  };

  const updateOS = async (updatedOS: OS) => {
    const finalOS = { ...updatedOS, title: `${updatedOS.id} - ${updatedOS.activity}`, updatedAt: new Date().toISOString() };
    try {
      const res = await api(`/api/os/${finalOS.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalOS) });
      if (!res.ok) throw new Error();
      const saved: OS = await res.json();
      setOsList(prev => prev.map(os => (os.id === saved.id ? saved : os)));
    } catch {
      setOsList(prev => prev.map(os => (os.id === finalOS.id ? finalOS : os)));
    }
  };

  const addOSLog = (osId: string, log: Omit<OSLog, 'id'|'timestamp'>) => {
    const newLog: OSLog = { ...log, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, logs: [newLog, ...os.logs] } : os)));
    const os = osList.find(o => o.id === osId);
    if (os) {
      const author = users.find(u => u.id === log.authorId);
      const msg = `${author?.name || 'Usuário'} adicionou um comentário à OS "${os.title}".`;
      createNotification(os.supervisorId, msg);
      if (log.statusChange) createNotification(os.supervisorId, `O status da OS "${os.title}" foi alterado para ${log.statusChange.to}.`);
    }
  };

  const addOSAttachment = (osId: string, att: Omit<ImageAttachment, 'id'|'uploadedAt'>) => {
    const newAtt: ImageAttachment = { ...att, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: [newAtt, ...os.imageAttachments] } : os)));
  };

  const deleteOSAttachment = (osId: string, attId: string) => {
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: os.imageAttachments.filter(a => a.id !== attId) } : os)));
  };

  const markNotificationAsRead = (id: string) =>
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));

  // ✅ RETURN do Provider
  return (
    <DataContext.Provider value={{
      users, plants, osList, notifications,
      setAuthHeaders,
      reloadFromAPI,
      loadUserData,
      clearData,
      addUser, updateUser, deleteUser,
      addPlant, updatePlant,
      addOS, updateOS, addOSLog, addOSAttachment, deleteOSAttachment,
      filterOSForUser, markNotificationAsRead,
    }}>
      {children}
    </DataContext.Provider>
  );
};

// Hook de acesso ao contexto (mantido e documentado).
export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};

// Exporta também como default para compatibilidade com imports existentes.
export { useData as default };