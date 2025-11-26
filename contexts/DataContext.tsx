// File: contexts/DataContext.tsx
// Este é o "coração" da aplicação, atuando como um banco de dados em memória.
// Ele gerencia todos os dados (usuários, usinas, OSs), fornece funções para manipulá-los
// e usa o localStorage para persistência (via hook useLocalStorage abaixo).

// File: contexts/DataContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { OS, User, Plant, Notification, OSLog, ImageAttachment, Role } from '../types';
import { DEFAULT_PLANT_ASSETS } from '../constants';

/*const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';*/
// ✅ CORREÇÃO: Se estiver em DEV, usa o .env ou localhost:8000.
// Se estiver em PRODUÇÃO (build), usa string vazia (caminho relativo).
const API_BASE: string = import.meta.env.DEV 
    ? (import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000')
    : '';

interface AssignmentsDTO {
  coordinatorId: string | null;
  supervisorIds: string[];
  technicianIds: string[];
  assistantIds: string[];
}

interface DataContextType {
  users: User[];
  plants: Plant[];
  osList: OS[];
  notifications: Notification[];
  setAuthHeaders: (h: Record<string, string>) => void;
  reloadFromAPI: () => Promise<void>;
  clearData: () => void;
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;
  addPlant: (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO) => Promise<Plant>;
  updatePlant: (plant: Plant, assignments?: AssignmentsDTO) => Promise<void>;
  addOS: (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => Promise<void>;
  addOSBatch: (osDataList: any[]) => Promise<void>; // ✅ ADICIONADO AQUI
  updateOS: (os: OS) => Promise<void>;
  addOSLog: (osId: string, log: Omit<OSLog, 'id' | 'timestamp'>) => void;
  addOSAttachment: (osId: string, attachment: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => void;
  deleteOSAttachment: (osId: string, attachmentId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  filterOSForUser: (u: User) => OS[];
  loadUserData: () => Promise<void>; 
  deleteOSBatch: (ids: string[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(next));
        return next;
      });
    } catch { }
  }, [key]);

  return [storedValue, setValue];
};

const normalizePlant = (p: any) => ({
  ...p,
  coordinatorId: p?.coordinatorId ?? null,
  supervisorIds: Array.isArray(p?.supervisorIds) ? p.supervisorIds : [],
  technicianIds: Array.isArray(p?.technicianIds) ? p.technicianIds : [],
  assistantIds: Array.isArray(p?.assistantIds) ? p.assistantIds : [],
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [plants, setPlants] = useLocalStorage<Plant[]>('plants', []);
  const [osList, setOsList] = useLocalStorage<OS[]>('osList', []);

  const headersRef = React.useRef<Record<string, string>>({});
  const setAuthHeaders = React.useCallback((h: Record<string, string>) => {
    headersRef.current = { ...headersRef.current, ...h };
  }, []);

  const api = React.useCallback((path: string, init?: RequestInit) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = { ...(init?.headers || {}), ...headersRef.current };
    return fetch(url, { ...init, headers });
  }, []);

  const loadUserData = React.useCallback(async () => {}, []);
  const clearData = React.useCallback(() => {
    setUsers([]); setPlants([]); setOsList([]); setNotifications([]);
  }, [setUsers, setPlants, setOsList]);

  const toArray = (x: any): any[] => Array.isArray(x) ? x : (Array.isArray(x?.data) ? x.data : []);

  const reloadFromAPI = React.useCallback(async () => {
    try {
        const [u, p, o, n] = await Promise.all([
            api('/api/users').then(r => r.ok ? r.json() : []),
            api('/api/plants').then(r => r.ok ? r.json() : []),
            api('/api/os').then(r => r.ok ? r.json() : []),
            api('/api/notifications').then(r => r.ok ? r.json() : []),
        ]);
        
        const U = toArray(u);
        const P = toArray(p).map(normalizePlant);
        const O = toArray(o);
        const N = toArray(n); 

        console.log('✅ [DataContext] Dados recarregados da API');
        
        if (U.length) setUsers(U);
        if (P.length) setPlants(P);
        if (O.length) setOsList(O);
        setNotifications(N.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        
    } catch (err) {
        console.error('❌ Erro em reloadFromAPI:', err);
    }
  }, [api, setUsers, setPlants, setOsList]);

  const createNotification = async (userId: string, message: string) => {
    try {
        await api('/api/notifications', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message, read: false, timestamp: new Date().toISOString() })
        });
    } catch (e) { console.error("Erro ao criar notificação", e); }
  };

  const filterOSForUser = (u: User): OS[] => {
    if (u.role === Role.ADMIN || u.role === Role.OPERATOR) return osList;
    if (u.role === Role.COORDINATOR) {
      const myPlants = new Set(u.plantIds || []);
      return osList.filter(os => myPlants.has(os.plantId));
    }
    if (u.role === Role.SUPERVISOR) {
      const techIds = users.filter(x => x.role === Role.TECHNICIAN && x.supervisorId === u.id).map(x => x.id);
      return osList.filter(os => techIds.includes(os.technicianId));
    }
    if (u.role === Role.TECHNICIAN) return osList.filter(os => os.technicianId === u.id);
    if (u.role === Role.ASSISTANT) {
      const myPlants = new Set(u.plantIds || []);
      return osList.filter(os => myPlants.has(os.plantId));
    }
    return osList;
  };

  // --- CRUD Actions ---
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

  const addPlant = async (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO): Promise<Plant> => {
      const payload = { ...plant, ...assignments };
      const res = await api('/api/plants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved: Plant = await res.json();
      setPlants(prev => [...prev, normalizePlant(saved)]);
      await reloadFromAPI();
      return saved;
  };

  const updatePlant = async (plant: Plant, assignments?: AssignmentsDTO): Promise<void> => {
      const payload = { ...plant, coordinatorId: assignments?.coordinatorId || "", supervisorIds: assignments?.supervisorIds || [], technicianIds: assignments?.technicianIds || [], assistantIds: assignments?.assistantIds || [] };
      const res = await api(`/api/plants/${plant.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved: Plant = await res.json();
      setPlants(prev => prev.map(p => (p.id === saved.id ? normalizePlant(saved) : p)));
      await reloadFromAPI();
  };

  const addOS = async (osData: Omit<OS, 'id'|'title'|'createdAt'|'updatedAt'|'logs'|'imageAttachments'>) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10))) : 0) + 1;
    const newId = `OS${String(nextIdNumber).padStart(4, '0')}`;
    
    // ✅ CORREÇÃO: Definindo newTitle aqui para usar embaixo
    const newTitle = `${newId} - ${osData.activity}`; 

    const payload: OS = {
      ...osData,
      id: newId,
      title: newTitle, // Usando a variável
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
    
    // Agora a variável existe e o erro sumirá
    if (osData.supervisorId) createNotification(osData.supervisorId, `Nova OS "${newTitle}" criada.`);
    if (osData.technicianId) createNotification(osData.technicianId, `Você foi atribuído à nova OS "${newTitle}".`);
  };

  // ✅ FUNÇÃO BATCH CORRETA
  const addOSBatch = async (osDataList: any[]) => {
      try {
          const payloads = osDataList.map(d => ({
              ...d,
              id: "TEMP", 
              title: "TEMP",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              logs: [],
              imageAttachments: []
          }));

          await api('/api/os/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payloads)
          });
          
          await reloadFromAPI();
      } catch (e) {
          console.error(e);
      }
  };

  const updateOS = async (updatedOS: OS) => {
    const finalOS = { ...updatedOS, title: `${updatedOS.id} - ${updatedOS.activity}`, updatedAt: new Date().toISOString() };
    const res = await api(`/api/os/${finalOS.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(finalOS) });
    if (!res.ok) throw new Error();
    const saved: OS = await res.json();
    setOsList(prev => prev.map(os => (os.id === saved.id ? saved : os)));
  };

  const addOSLog = (osId: string, log: Omit<OSLog, 'id'|'timestamp'>) => {
    const newLog: OSLog = { ...log, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, logs: [newLog, ...os.logs] } : os)));
    const os = osList.find(o => o.id === osId);
    if (os) {
      const msg = `Novo comentário na OS "${os.title}".`;
      createNotification(os.supervisorId, msg);
    }
  };

  const addOSAttachment = (osId: string, att: Omit<ImageAttachment, 'id'|'uploadedAt'>) => {
    const newAtt: ImageAttachment = { ...att, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: [newAtt, ...os.imageAttachments] } : os)));
  };

  const deleteOSAttachment = (osId: string, attId: string) => {
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: os.imageAttachments.filter(a => a.id !== attId) } : os)));
  };

  const markNotificationAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try { await api(`/api/notifications/${id}/read`, { method: 'PUT' }); } catch (e) { console.error(e); }
  };

  const deleteOSBatch = async (ids: string[]) => {
    try {
        await api('/api/os/batch', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids) });
        setOsList(prev => prev.filter(os => !ids.includes(os.id)));
    } catch (error) { console.error("Erro ao excluir OSs em massa:", error); }
  };

  return (
    <DataContext.Provider value={{
      users, plants, osList, notifications,
      setAuthHeaders, reloadFromAPI, loadUserData, clearData,
      addUser, updateUser, deleteUser,
      addPlant, updatePlant,
      addOS, addOSBatch, updateOS, // ✅ EXPORTADO AQUI
      addOSLog, addOSAttachment, deleteOSAttachment,
      filterOSForUser, markNotificationAsRead, deleteOSBatch,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};
export { useData as default };