// File: contexts/OfflineContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { initDB, addToQueue, getQueue, removeFromQueue } from '../services/offlineDb';
import { useData } from './DataContext';
import { API_BASE } from '../components/utils/config';

interface OfflineContextType {
  isOnline: boolean;
  queueLength: number;
  saveOfflineAction: (type: 'ADD_LOG' | 'UPDATE_STATUS' | 'UPLOAD_IMAGE', osId: string, payload: any) => Promise<void>;
  forceSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({} as OfflineContextType);
export const useOffline = () => useContext(OfflineContext);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<any>(null);
  
  // Importamos reloadFromAPI para atualizar a tela após o sync
  const { reloadFromAPI } = useData(); 

  const syncApiCall = useCallback(async (path: string, method: string, body?: any) => {
    const token = localStorage.getItem('token');
    let userId = '';
    try {
        const u = localStorage.getItem('currentUser');
        if (u) userId = JSON.parse(u).id;
    } catch {}

    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-user-id': userId };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server Error ${res.status}: ${txt}`);
    }
    return res.json();
  }, []);

  const processQueue = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;

    const queue = await getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    console.log(`🔄 Sincronizando ${queue.length} itens...`);
    let processedCount = 0;

    try {
      for (const item of queue) {
        if (!navigator.onLine) break; // Para se a net cair no meio

        console.log(`Processando ${item.type} da OS ${item.osId}`);

        if (item.type === 'UPDATE_STATUS') {
           // Chama /pause com o payload correto
           await syncApiCall(`/api/os/${item.osId}/pause`, 'POST', item.payload);
        } 
        else if (item.type === 'UPLOAD_IMAGE') {
           // Lógica robusta da Outra IA para imagens
           const attachment = item.payload.attachment || item.payload; // Aceita os dois formatos

           if (!attachment?.url) {
             console.warn('Item inválido na fila, removendo...');
             await removeFromQueue(item.id!);
             continue;
           }
           
           // Busca OS atualizada
           const currentOS = await syncApiCall(`/api/os/${item.osId}`, 'GET');
           if (!currentOS) break;
           
           // Cria ID novo e adiciona
           const newAtt = { ...attachment, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
           const payloadOS = { ...currentOS, imageAttachments: [newAtt, ...(currentOS.imageAttachments || [])], updatedAt: new Date().toISOString() };
           
           // PUT manual
           await syncApiCall(`/api/os/${item.osId}`, 'PUT', payloadOS);
        }

        await removeFromQueue(item.id!);
        processedCount++;
      }
      
      const remaining = await getQueue();
      setQueueLength(remaining.length);
      
      if (processedCount > 0) {
          await reloadFromAPI();
          // Pequeno delay para garantir que o usuário veja
          setTimeout(() => alert(`${processedCount} dados sincronizados com sucesso!`), 500);
      }
      
    } catch (error) {
      console.error("❌ Falha no sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, reloadFromAPI, syncApiCall]);

  const scheduleSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
        if (navigator.onLine) processQueue();
    }, 3000); 
  }, [processQueue]);

  useEffect(() => {
    initDB().then(async () => {
        const q = await getQueue();
        setQueueLength(q.length);
        if (navigator.onLine && q.length > 0) scheduleSync();
    });
    const handleOnline = () => { setIsOnline(true); scheduleSync(); };
    const handleOffline = () => { setIsOnline(false); if(syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [scheduleSync]);

  const saveOfflineAction = async (type: any, osId: string, payload: any) => {
    await addToQueue(type, osId, payload);
    const q = await getQueue();
    setQueueLength(q.length);
  };

  const forceSync = async () => {
      if(navigator.onLine) await processQueue();
      else alert("Sem conexão.");
  }

  return (
    <OfflineContext.Provider value={{ isOnline, queueLength, saveOfflineAction, forceSync }}>
      {children}
    </OfflineContext.Provider>
  );
};