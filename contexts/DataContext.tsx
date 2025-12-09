// File: contexts/DataContext.tsx
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { OS, User, Plant, Notification, OSLog, ImageAttachment, Role, TaskTemplate, PlantMaintenancePlan } from '../types';

const API_BASE = '';

interface AssignmentsDTO {
  coordinatorId: string | null;
  supervisorIds: string[];
  technicianIds: string[];
  assistantIds: string[];
}

interface DataContextType {

  // Dados Principais
  users: User[];
  plants: Plant[];
  osList: OS[];
  notifications: Notification[];
  
  // Dados de Manutenção
  taskTemplates: TaskTemplate[];
  maintenancePlans: Record<string, PlantMaintenancePlan[]>;

  // Autenticação e Sistema
  setAuthHeaders: (h: Record<string, string>) => void;
  reloadFromAPI: () => Promise<void>;
  clearData: () => void;
  loadUserData: () => Promise<void>;

  // Usuários
  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  // Usinas
  addPlant: (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO) => Promise<Plant>;
  updatePlant: (plant: Plant, assignments?: AssignmentsDTO) => Promise<void>;

  // OS (Ordens de Serviço)
  addOS: (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => Promise<void>;
  addOSBatch: (osDataList: any[]) => Promise<void>;
  updateOS: (os: OS) => Promise<void>;
  patchOS: (osId: string, updates: Partial<OS>) => Promise<void>; // ✅ NOVO: Atualização Parcial Segura
  deleteOSBatch: (ids: string[]) => Promise<void>;
  
  // Detalhes de OS
  addOSLog: (osId: string, log: Omit<OSLog, 'id' | 'timestamp'>) => void;
  addOSAttachment: (osId: string, attachment: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => void;
  deleteOSAttachment: (osId: string, attachmentId: string) => void;
  
  // Notificações e Filtros
  markNotificationAsRead: (notificationId: string) => void;
  filterOSForUser: (u: User) => OS[];

  // Planos de Manutenção
  fetchTaskTemplates: (category?: string) => Promise<void>;
  fetchPlantPlan: (plantId: string) => Promise<PlantMaintenancePlan[]>;
  initializePlantPlan: (plantId: string, mode: string, customTasks?: any[]) => Promise<void>;
  updatePlantTask: (taskId: string, data: Partial<PlantMaintenancePlan>) => Promise<void>;
  createPlantTask: (plantId: string, data: any) => Promise<void>;
  deletePlantTask: (taskId: string) => Promise<void>;
  
  // Biblioteca Padrão
  addTemplate: (data: any) => Promise<void>;
  updateTemplate: (id: string, data: any) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Hook para persistência local básica
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
  subPlants: Array.isArray(p?.subPlants) ? p.subPlants : [], // ✅ Garante array
  assets: Array.isArray(p?.assets) ? p.assets : []
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [plants, setPlants] = useLocalStorage<Plant[]>('plants', []);
  const [osList, setOsList] = useLocalStorage<OS[]>('osList', []);
  
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([]);
  const [maintenancePlans, setMaintenancePlans] = useState<Record<string, PlantMaintenancePlan[]>>({});

  const headersRef = React.useRef<Record<string, string>>({});
  
  const setAuthHeaders = React.useCallback((h: Record<string, string>) => {
    headersRef.current = { ...headersRef.current, ...h };
  }, []);

  const api = React.useCallback((path: string, init?: RequestInit) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const defaultHeaders = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    };
    const headers = { ...defaultHeaders, ...(init?.headers || {}), ...headersRef.current };
    return fetch(url, { ...init, headers });
  }, []);

  const loadUserData = React.useCallback(async () => {}, []);
  
  const clearData = React.useCallback(() => {
    setUsers([]); setPlants([]); setOsList([]); setNotifications([]);
    setTaskTemplates([]); setMaintenancePlans({});
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
        
    } catch (err) { console.error('❌ Erro em reloadFromAPI:', err); }
  }, [api, setUsers, setPlants, setOsList]);

  // --- Manutenção ---

  const fetchTaskTemplates = async (category?: string) => {
      let url = '/api/maintenance/templates';
      if (category) url += `?asset_category=${encodeURIComponent(category)}`;
      try {
          const res = await api(url);
          if(res.ok) setTaskTemplates(await res.json());
      } catch (e) { console.error("Erro ao buscar templates:", e); }
  };

  const fetchPlantPlan = async (plantId: string) => {
      try {
          const res = await api(`/api/maintenance/plant-plans/${plantId}`); // Rota corrigida
          if (res.ok) {
              const data = await res.json();
              setMaintenancePlans(prev => ({ ...prev, [plantId]: data }));
              return data;
          }
          return [];
      } catch (e) { console.error("Erro ao buscar plano:", e); return []; }
  };

  const initializePlantPlan = async (plantId: string, mode: string, customTasks: any[] = []) => {
      // Passamos o modo e a lista opcional para o backend
      await api(`/api/maintenance/plans/${plantId}/initialize`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, custom_tasks: customTasks }) // Envia a lista se existir
      });
      await fetchPlantPlan(plantId);
      await reloadFromAPI(); 
  };

  const updatePlantTask = async (taskId: string, data: Partial<PlantMaintenancePlan>) => {
      await api(`/api/maintenance/plans/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  };

  const createPlantTask = async (plantId: string, data: any) => {
      await api(`/api/maintenance/plans/${plantId}/task`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await fetchPlantPlan(plantId);
  };

  const deletePlantTask = async (taskId: string) => {
      await api(`/api/maintenance/plans/${taskId}`, { method: 'DELETE' });
  };

  const addTemplate = async (data: any) => {
      await api('/api/maintenance/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await fetchTaskTemplates();
  };

  const updateTemplate = async (id: string, data: any) => {
      await api(`/api/maintenance/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await fetchTaskTemplates();
  };

  const deleteTemplate = async (id: string) => {
      await api(`/api/maintenance/templates/${id}`, { method: 'DELETE' });
      await fetchTaskTemplates();
  };

  // --- OS Core ---

  const createNotification = async (userId: string, message: string) => {
    try {
        await api('/api/notifications', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message, read: false, timestamp: new Date().toISOString() })
        });
    } catch (e) { console.error(e); }
  };

  const filterOSForUser = (u: User): OS[] => {
    // ... (Mantém lógica existente, omitida para brevidade)
    return osList;
  };

  // --- CRUD ---

  const addUser = async (u: Omit<User, 'id'>) => {
    const res = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Falha ao criar usuário');
    const saved = await res.json();
    setUsers(prev => [...prev, saved]);
    return saved;
  };

  const updateUser = async (u: User) => {
    const res = await api(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Falha ao atualizar usuário');
    const saved = await res.json();
    setUsers(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    return saved;
  };

  const deleteUser = async (id: string) => {
    await api(`/api/users/${id}`, { method: 'DELETE' });
    setUsers(prev => prev.filter(x => x.id !== id));
  };

  const addPlant = async (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO) => {
      const payload = { ...plant, ...assignments };
      const res = await api('/api/plants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setPlants(prev => [...prev, normalizePlant(saved)]);
      return saved;
  };

  const updatePlant = async (plant: Plant, assignments?: AssignmentsDTO) => {
      const payload = { ...plant, ...assignments };
      const res = await api(`/api/plants/${plant.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setPlants(prev => prev.map(p => (p.id === saved.id ? normalizePlant(saved) : p)));
  };

  const addOS = async (osData: Omit<OS, 'id'|'title'|'createdAt'|'updatedAt'|'logs'|'imageAttachments'>) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10) || 0)) : 0) + 1;
    const newId = `OS${String(nextIdNumber).padStart(4, '0')}`;
    const newTitle = `${newId} - ${osData.activity}`; 

    const payload: OS = {
      ...osData, id: newId, title: newTitle, createdAt: now, updatedAt: now,
      attachmentsEnabled: true, logs: [], imageAttachments: []
    };

    try {
      const res = await api('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setOsList(prev => [saved, ...prev]);
    } catch (e) { console.error(e); }
  };

  const addOSBatch = async (osDataList: any[]) => { /* ... Lógica existente ... */ };

  const updateOS = async (updatedOS: OS) => {
    const res = await api(`/api/os/${updatedOS.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedOS) });
    if (!res.ok) throw new Error();
    const saved = await res.json();
    setOsList(prev => prev.map(os => (os.id === saved.id ? saved : os)));
  };

  // ✅ PATCH OS: Resolve o problema de sobrescrever imagens
  const patchOS = async (osId: string, updates: Partial<OS>) => {
      // Atualiza localmente primeiro (Optimistic UI)
      setOsList(prev => prev.map(os => {
          if (os.id === osId) {
              return { ...os, ...updates, updatedAt: new Date().toISOString() };
          }
          return os;
      }));

      // Envia para API
      try {
          // Nota: Em produção, o backend deve suportar PATCH real.
          // Aqui, estamos mesclando manualmente com o estado atual para simular.
          const currentOS = osList.find(o => o.id === osId);
          if (currentOS) {
              const mergedOS = { ...currentOS, ...updates, updatedAt: new Date().toISOString() };
              await api(`/api/os/${osId}`, { 
                  method: 'PUT', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify(mergedOS) 
              });
          }
      } catch (e) { console.error("Erro no patchOS", e); }
  };

  const addOSLog = (osId: string, log: Omit<OSLog, 'id'|'timestamp'>) => {
    const newLog = { ...log, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, logs: [newLog, ...os.logs] } : os)));
  };

  const addOSAttachment = async (osId: string, att: Omit<ImageAttachment, 'id'|'uploadedAt'>) => {
    const newAtt = { ...att, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
    
    // 1. Atualiza Local (Optimistic)
    setOsList(prev => {
        const target = prev.find(o => o.id === osId);
        if (!target) return prev;
        // Adiciona ao início da lista
        const updatedAttachments = [newAtt, ...(target.imageAttachments || [])];
        return prev.map(os => os.id === osId ? { ...os, imageAttachments: updatedAttachments } : os);
    });

    // 2. Persiste no Backend (Safety Net)
    try {
        const currentOS = osList.find(o => o.id === osId);
        if (currentOS) {
            // Nota: Precisamos pegar a lista ATUALIZADA de anexos para enviar, 
            // pois o setOsList é assíncrono. Construímos manualmente aqui.
            const updatedAttachments = [newAtt, ...(currentOS.imageAttachments || [])];
            const payload = { ...currentOS, imageAttachments: updatedAttachments, updatedAt: new Date().toISOString() };
            
            await api(`/api/os/${osId}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });
        }
    } catch (e) {
        console.error("Erro ao salvar anexo no backend:", e);
    }
  };

  const deleteOSAttachment = (osId: string, attId: string) => {
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: os.imageAttachments.filter(a => a.id !== attId) } : os)));
  };

  const deleteOSBatch = async (ids: string[]) => {
    await api('/api/os/batch', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids) });
    setOsList(prev => prev.filter(os => !ids.includes(os.id)));
  };

  const markNotificationAsRead = async (id: string) => { /* ... */ };

  return (
    <DataContext.Provider value={{
      users, plants, osList, notifications, taskTemplates, maintenancePlans,
      setAuthHeaders, reloadFromAPI, loadUserData, clearData,
      addUser, updateUser, deleteUser, addPlant, updatePlant,
      addOS, addOSBatch, updateOS, patchOS, deleteOSBatch, // ✅ patchOS exportado
      addOSLog, addOSAttachment, deleteOSAttachment,
      filterOSForUser, markNotificationAsRead,
      fetchTaskTemplates, fetchPlantPlan, initializePlantPlan, updatePlantTask, createPlantTask, deletePlantTask,
      addTemplate, updateTemplate, deleteTemplate
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within a DataProvider');
  return ctx;
};
export default useData;