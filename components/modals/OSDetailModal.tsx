// File: components/modals/OSDetailModal.tsx
import React, { useState, useMemo, useRef } from 'react';
import Modal from './Modal';
import { OS, Role, Priority, OSStatus, ImageAttachment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import OSExecutionModal from './OSExecutionModal';
import { generateOSReport } from '../utils/pdfGenerator';
import { 
    Download, Edit, Trash2, Play, Lock, User, MessageSquare, 
    CheckCircle, Camera, Wifi, WifiOff, History 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useOffline } from '../../contexts/OfflineContext';
import { saveFile } from '../utils/fileSaver';

interface Props { 
    isOpen: boolean; 
    onClose: () => void; 
    os: OS; 
    onEdit: () => void; 
}

const OSDetailModal: React.FC<Props> = ({ isOpen, onClose, os, onEdit }) => {
  const { user } = useAuth();
  // 🔥 ADICIONADO: osList para buscar a versão mais recente dos dados
  const { deleteOSBatch, addOSLog, updateOS, users, plants, osList } = useData(); 
  
  // Estado Local
  const [newLog, setNewLog] = useState('');
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const { isOnline, saveOfflineAction } = useOffline();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 🔥 LIVE UPDATE: Usa a versão do Contexto se existir, senão usa a prop original
  // Isso garante que quando o ExecutionModal atualiza o banco, essa tela atualiza junto.
  const liveOS = osList.find(item => item.id === os.id) || os;

  // Helpers
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || 'N/A';
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;

  const currentPlant = plants.find(p => p.id === liveOS.plantId);
  const coordinatorName = getUserName(currentPlant?.coordinatorId || '');

  const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          return `${day}/${month}/${year}`;
      }
      return dateStr;
  };

  const parseUtc = (s?: string) => {
      if (!s) return null;
      const hasTz = /([zZ]|[+-]\d{2}:\d{2})$/.test(s);
      return new Date(hasTz ? s : `${s}Z`);
  };

  const formatTime = (totalSeconds: number) => {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const executionPermission = useMemo(() => {
      if (!user) return { allowed: false, reason: 'Usuário não logado' };
      if (liveOS.status === OSStatus.COMPLETED) return { allowed: false, reason: 'OS Finalizada' };
      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return { allowed: true, reason: '' };

      if (user.role === Role.ASSISTANT) {
          if (liveOS.priority === Priority.HIGH || liveOS.priority === Priority.URGENT) {
              return { allowed: false, reason: 'Auxiliar não executa Alta/Urgente' };
          }
          const isElectrical = liveOS.classification1 === 'Elétrica' || liveOS.classification2 === 'Elétrica';
          if (isElectrical) {
              return { allowed: false, reason: 'Auxiliar não executa Elétrica' };
          }
          const isAssigned = liveOS.assistantId === user.id || liveOS.technicianId === user.id;
          return { allowed: isAssigned, reason: isAssigned ? '' : 'Você não está escalado nesta OS' };
      }

      const isAssigned = liveOS.technicianId === user.id || liveOS.assistantId === user.id;
      return { allowed: isAssigned, reason: isAssigned ? '' : 'Somente a equipe escalada' };
  }, [user, liveOS]);

  const handleDownloadPDF = async () => {
      setIsDownloading(true);
      try {
          const helpers = { getPlantName, getUserName: (id: string) => getUserName(id) };

          // Gera o PDF (false = não salva automático, retorna o objeto jsPDF)
          const doc = await generateOSReport([liveOS], `Relatório OS ${liveOS.id}`, helpers, false);

          // Converte para Base64 puro
          const pdfBase64 = doc.output('datauristring').split(',')[1];

          // Salva usando o helper
          await saveFile(`OS_${liveOS.id}.pdf`, pdfBase64, 'application/pdf');

      } catch (error) {
          console.error(error);
          alert("Erro ao gerar PDF");
      } finally {
          setIsDownloading(false);
      }
  };

  const handleExecutionClick = () => {
      if (executionPermission.allowed) {
          setShowExecutionModal(true);
      } else {
          alert(`Execução bloqueada: ${executionPermission.reason}`);
      }
  };

  const handleDelete = () => {
      if(confirm("Tem certeza que deseja excluir esta OS?")) {
          deleteOSBatch([liveOS.id]);
          onClose();
      }
  };

  const handleAddLog = async (e?: React.FormEvent) => {
      if(e) e.preventDefault();
      if(newLog.trim()) {
          const log = { 
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
              authorId: user?.id || 'Sistema', 
              comment: newLog 
          };

          if (isOnline) {
              await addOSLog(liveOS.id, log);
          } else {
              await saveOfflineAction('ADD_LOG', liveOS.id, log);
              alert("Você está offline. O comentário foi salvo e será enviado ao reconectar.");
          }
          setNewLog('');
      }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isOnline) {
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            const newAttachment: ImageAttachment = {
                id: Date.now().toString(),
                url: base64String,
                fileName: file.name,
                uploadedBy: user?.name,
                uploadedAt: new Date().toISOString()
            };
            const updatedOS = { 
                ...liveOS, 
                imageAttachments: [...(liveOS.imageAttachments || []), newAttachment] 
            };
            await updateOS(updatedOS);
        };
        reader.readAsDataURL(file);
    } else {
        await saveOfflineAction('UPLOAD_IMAGE', liveOS.id, file); 
        alert("Foto salva na galeria offline. Será enviada automaticamente ao conectar.");
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || (user?.role === Role.COORDINATOR && currentPlant?.coordinatorId === user.id);
  const canDelete = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || (user?.role === Role.COORDINATOR && currentPlant?.coordinatorId === user.id);

  if (!isOpen) return null;

  return (
      <>
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da OS: ${liveOS.title}`}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto space-y-6 p-2 custom-scrollbar">
                
                    {/* Cabeçalho */}
                    <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                    liveOS.priority === 'Alta' || liveOS.priority === 'Urgente' ? 'bg-red-100 text-red-800' : 
                                    liveOS.priority === 'Baixa' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    Prioridade: {liveOS.priority}
                                </span>
                                {isOnline ? (
                                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded border border-green-200">
                                        <Wifi size={12} /> Online
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                        <WifiOff size={12} /> Offline (Modo Fila)
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex gap-1">
                                <button onClick={handleDownloadPDF} disabled={isDownloading} className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors" title="Baixar PDF">
                                    {isDownloading ? <span className="animate-spin">⌛</span> : <Download size={20} />}
                                </button>
                                {canEdit && <button onClick={onEdit} className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors"><Edit size={20} /></button>}
                                {canDelete && <button onClick={handleDelete} className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-300 transition-colors"><Trash2 size={20} /></button>}
                            </div>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                             Status Atual: <b className="text-gray-800 dark:text-white">{liveOS.status}</b>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase">Usina</label><p className="font-medium dark:text-gray-200">{getPlantName(liveOS.plantId)}</p></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase">Ativo</label><p className="font-medium dark:text-gray-200">{liveOS.assets.join(', ') || 'Geral'}</p></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase">Data Planejada</label><p className="font-semibold text-lg dark:text-white">{formatDate(liveOS.startDate)}</p></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase">Classificação</label><p className="font-medium dark:text-gray-200">{liveOS.classification1} {liveOS.classification2 ? `/ ${liveOS.classification2}` : ''}</p></div>
                    </div>

                    {/* Descrição */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição / Instruções</label>
                        <p className="text-sm whitespace-pre-wrap dark:text-gray-300">{liveOS.description || 'Sem descrição.'}</p>
                    </div>

                    {/* Equipe */}
                    <div className="border-t dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><User size={16}/> Equipe Escalada</h4>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                            <div><span className="block text-xs text-gray-500">Técnico</span> <div className="font-medium dark:text-gray-300">{getUserName(liveOS.technicianId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Auxiliar</span> <div className="font-medium dark:text-gray-300">{getUserName(liveOS.assistantId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Supervisor</span> <div className="font-medium dark:text-gray-300">{getUserName(liveOS.supervisorId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Coordenador</span> <div className="font-medium dark:text-gray-300">{coordinatorName}</div></div>
                        </div>
                    </div>

                    {/* Histórico */}
                    {liveOS.executionHistory && liveOS.executionHistory.length > 0 && (
                        <div className="border-t dark:border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                                    <History size={16}/> Histórico de Execução
                                </h4>
                                <button 
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="text-blue-600 hover:text-blue-700 text-xs font-bold uppercase"
                                >
                                    {showHistory ? "Recolher" : "Ver Histórico"}
                                </button>
                            </div>
                            
                            {showHistory && (
                                <div className="space-y-3 p-1">
                                    {[...liveOS.executionHistory].reverse().map((sess: any, idx: number) => (
                                        <div key={idx} className="bg-white dark:bg-gray-800 border-l-4 border-blue-500 shadow-sm rounded-r p-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-gray-800 dark:text-gray-200 block text-xs">{sess.userName}</span>
                                                    <span className="text-[10px] text-gray-500">
                                                        {parseUtc(sess.startTime)?.toLocaleTimeString()} - {parseUtc(sess.endTime)?.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block font-mono text-sm font-bold text-blue-600">{formatTime(sess.durationSeconds)}</span>
                                                </div>
                                            </div>

                                            {sess.completedSubtasks && sess.completedSubtasks.length > 0 && (
                                                <div className="mt-1 bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-100 dark:border-green-800">
                                                    <p className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase mb-1 flex items-center gap-1">
                                                        <CheckCircle size={10} /> Concluído:
                                                    </p>
                                                    <ul className="list-disc list-inside text-[10px] text-gray-600 dark:text-gray-300">
                                                        {sess.completedSubtasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Logs e Comentários */}
                    <div className="border-t dark:border-gray-700 pt-4">
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2"><MessageSquare size={16}/> Comentários & Logs</h4>
                            <span className="text-xs text-gray-400">{liveOS.imageAttachments?.length || 0} fotos</span>
                         </div>

                         <div className="space-y-2 max-h-40 overflow-y-auto mb-3 bg-gray-50 dark:bg-gray-800/50 p-2 rounded border dark:border-gray-700 custom-scrollbar">
                            {liveOS.logs?.map((log, i) => (
                                <div key={i} className="text-xs bg-white dark:bg-gray-700 p-2 rounded shadow-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="font-bold text-gray-700 dark:text-gray-200">{getUserName(log.authorId)}</span> 
                                        <span className="text-gray-400">{format(parseISO(log.timestamp), 'dd/MM HH:mm')}</span>
                                    </div>
                                    <p className="dark:text-gray-300">{log.comment}</p>
                                </div>
                            ))}
                            {(!liveOS.logs || liveOS.logs.length === 0) && <p className="text-xs text-gray-400 italic text-center">Nenhum registro.</p>}
                         </div>

                         <div className="flex gap-2 items-center">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"><Camera size={18} /></button>
                            <input className="flex-1 border rounded px-3 py-2 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Adicionar comentário..." value={newLog} onChange={e => setNewLog(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddLog()} />
                            <button onClick={() => handleAddLog()} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-700 transition-colors">Enviar</button>
                        </div>
                    </div>
                </div>

                {/* Rodapé Fixo */}
                <div className="border-t dark:border-gray-700 pt-4 mt-auto p-2 bg-white dark:bg-gray-900">
                    {liveOS.status === OSStatus.COMPLETED ? (
                        <div className="w-full py-3 bg-green-100 text-green-800 rounded-lg text-center font-bold flex items-center justify-center gap-2">
                            <CheckCircle size={20} /> OS FINALIZADA
                        </div>
                    ) : (
                        <button 
                            onClick={handleExecutionClick}
                            disabled={!executionPermission.allowed}
                            className={`w-full py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all
                                ${executionPermission.allowed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed opacity-70'}`}
                            title={executionPermission.reason}
                        >
                            {executionPermission.allowed ? <><Play size={20} /> INICIAR / CONTINUAR EXECUÇÃO</> : <><Lock size={18} /> {executionPermission.reason.toUpperCase()}</>}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
        
        {showExecutionModal && <OSExecutionModal os={liveOS} onClose={() => setShowExecutionModal(false)} />}
      </>
  );
};

export default OSDetailModal;