// File: components/modals/OSExecutionModal.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Modal from './Modal';
// 👇 1. IMPORTAMOS OSStatus AQUI
import { OS, SubtaskItem, OSStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOffline } from '../../contexts/OfflineContext';
import {
  CheckSquare, Square, Camera, Trash2, UploadCloud,
  Play, Pause, Lock, History, CheckCircle,
} from 'lucide-react';
import { API_BASE } from '../utils/config';

interface Props {
  os: OS;
  onClose: () => void;
}

const OSExecutionModal: React.FC<Props> = ({ os, onClose }) => {
  const { addOSAttachment, deleteOSAttachment, osList, reloadFromAPI, patchOS } = useData();
  const { user } = useAuth();
  const { isOnline, saveOfflineAction } = useOffline();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const liveOS: OS = useMemo(() => {
    const found = osList.find(o => o.id === os.id);
    return (found || os) as OS;
  }, [osList, os]);

  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(liveOS.subtasksStatus || []);
  const [isRunning, setIsRunning] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockerName, setLockerName] = useState('');
  const [elapsedSession, setElapsedSession] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // --- HELPERS ---
  const resolveAssetUrl = (u?: string) => {
    if (!u) return '';
    if (u.startsWith('data:')) return u; 
    if (u.startsWith('http')) return u; 
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${API_BASE}${path}`;
  };

  const parseUtc = (s?: string) => {
    if (!s) return null;
    try {
        const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(s);
        return new Date(hasTz ? s : `${s}Z`);
    } catch { return null; }
  };

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const apiCall = async (path: string, method = 'POST', body?: any) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-id': user?.id || '',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
       const txt = await res.text(); 
       throw new Error(txt || `Erro ${res.status}`);
    }
    return res.json();
  };

  // --- EFEITOS ---
  
  useEffect(() => {
    if (!liveOS) return;
    setSubtasks(liveOS.subtasksStatus || []);

    if (liveOS.currentExecutorId && liveOS.currentExecutorId !== user?.id) {
      setIsLockedByOther(true);
      setLockerName('Outro usuário');
      setIsRunning(false);
      setElapsedSession(0);
    } else if (liveOS.currentExecutorId === user?.id) {
      setIsLockedByOther(false);
      setIsRunning(true);
    } else {
      setIsLockedByOther(false);
      setIsRunning(false);
      setElapsedSession(0);
    }
  }, [liveOS, user?.id]);

  useEffect(() => {
    let interval: any;
    const updateTimer = () => {
      if (!liveOS.executionStart) return;
      const start = parseUtc(liveOS.executionStart)?.getTime();
      if (!start) return;
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSession(diff);
    };

    if (isRunning) {
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, liveOS.executionStart]);

  // --- ACTIONS ---

  const handleStart = async () => {
    if (!navigator.onLine) {
        alert("Você precisa estar online para INICIAR a execução (Trava de segurança).");
        return;
    }
    try {
      await apiCall(`/api/os/${liveOS.id}/start`, 'POST');
      setIsRunning(true);
      await reloadFromAPI();
    } catch (error: any) {
      alert(error?.message || 'Erro ao iniciar execução.');
      if ((error?.message || '').includes('Bloqueado')) onClose();
    }
  };

  // 🔥 AÇÃO: PAUSAR (Corrigida com OSStatus)
  const handlePause = async (finished = false) => {
    const now = new Date();
    const currentSessionSeconds = elapsedSession;
    
    const newTotalTime = (liveOS.executionTimeSeconds || 0) + currentSessionSeconds;
    const clientEndTime = now.toISOString();

    const payload = { 
      subtasksStatus: subtasks, 
      finished,
      clientEndTime: clientEndTime,
      durationSeconds: currentSessionSeconds 
    };

    // 👇 2. AQUI USAMOS O ENUM CORRETAMENTE
    patchOS(liveOS.id, {
        currentExecutorId: null,
        executionStart: null,
        executionTimeSeconds: newTotalTime,
        status: finished ? OSStatus.IN_REVIEW : OSStatus.IN_PROGRESS, // ✅ CORREÇÃO
        updatedAt: clientEndTime
    });

    try {
      await apiCall(`/api/os/${liveOS.id}/pause`, 'POST', payload);
      setIsRunning(false);
      setElapsedSession(0);
      await reloadFromAPI();
      onClose();

    } catch (error: any) {
      console.log("Falha online, salvando offline...", error);
      
      try {
        await saveOfflineAction('UPDATE_STATUS', liveOS.id, payload);
        setIsRunning(false);
        setElapsedSession(0);
        alert(`Sem conexão. Tempo de ${formatTime(currentSessionSeconds)} salvo no DISPOSITIVO.`);
        onClose();
      } catch (offlineError) {
        console.error(offlineError);
        alert("CRÍTICO: Não foi possível salvar.");
      }
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, subtaskIdx?: number) => {
    if (!isRunning) return alert('Inicie a execução para anexar fotos.');
    if (!e.target.files?.length) return;

    setIsUploading(true);
    const files = Array.from(e.target.files);
    const caption = subtaskIdx !== undefined ? `Item ${subtaskIdx + 1}` : 'Foto Geral';

    const readFile = (file: File): Promise<any> => new Promise((resolve) => {
        const r = new FileReader();
        r.onloadend = () => resolve({
            url: r.result,
            caption,
            fileName: file.name,
            uploadedBy: user?.name,
            uploadedAt: new Date().toISOString()
        });
        r.readAsDataURL(file);
    });

    try {
      const attachments = await Promise.all(files.map(readFile));

      const currentAtts = liveOS.imageAttachments || [];
      const newLocalAtts = [...attachments, ...currentAtts];
      patchOS(liveOS.id, { imageAttachments: newLocalAtts });

      try {
        if (!navigator.onLine) throw new Error("Offline");

        for (const att of attachments) {
           await addOSAttachment(liveOS.id, att);
        }
        await reloadFromAPI();
      } catch (networkError) {
        console.log("Modo offline: salvando fotos na fila...");
        for (const att of attachments) {
            await saveOfflineAction('UPLOAD_IMAGE', liveOS.id, { attachment: att });
        }
        alert("Sem conexão. Fotos salvas no DISPOSITIVO.");
      }

    } catch (error) {
      alert('Erro ao processar imagens.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  const handleCheck = (idx: number) => {
    if (!isRunning) return alert("Clique em 'INICIAR EXECUÇÃO' para marcar itens.");
    const newCheck = [...subtasks];
    newCheck[idx] = { ...newCheck[idx], done: !newCheck[idx].done };
    setSubtasks(newCheck);
  };

  const handleCommentChange = (idx: number, text: string) => {
    if (!isRunning) return;
    const newCheck = [...subtasks];
    newCheck[idx] = { ...newCheck[idx], comment: text };
    setSubtasks(newCheck);
  };
  
  const handleDeletePhoto = async (attId: string) => {
     if(!isRunning) return;
     if(!navigator.onLine) return alert("Não é possível apagar fotos antigas offline.");
     if(!confirm("Apagar anexo?")) return;
     try {
         await deleteOSAttachment(liveOS.id, attId);
         await reloadFromAPI();
     } catch(e) { alert("Erro ao apagar"); }
  };

  const getImagesForItem = (idx: number) => (liveOS.imageAttachments || []).filter((img: any) => img.caption === `Item ${idx + 1}`);
  const getGeneralImages = () => (liveOS.imageAttachments || []).filter((img: any) => img.caption === 'Foto Geral');
  const hasIT = (t:string) => (t||'').toUpperCase().includes('IT_') || (t||'').toUpperCase().includes('INSTRUÇÃO');

  if (isLockedByOther) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Execução Bloqueada">
         <div className="p-8 text-center">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4"/>
            <h2 className="text-xl font-bold">Bloqueado por {lockerName}</h2>
            <button onClick={onClose} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Voltar</button>
         </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={() => !isRunning ? onClose() : alert('Pause antes de sair')} title={`Execução: ${liveOS.title}`}>
      <div className="flex flex-col h-[85vh]">
        <div className={`border rounded-lg p-4 mb-4 flex justify-between items-center shadow-inner ${isRunning ? 'bg-gray-900 border-gray-700' : 'bg-gray-100'}`}>
             {!isRunning ? (
                 <button onClick={handleStart} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded flex items-center justify-center gap-2">
                    <Play/> INICIAR EXECUÇÃO
                 </button>
             ) : (
                 <div className="flex justify-between w-full text-white">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"/>
                        <div>
                            <div className="text-xs text-gray-400">SESSÃO</div>
                            <div className="text-3xl font-mono font-bold">{formatTime(elapsedSession)}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400">TOTAL</div>
                        <div className="text-xl font-mono text-gray-300">{formatTime((liveOS.executionTimeSeconds||0) + elapsedSession)}</div>
                    </div>
                 </div>
             )}
        </div>

        <div className="flex justify-end mb-2">
            <button onClick={() => setShowHistory(!showHistory)} className="text-blue-600 text-sm flex items-center gap-1">
                <History size={16}/> {showHistory ? 'Voltar' : 'Ver Histórico'}
            </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {showHistory ? (
                <div className="space-y-2">
                    {liveOS.executionHistory?.slice().reverse().map((h:any, i:number) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-3 border-l-4 border-blue-500 shadow-sm flex justify-between">
                            <div>
                                <span className="font-bold block">{h.userName}</span>
                                <span className="text-xs text-gray-500">{parseUtc(h.startTime)?.toLocaleTimeString()} - {parseUtc(h.endTime)?.toLocaleTimeString()}</span>
                            </div>
                            <span className="font-mono text-blue-600 font-bold">{formatTime(h.durationSeconds)}</span>
                        </div>
                    ))}
                    {!liveOS.executionHistory?.length && <p className="text-center text-gray-400 mt-10">Sem histórico.</p>}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded border shadow-sm">
                        <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex gap-2"><CheckSquare size={16}/> Checklist</h4>
                        {subtasks.map((item, i) => (
                            <div key={i} className={`p-3 rounded border mb-3 transition-colors ${
                                item.done 
                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                                : 'bg-gray-50 dark:bg-gray-700/40 border-gray-200 dark:border-gray-600'
                            }`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex gap-2 flex-1 cursor-pointer" onClick={() => handleCheck(i)}>
                                        <div className={item.done ? 'text-green-600' : 'text-gray-400'}>{item.done ? <CheckSquare/> : <Square/>}</div>
                                        <span className={`text-sm ${item.done ? 'line-through text-gray-500' : ''}`}>
                                            <span className="text-blue-500 font-bold mr-2">{i+1})</span>
                                            {item.text}
                                            {hasIT(item.text) && <span className="ml-2 bg-blue-100 text-blue-700 text-[10px] px-1 rounded">IT</span>}
                                        </span>
                                    </div>
                                    <label className={`p-1 rounded cursor-pointer hover:bg-gray-200 ${isUploading ? 'opacity-50' : ''}`}>
                                        <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, i)} disabled={isUploading}/>
                                        <Camera className="text-gray-400 w-5 h-5"/>
                                    </label>
                                </div>
                                <textarea 
                                    className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-800 dark:text-gray-200 outline-none resize-y min-h-[60px]" 
                                    placeholder="Observação..." 
                                    value={item.comment||''} 
                                    onChange={(e)=>handleCommentChange(i, e.target.value)}
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {getImagesForItem(i).map((img:any, k:number) => (
                                        <div key={k} className="relative w-16 h-16 group">
                                            <img src={resolveAssetUrl(img.url)} className="w-full h-full object-cover rounded border"/>
                                            <button onClick={() => handleDeletePhoto(img.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow z-10"><Trash2 size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded border shadow-sm">
                        <h5 className="text-sm font-bold text-gray-500 uppercase mb-3 flex gap-2"><Camera size={16}/> Fotos Gerais</h5>
                        <div className="flex flex-wrap gap-2">
                             {getGeneralImages().map((img:any, k:number) => (
                                <div key={k} className="relative w-20 h-20 group">
                                    <img src={resolveAssetUrl(img.url)} className="w-full h-full object-cover rounded border shadow-sm"/>
                                    <button onClick={() => handleDeletePhoto(img.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow"><Trash2 size={14}/></button>
                                </div>
                             ))}
                             <label className={`w-20 h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-500 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 ${isUploading ? 'opacity-50' : ''}`}>
                                 <input ref={fileInputRef} type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e)} disabled={isUploading}/>
                                 <UploadCloud className="text-gray-400"/>
                             </label>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {isRunning && !showHistory && (
             <div className="mt-4 pt-4 border-t flex gap-3 bg-white dark:bg-gray-800 p-2">
                 <button onClick={() => handlePause(false)} className="bg-amber-500 hover:bg-amber-600 text-white flex-1 py-3 rounded font-bold flex justify-center gap-2"><Pause/> Salvar (Pausar)</button>
                 <button onClick={() => { if(subtasks.some(t=>!t.done) && !confirm("Finalizar pendente?")) return; handlePause(true); }} className="bg-green-600 hover:bg-green-700 text-white flex-1 py-3 rounded font-bold flex justify-center gap-2"><CheckCircle/> Finalizar</button>
             </div>
        )}
      </div>
    </Modal>
  );
};

export default OSExecutionModal;