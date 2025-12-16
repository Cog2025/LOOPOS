// File: /contexts/DataContext.tsx
// Contexto global para gerenciamento de estado da aplicação.
// Inclui correções críticas para persistência de imagens e execução de OS.
// Contexto global corrigido para evitar CRASH por limite de LocalStorage (QuotaExceeded).

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
  deletePlant: (id: string) => Promise<void>;

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

// ✅ HELPER: Normalização de Plantas
const normalizePlant = (p: any): Plant => {
    const rawSubPlants = Array.isArray(p?.subPlants) ? p.subPlants : [];
    const normalizedSubPlants = rawSubPlants.map((sp: any) => ({
        id: sp.id || crypto.randomUUID(),
        name: sp.name || 'Subusina',
        inverterCount: Number(sp.inverterCount) || 0,
        inverterStartIndex: sp.inverterStartIndex !== undefined ? Number(sp.inverterStartIndex) : 1,
        trackersPerInverter: Number(sp.trackersPerInverter) || 0,
        stringsPerInverter: Number(sp.stringsPerInverter) || 0
    }));

    return {
        ...p,
        coordinatorId: p?.coordinatorId ?? null,
        supervisorIds: Array.isArray(p?.supervisorIds) ? p.supervisorIds : [],
        technicianIds: Array.isArray(p?.technicianIds) ? p.technicianIds : [],
        assistantIds: Array.isArray(p?.assistantIds) ? p.assistantIds : [],
        subPlants: normalizedSubPlants,
        assets: Array.isArray(p?.assets) ? p.assets : []
    };
};

// ✅ HELPER: Normalização de OS (Garante campos opcionais)
const normalizeOS = (o: any): OS => ({
    ...o,
    assistantId: o.assistantId || '',
    subPlantId: o.subPlantId || '',
    inverterId: o.inverterId || '',
    logs: Array.isArray(o.logs) ? o.logs : [],
    imageAttachments: Array.isArray(o.imageAttachments) ? o.imageAttachments : [],
    subtasksStatus: Array.isArray(o.subtasksStatus) ? o.subtasksStatus : []
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // ✅ CORREÇÃO: Notificações agora usam LocalStorage para persistir no F5
  const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', []);
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

  // ✅ RELOAD ROBUSTO: Fusão de dados API + LocalStorage
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
        const rawO = toArray(o);
        const N = toArray(n); 

        if (U.length) setUsers(U);
        if (P.length) setPlants(P);
        
        // --- LÓGICA DE FUSÃO PARA OS (Corrige bug do Auxiliar sumindo) ---
        setOsList(currentLocalList => {
            // Se a API não retornou nada, mantém o local
            if (rawO.length === 0 && currentLocalList.length > 0) return currentLocalList;
            
            const currentMap = new Map(currentLocalList.map(item => [item.id, item]));
            
            const mergedOSList = rawO.map(apiItem => {
                const normalizedAPI = normalizeOS(apiItem);
                const localItem = currentMap.get(apiItem.id);

                if (localItem) {
                    // Se a API esqueceu campos que nós temos localmente, restaura eles
                    if (!normalizedAPI.assistantId && localItem.assistantId) normalizedAPI.assistantId = localItem.assistantId;
                    if (!normalizedAPI.subPlantId && localItem.subPlantId) normalizedAPI.subPlantId = localItem.subPlantId;
                    if (!normalizedAPI.inverterId && localItem.inverterId) normalizedAPI.inverterId = localItem.inverterId;
                    // Preserva anexos se a API vier vazia mas local tiver (caso de upload recente)
                    if (normalizedAPI.imageAttachments.length === 0 && localItem.imageAttachments.length > 0) {
                        normalizedAPI.imageAttachments = localItem.imageAttachments;
                    }
                }
                return normalizedAPI;
            });
            return mergedOSList;
        });

        // Merge de notificações (Local + API)
        setNotifications(currentNotifs => {
            const apiNotifs = N;
            // Combina e remove duplicatas por ID
            const combined = [...currentNotifs, ...apiNotifs].reduce((acc, curr) => {
                if (!acc.find(x => x.id === curr.id)) acc.push(curr);
                return acc;
            }, [] as Notification[]);
            return combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
        
    } catch (err) { console.error('❌ Erro em reloadFromAPI:', err); }
  }, [api, setUsers, setPlants, setOsList, setNotifications]);

  const mergeSubPlantData = (savedPlant: any, localPlant: Partial<Plant>) => {
      if (!savedPlant.subPlants || !localPlant.subPlants) return savedPlant;
      savedPlant.subPlants = savedPlant.subPlants.map((sp: any) => {
          const original = localPlant.subPlants!.find((osp: any) => 
              osp.id === sp.id || (osp.name === sp.name && osp.inverterCount === sp.inverterCount)
          );
          if (original && sp.inverterStartIndex === undefined && original.inverterStartIndex !== undefined) {
              sp.inverterStartIndex = original.inverterStartIndex;
          }
          return sp;
      });
      return savedPlant;
  };

  const mergeOSData = (savedOS: OS, localOS: OS) => {
      if (!savedOS.assistantId && localOS.assistantId) savedOS.assistantId = localOS.assistantId;
      if (!savedOS.subPlantId && localOS.subPlantId) savedOS.subPlantId = localOS.subPlantId;
      if (!savedOS.inverterId && localOS.inverterId) savedOS.inverterId = localOS.inverterId;
      return savedOS;
  };

  const pushNotification = async (userId: string, message: string) => {
      if (!userId) return;
      const notif: Notification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          userId,
          message,
          read: false,
          timestamp: new Date().toISOString()
      };
      // Salva no estado (que agora vai para o LocalStorage)
      setNotifications(prev => [notif, ...prev]);
      
      try { await api('/api/notifications', { method: 'POST', body: JSON.stringify(notif) }); } 
      catch (e) { console.error("Falha ao salvar notificação no backend (mas salva local)", e); }
  };

  // ... (Manutenção, Templates e Filtros - SEM ALTERAÇÕES) ...
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
  const initializePlantPlan = async (plantId: string, mode: string, customTasks: any[]) => {
      await api(`/api/maintenance/plant-plans/${plantId}/init`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode, custom_tasks: customTasks }) });
      await fetchPlantPlan(plantId); await reloadFromAPI(); 
  };
  const updatePlantTask = async (taskId: string, data: Partial<PlantMaintenancePlan>) => { await api(`/api/maintenance/plant-plans/${taskId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); };
  const createPlantTask = async (plantId: string, data: any) => { await api(`/api/maintenance/plant-plans/${plantId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await fetchPlantPlan(plantId); };
  const deletePlantTask = async (taskId: string) => { const res = await api(`/api/maintenance/plant-plans/${taskId}`, { method: 'DELETE' }); if (!res.ok) throw new Error("Falha ao deletar tarefa."); };
  const addTemplate = async (data: any) => { await api('/api/maintenance/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await fetchTaskTemplates(); };
  const updateTemplate = async (id: string, data: any) => { await api(`/api/maintenance/templates/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); await fetchTaskTemplates(); };
  const deleteTemplate = async (id: string) => { await api(`/api/maintenance/templates/${id}`, { method: 'DELETE' }); await fetchTaskTemplates(); };

  // ✅ FILTRO DE SEGURANÇA CORRIGIDO PARA AUXILIARES
  const filterOSForUser = (u: User): OS[] => {
    if ([Role.ADMIN, Role.OPERATOR].includes(u.role)) return osList;
    
    // ✅ CORREÇÃO: Agora inclui AUXILIARES e verifica o campo assistantId
    if (u.role === Role.TECHNICIAN || u.role === Role.ASSISTANT) {
        return osList.filter(o => o.technicianId === u.id || o.assistantId === u.id);
    }

    if ([Role.CLIENT, Role.COORDINATOR, Role.SUPERVISOR].includes(u.role)) {
        const norm = u.name.trim().toLowerCase();
        return osList.filter(o => {
            const p = plants.find(pl => pl.id === o.plantId);
            return (p && u.plantIds && u.plantIds.includes(p.id)) || 
                   (p && u.role === Role.CLIENT && p.client?.trim().toLowerCase() === norm);
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
      let saved = await res.json();
      saved = mergeSubPlantData(saved, plant);
      setPlants(prev => [...prev, normalizePlant(saved)]);
      return saved;
  };
  const updatePlant = async (plant: Plant, assignments?: AssignmentsDTO) => {
      const payload = { ...plant, ...assignments };
      const res = await api(`/api/plants/${plant.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      let saved = await res.json();
      saved = mergeSubPlantData(saved, plant);
      setPlants(prev => prev.map(p => (p.id === saved.id ? normalizePlant(saved) : p)));
  };
  const deletePlant = async (id: string) => { try { await api(`/api/plants/${id}`, { method: 'DELETE' }); setPlants(prev => prev.filter(p => p.id !== id)); } catch (e) { console.error("Erro ao deletar usina:", e); } };

  // ✅ ADD OS COM MERGE E NOTIFICAÇÃO
  const addOS = async (osData: Omit<OS, 'id'|'title'|'createdAt'|'updatedAt'|'logs'|'imageAttachments'>) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10) || 0)) : 0) + 1;
    const newId = `OS${String(nextIdNumber).padStart(4, '0')}`;
    const payload: OS = { 
        ...osData, id: newId, title: `${newId} - ${osData.activity}`, createdAt: now, updatedAt: now, attachmentsEnabled: true, logs: [], imageAttachments: [],
        assistantId: osData.assistantId || '', subPlantId: osData.subPlantId || '', inverterId: osData.inverterId || ''
    };
    try {
      const res = await api('/api/os', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      let saved = await res.json();
      
      // ✅ GARANTE PERSISTÊNCIA NA CRIAÇÃO (Merge com payload local)
      saved = mergeOSData(saved, payload);
      setOsList(prev => [saved, ...prev]);

      // ✅ NOTIFICAÇÕES NA CRIAÇÃO
      if (saved.technicianId) pushNotification(saved.technicianId, `Nova OS atribuída: ${saved.title}`);
      if (saved.assistantId) pushNotification(saved.assistantId, `Você foi definido como Auxiliar na OS: ${saved.title}`);

    } catch (e) { console.error(e); }
  };

  const addOSBatch = async (osDataList: any[]) => {
    const now = new Date().toISOString();
    const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10) || 0)) : 0) + 1;
    const batchPayload = osDataList.map((osData, index) => {
       const newId = `OS${String(nextIdNumber + index).padStart(4, '0')}`;
       return { ...osData, id: newId, title: `${newId} - ${osData.activity}`, createdAt: now, updatedAt: now, logs: [], imageAttachments: [], assistantId: osData.assistantId || '' };
    });
    try {
        const res = await api('/api/os/batch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(batchPayload) });
        if (!res.ok) throw new Error();
        await reloadFromAPI(); 
        
        // Notifica em lote
        batchPayload.forEach((os: any) => { 
            if(os.technicianId) pushNotification(os.technicianId, `Nova OS atribuída: ${os.title}`);
        });
    } catch (e) { console.error("Erro Batch:", e); alert("Erro ao criar lote de OS."); }
  };

  // ✅ UPDATE OS COM MERGE E NOTIFICAÇÃO
  const updateOS = async (updatedOS: OS) => {
    const oldOS = osList.find(o => o.id === updatedOS.id);
    const hasTechChanged = oldOS && oldOS.technicianId !== updatedOS.technicianId;
    const hasAssistantChanged = oldOS && oldOS.assistantId !== updatedOS.assistantId;

    const res = await api(`/api/os/${updatedOS.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedOS) });
    if (!res.ok) throw new Error();
    let saved = await res.json();
    
    // ✅ MERGE PARA EVITAR PERDA DE DADOS
    saved = mergeOSData(saved, updatedOS);

    setOsList(prev => prev.map(os => (os.id === saved.id ? saved : os)));

    // ✅ NOTIFICAÇÕES
    if (hasTechChanged && saved.technicianId) {
        pushNotification(saved.technicianId, `Você foi atribuído à OS: ${saved.title}`);
    }
    if (hasAssistantChanged && saved.assistantId) {
        pushNotification(saved.assistantId, `Você foi definido como Auxiliar na OS: ${saved.title}`);
    }
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

  const addOSAttachment = async (osId: string, att: Omit<ImageAttachment, 'id'|'uploadedAt'>) => {
    const newAtt = { ...att, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
    try {
        const freshList = await api('/api/os').then(r => r.json());
        const currentOS = freshList.find((o: OS) => o.id === osId);
        if (currentOS) {
            const updatedAttachments = [newAtt, ...(currentOS.imageAttachments || [])];
            const payload = { ...currentOS, imageAttachments: updatedAttachments, updatedAt: new Date().toISOString() };
            const res = await api(`/api/os/${osId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if(res.ok) {
                const savedOS = await res.json();
                setOsList(prev => prev.map(os => (os.id === osId ? savedOS : os)));
            }
        }
    } catch (e) { console.error("Erro crítico upload:", e); }
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

  const markNotificationAsRead = async (id: string) => { 
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      try { await api(`/api/notifications/${id}/read`, { method: 'PUT' }); } catch (e) { console.error(e); }
  };

  return (
    <DataContext.Provider value={{
      users, plants, osList, notifications, taskTemplates, maintenancePlans,
      setAuthHeaders, reloadFromAPI, loadUserData, clearData,
      addUser, updateUser, deleteUser, addPlant, updatePlant, deletePlant,
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

export default DataContext;