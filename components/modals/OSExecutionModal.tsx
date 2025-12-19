// File: components/modals/OSExecutionModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { OS, SubtaskItem } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  CheckSquare,
  Square,
  Camera,
  Trash2,
  UploadCloud,
  Play,
  Pause,
  Lock,
  History,
  CheckCircle,
} from 'lucide-react';

const API_BASE = 'http://192.168.18.165:8000';

interface Props {
  os: OS;
  onClose: () => void;
}

const OSExecutionModal: React.FC<Props> = ({ os, onClose }) => {
  // Hooks
  const { addOSAttachment, deleteOSAttachment, osList, reloadFromAPI } = useData();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado Local
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>(os.subtasksStatus || []);
  const [isRunning, setIsRunning] = useState(false);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockerName, setLockerName] = useState('');
  const [elapsedSession, setElapsedSession] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Live OS
  const liveOS: OS = (osList.find(o => o.id === os.id) as OS) || os;

  // --- HELPER: Resolve URL da Imagem (corrige miniaturas quebradas) ---
  // O backend salva e retorna urls relativas como "/attachments/images/<osid>/<arquivo>" [file:110]
  const resolveAssetUrl = (u?: string) => {
    if (!u) return '';
    if (u.startsWith('data:')) return u; // base64 (upload recente)
    if (u.startsWith('http://') || u.startsWith('https://')) return u; // já absoluto
    const path = u.startsWith('/') ? u : `/${u}`;
    return `${API_BASE}${path}`;
  };

  // --- HELPER: Parse UTC sem timezone (corrige +3h) ---
  // Seu backend gera ISO UTC sem Z (datetime.utcnow().isoformat()) [file:110]
  // Precisamos tratar como UTC no frontend.
  const parseUtc = (s?: string) => {
    if (!s) return null;
    // timezone válido no final: "Z" ou "+HH:MM" ou "-HH:MM"
    const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(s);
    return new Date(hasTz ? s : `${s}Z`);
  };

  // --- API CALL (URL absoluta + anti "Unexpected token <") ---
  const apiCall = async (path: string, method = 'POST', body?: any) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      // backend espera Header(...) => obrigatório no start/pause [file:110]
      'x-user-id': user?.id || '',
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const raw = await res.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const msg = data?.detail || data?.message || raw || `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  };

  // Formata segundos para Timer
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1) Inicialização (trava/estado)
  useEffect(() => {
    if (!liveOS) return;

    setSubtasks(liveOS.subtasksStatus || []);

    if (liveOS.currentExecutorId && liveOS.currentExecutorId !== user?.id) {
      setIsLockedByOther(true);
      setLockerName('Outro usuário');
      setIsRunning(false);
      setElapsedSession(0);
      return;
    }

    if (liveOS.currentExecutorId === user?.id) {
      setIsLockedByOther(false);
      setLockerName('');
      setIsRunning(true);
      return;
    }

    setIsLockedByOther(false);
    setLockerName('');
    setIsRunning(false);
    setElapsedSession(0);
  }, [liveOS, user?.id]);

  // 2) Timer (usando parseUtc para consistência com UTC)
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

  // Handlers
  const handleStart = async () => {
    try {
      await apiCall(`/api/os/${liveOS.id}/start`, 'POST');
      setIsRunning(true);
      await reloadFromAPI();
    } catch (error: any) {
      alert(error?.message || 'Erro ao iniciar execução.');
      if ((error?.message || '').includes('Bloqueado')) onClose();
    }
  };

  const handlePause = async (finished = false) => {
    try {
      const payload = { subtasksStatus: subtasks, finished };
      await apiCall(`/api/os/${liveOS.id}/pause`, 'POST', payload);

      setIsRunning(false);
      setElapsedSession(0);

      await reloadFromAPI();
      onClose();
    } catch (error: any) {
      alert('Erro ao salvar: ' + (error?.message || 'Erro desconhecido'));
    }
  };

  // --- MANIPULAÇÃO LOCAL ---
  const handleCheck = (idx: number) => {
    if (!isRunning) {
      alert("Clique em 'INICIAR EXECUÇÃO' para marcar itens.");
      return;
    }
    const newCheck = [...subtasks];
    newCheck[idx].done = !newCheck[idx].done;
    setSubtasks(newCheck);
  };

  const handleCommentChange = (idx: number, text: string) => {
    if (!isRunning) return;
    const newCheck = [...subtasks];
    newCheck[idx].comment = text;
    setSubtasks(newCheck);
  };

  // --- UPLOAD DE FOTOS ---
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, subtaskIdx?: number) => {
    if (!isRunning) {
      alert('Inicie a execução para anexar fotos.');
      return;
    }
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    const files = Array.from(e.target.files);

    const readFile = (file: File): Promise<any> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            url: reader.result as string, // base64; backend converte para /attachments/... [file:110]
            caption: subtaskIdx !== undefined ? `Item ${subtaskIdx + 1}` : 'Foto Geral',
            fileName: file.name,
            uploadedBy: user?.name || 'Técnico',
          });
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const newAttachments = await Promise.all(files.map(readFile));
      for (const att of newAttachments) {
        await addOSAttachment(liveOS.id, att);
      }
      await reloadFromAPI();
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao processar imagens.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (attId: string) => {
    if (!isRunning) return;
    if (!confirm('Excluir este anexo permanentemente?')) return;

    try {
      await deleteOSAttachment(liveOS.id, attId);
      await reloadFromAPI();
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir anexo.');
    }
  };

  const hasIT = (text: string) =>
    text.toUpperCase().includes('IT_') || text.toUpperCase().includes('INSTRUÇÃO');

  const getImagesForItem = (idx: number) =>
    (liveOS.imageAttachments || []).filter((img: any) => img.caption === `Item ${idx + 1}`);

  // --- RENDER: TELA DE BLOQUEIO ---
  if (isLockedByOther) {
    return (
      <Modal isOpen={true} onClose={onClose} title="Execução Bloqueada">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Lock className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">OS em andamento</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Esta OS está sendo executada por {lockerName || 'outra pessoa'} no momento.
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-transform transform active:scale-95"
          >
            Voltar
          </button>
        </div>
      </Modal>
    );
  }

  // --- RENDER: TELA PRINCIPAL ---
  return (
    <Modal
      isOpen={true}
      onClose={() => {
        if (!isRunning) onClose();
        else alert('Pause a execução antes de sair!');
      }}
      title={`Execução: ${liveOS.title}`}
    >
      <div className="flex flex-col h-[85vh]">
        {/* 1. Header do Timer / Ação Inicial */}
        <div
          className={`${
            isRunning ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300'
          } border rounded-lg p-4 mb-4 flex justify-between items-center transition-colors shadow-inner`}
        >
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold flex items-center justify-center gap-3 shadow-lg text-lg animate-pulse"
            >
              <Play className="w-6 h-6" />
              INICIAR / CONTINUAR EXECUÇÃO
            </button>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sessão Atual</p>
                  <p className="text-3xl font-mono font-bold text-white">{formatTime(elapsedSession)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Acumulado</p>
                <p className="text-xl font-mono text-gray-300">
                  {formatTime((liveOS.executionTimeSeconds || 0) + elapsedSession)}
                </p>
              </div>
            </>
          )}
        </div>

        {/* 2. Botão Histórico (Toggle) */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-blue-600 hover:underline text-sm font-medium"
          >
            <History className="w-4 h-4" />
            {showHistory ? 'Voltar para Checklist' : 'Ver Histórico de Execução'}
          </button>
        </div>

        {/* 3. Conteúdo */}
        <div
          className={`flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar ${
            !isRunning && !showHistory ? 'opacity-50 pointer-events-none grayscale' : ''
          }`}
        >
          {showHistory ? (
            <div className="space-y-3 p-1">
              {(!liveOS.executionHistory || liveOS.executionHistory.length === 0) && (
                <p className="text-center text-gray-500 py-10 bg-gray-50 rounded border border-dashed">
                  Nenhum histórico registrado.
                </p>
              )}

              {[...(liveOS.executionHistory || [])].reverse().map((sess: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-sm rounded-r p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-gray-800 dark:text-gray-200 block">{sess.userName}</span>
                      <span className="text-xs text-gray-500">
                        {parseUtc(sess.startTime)?.toLocaleTimeString()} - {parseUtc(sess.endTime)?.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono text-sm font-bold text-blue-600">
                        {formatTime(sess.durationSeconds)}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">Duração</span>
                    </div>
                  </div>

                  {sess.completedSubtasks && sess.completedSubtasks.length > 0 && (
                    <div className="mt-2 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-800">
                      <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase mb-1 flex items-center gap-1">
                        <CheckCircle size={10} /> Concluído nesta sessão:
                      </p>
                      <ul className="list-disc list-inside text-xs text-gray-600 dark:text-gray-300">
                        {sess.completedSubtasks.map((t: string, i: number) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Checklist */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <CheckSquare size={16} /> Lista de Verificação
                </h4>

                <div className="space-y-4">
                  {subtasks.map((item, i) => (
                    <div
                      key={i}
                      className={`bg-gray-50 dark:bg-gray-700/30 rounded p-3 border transition-colors ${
                        item.done ? 'border-green-500/50 bg-green-50/50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => handleCheck(i)}>
                          <div className={`mt-0.5 ${item.done ? 'text-green-600' : 'text-gray-400'}`}>
                            {item.done ? <CheckSquare size={20} /> : <Square size={20} />}
                          </div>
                          <div className={`text-sm ${item.done ? 'line-through text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            <span className="text-blue-500 font-bold mr-2">{i + 1})</span>
                            {item.text}
                            {hasIT(item.text) && (
                              <span className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded border border-blue-200">
                                📄 Procedimento
                              </span>
                            )}
                          </div>
                        </div>

                        <label className={`cursor-pointer p-1.5 rounded hover:bg-gray-200 ${isUploading ? 'opacity-50' : ''}`}>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            multiple
                            onChange={(e) => handlePhotoUpload(e, i)}
                            disabled={isUploading}
                          />
                          <Camera className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                        </label>
                      </div>

                      <textarea
                        className="w-full bg-white dark:bg-gray-900 border border-gray-300 rounded p-2 text-sm outline-none resize-y min-h-[60px]"
                        placeholder="Observação..."
                        value={item.comment || ''}
                        onChange={(e) => handleCommentChange(i, e.target.value)}
                      />

                      {/* Fotos do Item */}
                      {getImagesForItem(i).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {getImagesForItem(i).map((img: any) => (
                            <div key={img.id} className="relative w-16 h-16 group">
                              <img
                                src={resolveAssetUrl(img.url)}
                                className="w-full h-full object-cover rounded border"
                              />
                              <button
                                onClick={() => handleDeletePhoto(img.id)}
                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow-md z-10"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fotos Gerais */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 shadow-sm">
                <h5 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Camera size={16} /> Fotos Gerais {isUploading && <span className="text-blue-500 animate-pulse">Enviando...</span>}
                </h5>

                <div className="flex flex-wrap gap-2">
                  {(liveOS.imageAttachments || [])
                    .filter((img: any) => img.caption === 'Foto Geral')
                    .map((img: any) => (
                      <div key={img.id} className="relative w-20 h-20 group">
                        <img
                          src={resolveAssetUrl(img.url)}
                          className="w-full h-full object-cover rounded border shadow-sm"
                        />
                        <button
                          onClick={() => handleDeletePhoto(img.id)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-md"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                  <label
                    className={`w-20 h-20 flex items-center justify-center bg-gray-100 rounded border border-dashed cursor-pointer hover:bg-gray-200 ${
                      isUploading ? 'opacity-50' : ''
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={(e) => handlePhotoUpload(e)}
                      disabled={isUploading}
                    />
                    <UploadCloud className="text-gray-400" />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 4. Footer */}
        {isRunning && !showHistory && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center shrink-0 bg-white dark:bg-gray-800 p-2 gap-3">
            <button
              onClick={() => handlePause(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 text-sm px-4 py-3 rounded-lg font-bold shadow-md transition-colors flex-1 justify-center"
            >
              <Pause size={18} /> Salvar (Pausar)
            </button>

            <button
              onClick={() => {
                if (subtasks.some(t => !t.done) && !confirm('Há itens pendentes. Finalizar mesmo assim?')) return;
                handlePause(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm px-4 py-3 rounded-lg font-bold shadow-md transition-colors flex-1 justify-center"
            >
              <CheckCircle size={18} /> Finalizar OS
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OSExecutionModal;