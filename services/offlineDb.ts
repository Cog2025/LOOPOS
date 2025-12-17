// File: services/offlineDb.ts
import { openDB, DBSchema } from 'idb';
import { OS, OSLog, ImageAttachment } from '../types';

interface LoopOSDB extends DBSchema {
  // Tabela para guardar os dados da OS para consulta offline
  'os-data': {
    key: string;
    value: OS;
  };
  // Fila de Ações para Sincronizar (Logs, Status, Fotos)
  'sync-queue': {
    key: number;
    value: {
      id?: number;
      type: 'ADD_LOG' | 'UPDATE_STATUS' | 'UPLOAD_IMAGE';
      osId: string;
      payload: any;
      timestamp: number;
    };
    indexes: { 'by-os': string };
  };
}

const DB_NAME = 'loopos-offline-db';

export const initDB = async () => {
  return openDB<LoopOSDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('os-data')) {
        db.createObjectStore('os-data', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync-queue')) {
        const store = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-os', 'osId');
      }
    },
  });
};

// Salva OS inteira localmente (para poder abrir o modal offline)
export const cacheOSData = async (os: OS) => {
  const db = await initDB();
  await db.put('os-data', os);
};

// Adiciona uma ação na fila
export const addToQueue = async (type: 'ADD_LOG' | 'UPDATE_STATUS' | 'UPLOAD_IMAGE', osId: string, payload: any) => {
  const db = await initDB();
  await db.add('sync-queue', {
    type,
    osId,
    payload,
    timestamp: Date.now()
  });
};

// Pega todos os itens da fila
export const getQueue = async () => {
  const db = await initDB();
  return db.getAll('sync-queue');
};

// Remove item da fila após sucesso
export const removeFromQueue = async (id: number) => {
  const db = await initDB();
  await db.delete('sync-queue', id);
};