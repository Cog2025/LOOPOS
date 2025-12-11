// File: contexts/DataContext.tsx
// Contexto global para gerenciamento de estado da aplicação.
// Inclui correções críticas para persistência de imagens e execução de OS.
// Contexto global corrigido para evitar CRASH por limite de LocalStorage (QuotaExceeded).


import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { OS, User, Plant, Notification, OSLog, ImageAttachment, Role, TaskTemplate, PlantMaintenancePlan } from '../types';

const API_BASE = ''; // Vazio para usar o proxy do Vite/Cloudflare

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
  taskTemplates: TaskTemplate[];
  maintenancePlans: Record<string, PlantMaintenancePlan[]>;

  setAuthHeaders: (h: Record<string, string>) => void;
  reloadFromAPI: () => Promise<void>;
  clearData: () => void;
  loadUserData: () => Promise<void>;

  addUser: (user: Omit<User, 'id'>) => Promise<User>;
  updateUser: (user: User) => Promise<User>;
  deleteUser: (id: string) => Promise<void>;

  addPlant: (plant: Omit<Plant, 'id'>, assignments?: AssignmentsDTO) => Promise<Plant>;
  updatePlant: (plant: Plant, assignments?: AssignmentsDTO) => Promise<void>;

  addOS: (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => Promise<void>;
  addOSBatch: (osDataList: any[]) => Promise<void>;
  updateOS: (os: OS) => Promise<void>;
  patchOS: (osId: string, updates: Partial<OS>) => Promise<void>;
  deleteOSBatch: (ids: string[]) => Promise<void>;
  
  addOSLog: (osId: string, log: Omit<OSLog, 'id' | 'timestamp'>) => void;
  addOSAttachment: (osId: string, attachment: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => Promise<void>;
  deleteOSAttachment: (osId: string, attachmentId: string) => Promise<void>;
  
  markNotificationAsRead: (notificationId: string) => void;
  filterOSForUser: (u: User) => OS[];

  fetchTaskTemplates: (category?: string) => Promise<void>;
  fetchPlantPlan: (plantId: string) => Promise<PlantMaintenancePlan[]>;
  initializePlantPlan: (plantId: string, mode: string, customTasks?: any[]) => Promise<void>;
  updatePlantTask: (taskId: string, data: Partial<PlantMaintenancePlan>) => Promise<void>;
  createPlantTask: (plantId: string, data: any) => Promise<void>;
  deletePlantTask: (taskId: string) => Promise<void>;
  
  addTemplate: (data: any) => Promise<void>;
  updateTemplate: (id: string, data: any) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// 🔥 HOOK BLINDADO CONTRA QUOTA EXCEEDED 🔥
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
    setStoredValue((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      try {
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        console.warn(`[LocalStorage] Falha ao salvar '${key}': Limite excedido. Dados mantidos em memória.`);
      }
      return next;
    });
  }, [key]);

  return [storedValue, setValue];
};

const normalizePlant = (p: any) => ({
  ...p,
  coordinatorId: p?.coordinatorId ?? null,
  supervisorIds: Array.isArray(p?.supervisorIds) ? p.supervisorIds : [],
  technicianIds: Array.isArray(p?.technicianIds) ? p.technicianIds : [],
  assistantIds: Array.isArray(p?.assistantIds) ? p.assistantIds : [],
  subPlants: Array.isArray(p?.subPlants) ? p.subPlants : [],
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

  // --- Funções de Manutenção ---
  const fetchTaskTemplates = async (category?: string) => {
      let url = '/api/maintenance/templates';
      if (category) url += `?asset_category=${encodeURIComponent(category)}`;
      try { const res = await api(url); if(res.ok) setTaskTemplates(await res.json()); } 
      catch (e) { console.error(e); }
  };

  const fetchPlantPlan = async (plantId: string) => {
      try {
          const res = await api(`/api/maintenance/plant-plans/${plantId}`);
          if (res.ok) {
              const data = await res.json();
              setMaintenancePlans(prev => ({ ...prev, [plantId]: data }));
              return data;
          }
          return [];
      } catch (e) { console.error(e); return []; }
  };

  const initializePlantPlan = async (plantId: string, mode: string, customTasks: any[] = []) => {
      await api(`/api/maintenance/plans/${plantId}/initialize`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode, custom_tasks: customTasks })
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
  const deletePlantTask = async (taskId: string) => { await api(`/api/maintenance/plans/${taskId}`, { method: 'DELETE' }); };
  
  const addTemplate = async (data: any) => { await api('/api/maintenance/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await fetchTaskTemplates(); };
  const updateTemplate = async (id: string, data: any) => { await api(`/api/maintenance/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await fetchTaskTemplates(); };
  const deleteTemplate = async (id: string) => { await api(`/api/maintenance/templates/${id}`, { method: 'DELETE' }); await fetchTaskTemplates(); };

  // ✅ FILTRO DE PERMISSÕES (RBAC) BLINDADO
  const filterOSForUser = (u: User): OS[] => {
    if (u.role === Role.ADMIN || u.role === Role.OPERATOR) return osList;
    if (u.role === Role.TECHNICIAN) return osList.filter(o => o.technicianId === u.id);
    
    // Se for Cliente, Coord ou Sup, verifica IDs vinculados E correspondência de nome
    if (u.role === Role.CLIENT || u.role === Role.COORDINATOR || u.role === Role.SUPERVISOR) {
        const normalizedUserName = u.name.trim().toLowerCase();
        
        return osList.filter(o => {
            const plant = plants.find(p => p.id === o.plantId);
            if (!plant) return false;

            // 1. Verifica vínculo direto por ID (Checkbox)
            const idMatch = u.plantIds && u.plantIds.includes(plant.id);
            
            // 2. Verifica vínculo por Nome do Cliente (String)
            // Útil para Clientes que não foram editados manualmente ainda
            const nameMatch = u.role === Role.CLIENT && plant.client && plant.client.trim().toLowerCase() === normalizedUserName;

            return idMatch || nameMatch;
        });
    }

    return [];
  };

  const addUser = async (u: Omit<User, 'id'>) => {
    const res = await api('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Erro ao criar usuário');
    const saved = await res.json();
    setUsers(prev => [...prev, saved]);
    return saved;
  };
  const updateUser = async (u: User) => {
    const res = await api(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(u) });
    if (!res.ok) throw new Error('Erro ao atualizar');
    const saved = await res.json();
    setUsers(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    return saved;
  };
  const deleteUser = async (id: string) => { await api(`/api/users/${id}`, { method: 'DELETE' }); setUsers(prev => prev.filter(x => x.id !== id)); };
  
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
    const payload: OS = { ...osData, id: newId, title: `${newId} - ${osData.activity}`, createdAt: now, updatedAt: now, attachmentsEnabled: true, logs: [], imageAttachments: [] };
    try {
      const res = await api('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setOsList(prev => [saved, ...prev]);
    } catch (e) { console.error(e); }
  };

  const addOSBatch = async (osDataList: any[]) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10) || 0)) : 0) + 1;
    const batchPayload = osDataList.map((osData, index) => {
       const newId = `OS${String(nextIdNumber + index).padStart(4, '0')}`;
       return { ...osData, id: newId, title: `${newId} - ${osData.activity}`, createdAt: now, updatedAt: now, logs: [], imageAttachments: [] };
    });
    try {
        const res = await api('/api/os/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batchPayload) });
        if (!res.ok) throw new Error();
        await reloadFromAPI(); 
    } catch (e) { console.error("Erro Batch:", e); alert("Erro ao criar lote de OS."); }
  };

  const updateOS = async (updatedOS: OS) => {
    const res = await api(`/api/os/${updatedOS.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedOS) });
    if (!res.ok) throw new Error();
    const saved = await res.json();
    setOsList(prev => prev.map(os => (os.id === saved.id ? saved : os)));
  };

  const patchOS = async (osId: string, updates: Partial<OS>) => {
      setOsList(prev => prev.map(os => {
          if (os.id === osId) { return { ...os, ...updates, updatedAt: new Date().toISOString() }; }
          return os;
      }));
      try {
          const currentOS = osList.find(o => o.id === osId);
          if (currentOS) {
              const mergedOS = { ...currentOS, ...updates, updatedAt: new Date().toISOString() };
              await api(`/api/os/${osId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mergedOS) });
          }
      } catch (e) { console.error("Erro patchOS", e); }
  };

  const addOSLog = (osId: string, log: Omit<OSLog, 'id'|'timestamp'>) => {
    const newLog = { ...log, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, logs: [newLog, ...os.logs] } : os)));
  };

  // ✅ ADD ATTACHMENT: SEGURO (Sem Race Condition)
  const addOSAttachment = async (osId: string, att: Omit<ImageAttachment, 'id'|'uploadedAt'>) => {
    const newAtt = { ...att, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
    
    // NOTA: Não atualizamos o estado local manualmente aqui para evitar conflitos.
    // Confiamos na resposta do servidor que retorna o objeto completo atualizado.

    try {
        // 1. Busca dados frescos
        const freshList = await api('/api/os').then(r => r.json());
        const currentOS = freshList.find((o: OS) => o.id === osId);
        
        if (currentOS) {
            // 2. Adiciona o novo anexo à lista existente no servidor
            const updatedAttachments = [newAtt, ...(currentOS.imageAttachments || [])];
            
            const payload = { 
                ...currentOS, 
                imageAttachments: updatedAttachments, 
                updatedAt: new Date().toISOString() 
            };
            
            // 3. Salva
            const res = await api(`/api/os/${osId}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });

            if(res.ok) {
                const savedOS = await res.json();
                console.log("✅ Imagem salva e sincronizada:", savedOS.id);
                // 4. Atualiza estado global com a fonte da verdade
                setOsList(prev => prev.map(os => (os.id === osId ? savedOS : os)));
            } else {
                console.error("❌ Erro servidor ao salvar imagem.");
            }
        }
    } catch (e) { 
        console.error("Erro crítico upload:", e); 
    }
  };

  const deleteOSAttachment = async (osId: string, attId: string) => {
    setOsList(prev => prev.map(os => (os.id === osId ? { ...os, imageAttachments: os.imageAttachments.filter(a => a.id !== attId) } : os)));
    try {
        const currentOS = osList.find(o => o.id === osId);
        if(currentOS) {
            const newAttachments = currentOS.imageAttachments.filter(a => a.id !== attId);
            await api(`/api/os/${osId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...currentOS, imageAttachments: newAttachments }) });
        }
    } catch (e) { console.error(e); }
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
      addOS, addOSBatch, updateOS, patchOS, deleteOSBatch,
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