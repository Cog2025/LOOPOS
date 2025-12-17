// File: contexts/OfflineContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { initDB, addToQueue, getQueue, removeFromQueue, cacheOSData } from '../services/offlineDb';
import { useData } from './DataContext';

interface OfflineContextType {
  isOnline: boolean;
  queueLength: number;
  saveOfflineAction: (type: 'ADD_LOG' | 'UPDATE_STATUS' | 'UPLOAD_IMAGE', osId: string, payload: any) => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({} as OfflineContextType);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);
  const { updateOS, addOSLog } = useData(); // Suas funções originais do DataContext

  // Monitora status da conexão
  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  // Monitora tamanho da fila inicial
  useEffect(() => {
    const checkQueue = async () => {
        const q = await getQueue();
        setQueueLength(q.length);
    };
    checkQueue();
  }, []);

  // --- SINCRONIZAÇÃO AUTOMÁTICA ---
  useEffect(() => {
    if (isOnline && queueLength > 0) {
      processQueue();
    }
  }, [isOnline, queueLength]);

  const processQueue = async () => {
    const queue = await getQueue();
    console.log(`🔄 Sincronizando ${queue.length} itens...`);

    for (const item of queue) {
      try {
        if (item.type === 'ADD_LOG') {
           // Chama sua função real do DataContext (que salva no Firebase/Backend)
           await addOSLog(item.osId, item.payload); 
        } 
        else if (item.type === 'UPDATE_STATUS') {
           // Payload deve conter o objeto OS atualizado ou os campos parciais
           // Aqui você precisaria ter uma função de update específica ou usar o updateOS
           await updateOS(item.payload); 
        }
        else if (item.type === 'UPLOAD_IMAGE') {
           // Payload aqui seria o arquivo (Blob) ou base64
           // Você precisará de uma função específica no DataContext para upload de imagem
           // await uploadOSImage(item.osId, item.payload);
           console.log("Upload de imagem pendente de implementação no DataContext");
        }

        // Se deu certo, remove da fila local
        if (item.id) await removeFromQueue(item.id);
        
      } catch (error) {
        console.error("Erro ao sincronizar item:", item, error);
        // Não remove da fila para tentar de novo depois
      }
    }
    
    // Atualiza contagem
    const remaining = await getQueue();
    setQueueLength(remaining.length);
  };

  const saveOfflineAction = async (type: any, osId: string, payload: any) => {
    await addToQueue(type, osId, payload);
    setQueueLength(prev => prev + 1);
    
    // Se for status ou log, podemos atualizar o cache local para o usuário ver a mudança na tela imediatamente
    // (Lógica de Optimistic UI)
  };

  return (
    <OfflineContext.Provider value={{ isOnline, queueLength, saveOfflineAction }}>
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);