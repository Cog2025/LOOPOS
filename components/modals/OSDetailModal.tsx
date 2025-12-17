// File: components/modals/OSDetailModal.tsx
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { OS, Role, Priority, OSStatus } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import OSExecutionModal from './OSExecutionModal';
import { generateOSReport } from '../utils/pdfGenerator';
import { Download, Edit, Trash2, Play, Lock, User, MessageSquare, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface Props { 
    isOpen: boolean; 
    onClose: () => void; 
    os: OS; 
    onEdit: () => void; 
}

const OSDetailModal: React.FC<Props> = ({ isOpen, onClose, os, onEdit }) => {
  const { user } = useAuth();
  const { deleteOSBatch, addOSLog, updateOS, users, plants } = useData(); 
  const [newLog, setNewLog] = useState('');
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ✅ Helpers para traduzir IDs em Nomes
  const getUserName = (id?: string) => users.find(u => u.id === id)?.name || 'N/A';
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;

  const currentPlant = plants.find(p => p.id === os.plantId);
  const coordinatorName = getUserName(currentPlant?.coordinatorId || '');

  // ✅ CORREÇÃO DE DATA (Bulletproof)
  // Evita conversão de fuso horário tratando a string YYYY-MM-DD diretamente
  const formatDate = (dateStr: string) => {
      if (!dateStr) return '-';
      // Se vier como YYYY-MM-DD, fazemos split para garantir o dia exato
      if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          return `${day}/${month}/${year}`;
      }
      return dateStr;
  };

  // --- LÓGICA DE PERMISSÃO DE EXECUÇÃO ---
  const executionPermission = useMemo(() => {
      if (!user) return { allowed: false, reason: 'Usuário não logado' };

      if (os.status === OSStatus.COMPLETED) return { allowed: false, reason: 'OS Finalizada' };

      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return { allowed: true, reason: '' };

      if (user.role === Role.ASSISTANT) {
          if (os.priority === Priority.HIGH || os.priority === Priority.URGENT) {
              return { allowed: false, reason: 'Auxiliar não executa Alta/Urgente' };
          }
          const isElectrical = os.classification1 === 'Elétrica' || os.classification2 === 'Elétrica';
          if (isElectrical) {
              return { allowed: false, reason: 'Auxiliar não executa Elétrica' };
          }
          
          const isAssigned = os.assistantId === user.id || os.technicianId === user.id;
          return { 
              allowed: isAssigned, 
              reason: isAssigned ? '' : 'Você não está escalado nesta OS' 
          };
      }

      const isAssigned = os.technicianId === user.id || os.assistantId === user.id;
      return { 
          allowed: isAssigned, 
          reason: isAssigned ? '' : 'Somente a equipe escalada' 
      };

  }, [user, os]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
        const helpers = { getPlantName, getUserName: (id: string) => getUserName(id) };
        const doc = await generateOSReport([os], `Relatório OS ${os.id}`, helpers);
        doc.save(`OS_${os.id}.pdf`);
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
          deleteOSBatch([os.id]);
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
          
          // Atualiza via updateOS
          const updatedOS = { ...os, logs: [...(os.logs || []), log] };
          await updateOS(updatedOS);
          setNewLog('');
      }
  };

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || user?.role === Role.COORDINATOR;
  const canDelete = user?.role === Role.ADMIN || user?.role === Role.OPERATOR;

  if (!isOpen) return null;

  return (
      <>
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da OS: ${os.title}`}>
            <div className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto space-y-6 p-2">
                
                    {/* Cabeçalho de Status */}
                    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                os.priority === 'Alta' || os.priority === 'Urgente' ? 'bg-red-100 text-red-800' : 
                                os.priority === 'Baixa' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                                Prioridade: {os.priority}
                            </span>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-300">
                                 Status: <b>{os.status}</b>
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleDownloadPDF} disabled={isDownloading} className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors" title="Baixar PDF">
                                {isDownloading ? <span className="animate-spin">⌛</span> : <Download size={20} />}
                            </button>
                            {canEdit && (
                                <button onClick={onEdit} className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-300 transition-colors" title="Editar">
                                    <Edit size={20} />
                                </button>
                            )}
                            {canDelete && (
                                <button onClick={handleDelete} className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-300 transition-colors" title="Excluir">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Informações Principais */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Usina</label>
                            <p className="font-medium dark:text-gray-200">{getPlantName(os.plantId)}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Ativo</label>
                            <p className="font-medium dark:text-gray-200">{os.assets.join(', ') || 'Geral'}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Data Planejada</label>
                            {/* ✅ DATA CORRIGIDA AQUI */}
                            <p className="font-semibold text-lg dark:text-white">{formatDate(os.startDate)}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase">Classificação</label>
                            <p className="font-medium dark:text-gray-200">{os.classification1} {os.classification2 ? `/ ${os.classification2}` : ''}</p>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição / Instruções</label>
                        <p className="text-sm whitespace-pre-wrap dark:text-gray-300">{os.description || 'Sem descrição.'}</p>
                    </div>

                    {/* Equipe */}
                    <div className="border-t dark:border-gray-700 pt-4">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2"><User size={16}/> Equipe Escalada</h4>
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                            <div><span className="block text-xs text-gray-500">Técnico</span> <div className="font-medium dark:text-gray-300">{getUserName(os.technicianId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Auxiliar</span> <div className="font-medium dark:text-gray-300">{getUserName(os.assistantId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Supervisor</span> <div className="font-medium dark:text-gray-300">{getUserName(os.supervisorId)}</div></div>
                            <div><span className="block text-xs text-gray-500">Coordenador</span> <div className="font-medium dark:text-gray-300">{coordinatorName}</div></div>
                        </div>
                    </div>

                    {/* Histórico */}
                    <div className="border-t dark:border-gray-700 pt-4">
                         <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-2"><MessageSquare size={16}/> Logs</h4>
                         <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                            {os.logs?.map((log, i) => (
                                <div key={i} className="text-xs bg-gray-50 dark:bg-gray-800 p-2 rounded">
                                    <span className="font-bold">{getUserName(log.authorId)}</span> 
                                    <span className="text-gray-400 mx-2">{format(parseISO(log.timestamp), 'dd/MM HH:mm')}</span>
                                    <p className="mt-1 dark:text-gray-300">{log.comment}</p>
                                </div>
                            ))}
                            {(!os.logs || os.logs.length === 0) && <p className="text-xs text-gray-400 italic">Nenhum registro.</p>}
                         </div>
                         <div className="flex gap-2">
                            <input 
                                className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-1 focus:ring-blue-500" 
                                placeholder="Adicionar comentário..." 
                                value={newLog} 
                                onChange={e => setNewLog(e.target.value)} 
                            />
                            <button onClick={() => handleAddLog()} className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Enviar</button>
                        </div>
                    </div>

                </div>

                {/* Rodapé Fixo */}
                <div className="border-t dark:border-gray-700 pt-4 mt-auto p-2">
                    {os.status === OSStatus.COMPLETED ? (
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
                            {executionPermission.allowed ? <><Play size={20} /> INICIAR / CONTINUAR</> : <><Lock size={18} /> {executionPermission.reason.toUpperCase()}</>}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
        
        {showExecutionModal && <OSExecutionModal os={os} onClose={() => setShowExecutionModal(false)} />}
      </>
  );
};

export default OSDetailModal;