// File: components/modals/OSDetailModal.tsx
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { OS, Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import OSExecutionModal from './OSExecutionModal';
import { generateOSReport } from '../utils/pdfGenerator';
import { Download, Edit, Trash2, Play, AlertTriangle } from 'lucide-react';

interface Props { 
    isOpen: boolean; 
    onClose: () => void; 
    os: OS; 
    onEdit: () => void; 
}

const OSDetailModal: React.FC<Props> = ({ isOpen, onClose, os, onEdit }) => {
  const { user } = useAuth();
  const { deleteOSBatch, addOSLog, users, plants } = useData();
  const [newLog, setNewLog] = useState('');
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Helpers para exibir nomes
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;

  const technicianName = getUserName(os.technicianId || '');

  // Lógica de Permissão de Execução
  const canExecute = useMemo(() => {
      if (!user) return false;
      
      // 1. Clientes nunca executam
      if (user.role === Role.CLIENT) return false;

      // 2. Admin e Operador podem executar qualquer uma (Supervisão)
      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return true;

      // 3. Técnicos só executam se forem o responsável atribuído
      if (user.role === Role.TECHNICIAN) {
          return user.id === os.technicianId;
      }

      return false;
  }, [user, os]);

  const handleDelete = async () => { 
      if (confirm('Tem certeza?')) { 
          await deleteOSBatch([os.id]); 
          onClose(); 
      } 
  };
  
  const handleAddLog = (e: React.FormEvent) => {
      e.preventDefault();
      if(newLog.trim()) {
          // ✅ CORREÇÃO: Passa um objeto conforme esperado pela interface OSLog
          addOSLog(os.id, {
              authorId: user?.id || 'Sistema',
              comment: newLog
          });
          setNewLog('');
      }
  };

  const handleDownload = async () => {
      setIsDownloading(true);
      try {
          const helpers = { getPlantName, getUserName };
          // Passamos a OS como array [os] para o gerador
          await generateOSReport([os], `OS ${os.id}`, helpers, true);
      } catch (e) {
          console.error(e);
          alert("Erro ao gerar PDF.");
      } finally {
          setIsDownloading(false);
      }
  };

  const handleExecutionClick = () => {
      if (!canExecute) {
          alert(`⛔ Acesso Negado\n\nEsta Ordem de Serviço está atribuída a ${technicianName}.\nApenas o técnico responsável pode executá-la.`);
          return;
      }
      setShowExecutionModal(true);
  };

  return (
      <>
        <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da OS: ${os.title}`}>
            <div className="space-y-4 p-1">
            {/* Header de Status e Ações Rápidas */}
            <div className="flex justify-between items-start bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${os.status === 'Concluído' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {os.status}
                    </span>
                    <h3 className="text-lg font-bold mt-1 dark:text-white">{os.activity}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{getPlantName(os.plantId)}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownload} disabled={isDownloading} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-white rounded-full transition-colors" title="Baixar PDF">
                        <Download size={18} />
                    </button>
                    {/* Apenas Admin/Operador edita ou deleta */}
                    {(user?.role === Role.ADMIN || user?.role === Role.OPERATOR) && (
                        <>
                            <button onClick={() => { onEdit(); onClose(); }} className="p-2 text-gray-600 hover:text-orange-600 hover:bg-white rounded-full transition-colors" title="Editar">
                                <Edit size={18} />
                            </button>
                            <button onClick={handleDelete} className="p-2 text-gray-600 hover:text-red-600 hover:bg-white rounded-full transition-colors" title="Excluir">
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Técnico Responsável</label>
                    <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${os.technicianId === user?.id ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="dark:text-gray-200">{technicianName}</span>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Prioridade</label>
                    <span className={`mt-1 inline-block ${os.priority === 'Alta' || os.priority === 'Urgente' ? 'text-red-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>{os.priority}</span>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Data Agendada</label>
                    <span className="dark:text-gray-300">{new Date(os.startDate).toLocaleDateString()}</span>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase">Duração Estimada</label>
                    <span className="dark:text-gray-300">{os.estimatedDuration ? `${os.estimatedDuration} min` : '-'}</span>
                </div>
            </div>

            {os.description && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-100 dark:border-yellow-800">
                    <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 uppercase mb-1">Descrição / Instruções</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{os.description}</p>
                </div>
            )}

            {/* GALERIA DE FOTOS (Visualização Rápida) */}
            {os.imageAttachments && os.imageAttachments.length > 0 && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Evidências Anexadas ({os.imageAttachments.length})</label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {os.imageAttachments.map((img, idx) => (
                            <div key={idx} className="shrink-0 w-24 border dark:border-gray-600 rounded p-1 bg-white dark:bg-gray-800 shadow-sm">
                                <img src={img.url} className="w-full h-16 object-cover rounded" alt={img.fileName} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div className="border-t pt-4 dark:border-gray-700">
                <h4 className="text-sm font-bold mb-3 dark:text-white">Histórico e Comentários</h4>
                <div className="max-h-40 overflow-y-auto space-y-3 mb-4 custom-scrollbar bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {os.logs?.length === 0 && <p className="text-xs text-gray-400 text-center italic">Nenhum registro ainda.</p>}
                {os.logs?.map((log) => (
                    <div key={log.id} className="text-sm border-l-2 border-blue-300 pl-3">
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span className="font-bold text-gray-600 dark:text-gray-300">{getUserName(log.authorId)}</span>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-xs mt-0.5">{log.comment}</p>
                    </div>
                ))}
                </div>
                <form onSubmit={handleAddLog} className="flex gap-2">
                    <input 
                        className="flex-1 border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 outline-none focus:ring-1 focus:ring-blue-500" 
                        placeholder="Adicionar comentário..." 
                        value={newLog} 
                        onChange={e => setNewLog(e.target.value)} 
                    />
                    <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Enviar</button>
                </form>
            </div>

            {/* AREA DE AÇÃO PRINCIPAL */}
            <div className="pt-4 mt-2 border-t dark:border-gray-700">
                {os.status === 'Concluído' ? (
                    <div className="bg-green-100 text-green-800 p-3 rounded text-center font-bold flex items-center justify-center gap-2">
                        <span>✅</span> OS Finalizada
                    </div>
                ) : (
                    <button 
                        onClick={handleExecutionClick}
                        disabled={!canExecute}
                        className={`w-full py-3 rounded-lg font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all
                            ${canExecute 
                                ? 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]' 
                                : 'bg-gray-400 cursor-not-allowed opacity-70'
                            }`}
                    >
                        {canExecute ? (
                            <>
                                <Play size={20} fill="currentColor" /> 
                                <span>INICIAR / CONTINUAR EXECUÇÃO</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={18} /> 
                                <span>SOMENTE O TÉCNICO RESPONSÁVEL</span>
                            </>
                        )}
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