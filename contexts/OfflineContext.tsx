// File: contexts/OfflineContext.tsx
//
// Contexto Offline:
// - Detecta online/offline do dispositivo (navigator.onLine)
// - Faz "online real" via ping no backend (evita falso positivo)
// - Mantém fila (IndexedDB) e sincroniza quando o backend estiver realmente acessível
//
// ✅ Correções deste patch:
// 1) isOnline agora é (deviceOnline && backendReachable).
// 2) processQueue só roda se backendReachable (ping ok).
// 3) syncApiCall usa timeout e marca backend como offline ao falhar.
// 4) Evita remover itens da fila quando não conseguiu realmente executar a ação.
//
// Observação:
// - Isso não corrige IP errado, mas impede que o app tente sync/PUT infinito e trave a UI.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { initDB, addToQueue, getQueue, removeFromQueue } from '../services/offlineDb';
import { useData } from './DataContext';
import { API_BASE } from '../components/utils/config';

type OfflineActionType = 'ADD_LOG' | 'UPDATE_STATUS' | 'UPLOAD_IMAGE' | 'DELETE_IMAGE';

interface OfflineContextType {
  isOnline: boolean;        // online real (device + ping backend ok)
  deviceOnline: boolean;    // só navigator.onLine
  backendOnline: boolean;   // ping real
  queueLength: number;
  saveOfflineAction: (type: OfflineActionType, osId: string, payload: any) => Promise<void>;
  forceSync: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType>({} as OfflineContextType);

export const useOffline = () => useContext(OfflineContext);

// Fetch com timeout (AbortController) para ping e sync calls
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

function normalizeUrl(u?: string): string {
  if (!u) return '';
  return u.trim().split('?')[0];
}

function extractFilenameFromUrl(u?: string): string {
  const nu = normalizeUrl(u);
  if (!nu) return '';
  const parts = nu.split('/');
  return parts[parts.length - 1] || '';
}

function makeDeleteKey(osId: string, value: string): string {
  return `${osId}::${value}`;
}

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reloadFromAPI } = useData();

  const [deviceOnline, setDeviceOnline] = useState<boolean>(navigator.onLine);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [queueLength, setQueueLength] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Cache curto do ping para não pingar a cada ação
  const pingCacheRef = useRef<{ ok: boolean; at: number }>({ ok: false, at: 0 });

  const pingBackend = useCallback(async (force = false): Promise<boolean> => {
    if (!navigator.onLine) {
      setBackendOnline(false);
      pingCacheRef.current = { ok: false, at: Date.now() };
      return false;
    }

    const now = Date.now();
    const ageMs = now - (pingCacheRef.current.at || 0);

    if (!force && ageMs < 3000) return pingCacheRef.current.ok;

    try {
      const url = `${API_BASE}/api/os?_ping=${now}`;
      const res = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        },
        1500
      );

      const ok = res.ok;
      pingCacheRef.current = { ok, at: now };
      setBackendOnline(ok);
      return ok;
    } catch {
      pingCacheRef.current = { ok: false, at: now };
      setBackendOnline(false);
      return false;
    }
  }, []);

  const isOnline = deviceOnline && backendOnline;

  // Faz chamada para API durante o sync
  const syncApiCall = useCallback(
    async (path: string, method: 'GET' | 'POST' | 'PUT', body?: any) => {
      const token = localStorage.getItem('token');

      let userId = '';
      try {
        const u = localStorage.getItem('currentUser');
        if (u) userId = JSON.parse(u).id;
      } catch {
        // ignore
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-user-id': userId,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      };

      if (token) headers.Authorization = `Bearer ${token}`;

      const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

      // timeout maior no sync (PUT pode demorar)
      const res = await fetchWithTimeout(
        url,
        { method, headers, body: body ? JSON.stringify(body) : undefined },
        5000
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server Error ${res.status}: ${txt}`);
      }

      return res.json();
    },
    []
  );

  const processQueue = useCallback(async () => {
    if (isSyncing) return;
    if (!navigator.onLine) return;

    // Garante "online real"
    const ok = await pingBackend(false);
    if (!ok) return;

    const rawQueue = await getQueue();
    if (!rawQueue.length) return;

    // Ordena para replay previsível
    const queue = [...rawQueue].sort((a: any, b: any) => {
      const ta = a.timestamp || 0;
      const tb = b.timestamp || 0;
      if (ta !== tb) return ta - tb;
      return (a.id || 0) - (b.id || 0);
    });

    setIsSyncing(true);
    console.log(`🔄 [SYNC] Processando ${queue.length} itens...`);

    let processedCount = 0;

    try {
      // 1) Pré-processa deleções para cancelar uploads correspondentes
      const deletedKeys = new Set<string>();

      for (const item of queue) {
        if (item.type !== 'DELETE_IMAGE') continue;

        const p = item.payload || {};
        const attachmentId = (p.attachmentId || p.id || '').toString();
        const url = normalizeUrl(p.url);
        const fileName = (p.fileName || '').toString();
        const filenameFromUrl = extractFilenameFromUrl(p.url);

        if (attachmentId) deletedKeys.add(makeDeleteKey(item.osId, `id:${attachmentId}`));
        if (url) deletedKeys.add(makeDeleteKey(item.osId, `url:${url}`));
        if (fileName) deletedKeys.add(makeDeleteKey(item.osId, `fileName:${fileName}`));
        if (filenameFromUrl) deletedKeys.add(makeDeleteKey(item.osId, `filename:${filenameFromUrl}`));
      }

      for (const item of queue) {
        if (!navigator.onLine) break;

        // Se backend cair no meio, para imediatamente e mantém fila
        const stillOk = await pingBackend(false);
        if (!stillOk) break;

        if (!item.id) continue;

        if (item.type === 'UPDATE_STATUS') {
          await syncApiCall(`/api/os/${item.osId}/pause`, 'POST', item.payload);
          await removeFromQueue(item.id);
          processedCount++;
          continue;
        }

        if (item.type === 'UPLOAD_IMAGE') {
          const attachment = item.payload?.attachment || item.payload;

          const attId = (attachment?.id || '').toString();
          const attUrl = normalizeUrl(attachment?.url);
          const attFileName = (attachment?.fileName || '').toString();
          const attFilenameFromUrl = extractFilenameFromUrl(attachment?.url);

          const isMarkedDeleted =
            (attId && deletedKeys.has(makeDeleteKey(item.osId, `id:${attId}`))) ||
            (attUrl && deletedKeys.has(makeDeleteKey(item.osId, `url:${attUrl}`))) ||
            (attFileName && deletedKeys.has(makeDeleteKey(item.osId, `fileName:${attFileName}`))) ||
            (attFilenameFromUrl && deletedKeys.has(makeDeleteKey(item.osId, `filename:${attFilenameFromUrl}`)));

          if (isMarkedDeleted) {
            console.log(`🧹 [SYNC] Cancelando UPLOAD_IMAGE (foi deletada offline): os=${item.osId} id=${attId}`);
            await removeFromQueue(item.id);
            processedCount++;
            continue;
          }

          if (!attachment?.url) {
            await removeFromQueue(item.id);
            processedCount++;
            continue;
          }

          const currentOS = await syncApiCall(`/api/os/${item.osId}?_t=${Date.now()}`, 'GET');
          if (!currentOS) break;

          const newAtt = {
            ...attachment,
            id: attachment.id || `img-${Date.now()}`,
            uploadedAt: new Date().toISOString(),
          };

          const payloadOS = {
            ...currentOS,
            imageAttachments: [newAtt, ...(currentOS.imageAttachments || [])],
            updatedAt: new Date().toISOString(),
          };

          await syncApiCall(`/api/os/${item.osId}`, 'PUT', payloadOS);

          await removeFromQueue(item.id);
          processedCount++;
          continue;
        }

        if (item.type === 'DELETE_IMAGE') {
          const p = item.payload || {};

          const wantedId = (p.attachmentId || p.id || '').toString();
          const wantedUrl = normalizeUrl(p.url);
          const wantedFileName = (p.fileName || '').toString();
          const wantedFilenameFromUrl = extractFilenameFromUrl(p.url);

          const currentOS = await syncApiCall(`/api/os/${item.osId}?_t=${Date.now()}`, 'GET');
          if (!currentOS) break;

          const before = Array.isArray(currentOS.imageAttachments) ? currentOS.imageAttachments : [];

          const after = before.filter((a: any) => {
            const aId = (a?.id || '').toString();
            const aUrl = normalizeUrl(a?.url);
            const aFileName = (a?.fileName || '').toString();
            const aFilenameFromUrl = extractFilenameFromUrl(a?.url);

            const matchById = wantedId && aId === wantedId;
            const matchByUrl = wantedUrl && aUrl === wantedUrl;
            const matchByFileName = wantedFileName && aFileName === wantedFileName;
            const matchByFilenameFromUrl = wantedFilenameFromUrl && aFilenameFromUrl === wantedFilenameFromUrl;

            return !(matchById || matchByUrl || matchByFileName || matchByFilenameFromUrl);
          });

          if (after.length !== before.length) {
            const payloadOS = {
              ...currentOS,
              imageAttachments: after,
              updatedAt: new Date().toISOString(),
            };

            await syncApiCall(`/api/os/${item.osId}`, 'PUT', payloadOS);
            console.log(`🗑️ [SYNC] DELETE_IMAGE OK: os=${item.osId} (before=${before.length}, after=${after.length})`);
          } else {
            console.log(`⚠️ [SYNC] DELETE_IMAGE: nada para remover no servidor (os=${item.osId}).`);
          }

          await removeFromQueue(item.id);
          processedCount++;
          continue;
        }

        // Tipo desconhecido: remove para não travar fila
        await removeFromQueue(item.id);
        processedCount++;
      }

      const remaining = await getQueue();
      setQueueLength(remaining.length);

      if (processedCount > 0) {
        await reloadFromAPI();
        console.log(`✅ [SYNC] Concluído. Processados=${processedCount}, pendentes=${remaining.length}`);
      }
    } catch (error) {
      console.error('❌ [SYNC] Falha no sync:', error);
      // Se falhou, considera backend offline até próximo ping
      setBackendOnline(false);
      const q = await getQueue();
      setQueueLength(q.length);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, pingBackend, reloadFromAPI, syncApiCall]);

  // Heartbeat: ping + sync condicionado
  useEffect(() => {
    const heartbeat = setInterval(async () => {
      // 1) Atualiza deviceOnline
      setDeviceOnline(navigator.onLine);

      // 2) Pinga backend (se device online)
      if (navigator.onLine) await pingBackend(false);

      // 3) Atualiza contagem da fila
      const q = await getQueue();
      setQueueLength(q.length);

      // 4) Só tenta sync se "online real"
      if (navigator.onLine && !isSyncing) {
        const ok = await pingBackend(false);
        if (ok && q.length > 0) processQueue();
      }
    }, 8000);

    return () => clearInterval(heartbeat);
  }, [isSyncing, pingBackend, processQueue]);

  // Init + listeners
  useEffect(() => {
    initDB().then(async () => {
      const q = await getQueue();
      setQueueLength(q.length);

      if (navigator.onLine) {
        const ok = await pingBackend(true);
        if (ok && q.length > 0) setTimeout(processQueue, 1000);
      }
    });

    const handleOnline = async () => {
      setDeviceOnline(true);
      const ok = await pingBackend(true);
      if (ok) setTimeout(processQueue, 1500);
    };

    const handleOffline = () => {
      setDeviceOnline(false);
      setBackendOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pingBackend, processQueue]);

  const saveOfflineAction = useCallback(async (type: OfflineActionType, osId: string, payload: any) => {
    await addToQueue(type, osId, payload);
    const q = await getQueue();
    setQueueLength(q.length);
  }, []);

  const forceSync = useCallback(async () => {
    if (!navigator.onLine) return;
    const ok = await pingBackend(true);
    if (!ok) return;
    await processQueue();
  }, [pingBackend, processQueue]);

  const value = useMemo(
    () => ({
      isOnline,
      deviceOnline,
      backendOnline,
      queueLength,
      saveOfflineAction,
      forceSync,
    }),
    [isOnline, deviceOnline, backendOnline, queueLength, saveOfflineAction, forceSync]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
};