// File: components/modals/OSDetailModal.tsx
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { OS, OSStatus, Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import OSExecutionModal from './OSExecutionModal';

interface Props { isOpen: boolean; onClose: () => void; os: OS; onEdit: () => void; }

const OSDetailModal: React.FC<Props> = ({ isOpen, onClose, os, onEdit }) => {
  const { user } = useAuth();
  const { deleteOSBatch, addOSLog, users } = useData();
  const [newLog, setNewLog] = useState('');
  const [showExecutionModal, setShowExecutionModal] = useState(false);

  const technicianName = useMemo(() => {
      const tech = users.find(u => u.id === os.technicianId);
      return tech ? tech.name : 'Não atribuído';
  }, [users, os.technicianId]);

  const handleDelete = async () => { if (confirm('Tem certeza?')) { await deleteOSBatch([os.id]); onClose(); } };
  const handleAddLog = (e: React.FormEvent) => { e.preventDefault(); if(newLog.trim()){ addOSLog(os.id, { authorId: user?.id||'Sistema', comment: newLog }); setNewLog(''); }};

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.COORDINATOR;
  const canExecute = user?.role === Role.TECHNICIAN || user?.role === Role.ADMIN || user?.role === Role.SUPERVISOR;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={`Detalhes da OS: ${os.id}`}
        footer={
          <div className="flex justify-between w-full">
            <div>
               {canExecute && os.status !== OSStatus.COMPLETED && (
                  <button onClick={() => setShowExecutionModal(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded mr-2 font-bold shadow">▶ Executar</button>
               )}
            </div>
            <div className="flex gap-2">
              {canEdit && <><button onClick={onEdit} className="btn-primary">Editar</button><button onClick={handleDelete} className="btn-danger">Excluir</button></>}
              <button onClick={onClose} className="btn-secondary">Fechar</button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs font-bold text-gray-500 uppercase">Atividade</p><p className="text-lg font-bold text-gray-800 dark:text-white">{os.activity}</p></div>
            <div className="text-right"><span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 text-blue-800">{os.status}</span></div>
          </div>

          {/* ✅ EXIBIÇÃO DE METADADOS */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-100 dark:border-blue-800 text-sm">
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 border-b border-blue-200 pb-1">Especificações Técnicas</h4>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                  <div><span className="font-semibold text-gray-600 dark:text-gray-400">Criticidade:</span> <span className="font-bold text-gray-800 dark:text-gray-200">{os.priority}</span></div>
                  <div><span className="font-semibold text-gray-600 dark:text-gray-400">Classif. 1:</span> <span className="text-gray-800 dark:text-gray-200">{os.classification1 || '-'}</span></div>
                  <div><span className="font-semibold text-gray-600 dark:text-gray-400">Classif. 2:</span> <span className="text-gray-800 dark:text-gray-200">{os.classification2 || '-'}</span></div>
                  <div><span className="font-semibold text-gray-600 dark:text-gray-400">Inatividade Plan.:</span> <span className="text-gray-800 dark:text-gray-200">{os.plannedDowntime ? `${os.plannedDowntime} min` : '0 min'}</span></div>
                  <div><span className="font-semibold text-gray-600 dark:text-gray-400">Duração Est.:</span> <span className="text-gray-800 dark:text-gray-200">{os.estimatedDuration ? `${os.estimatedDuration} min` : '-'}</span></div>
              </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
             <div><p className="text-xs text-gray-500">Início</p><p className="font-medium dark:text-gray-200">{new Date(os.startDate).toLocaleDateString()}</p></div>
             <div><p className="text-xs text-gray-500">Técnico</p><p className="font-medium dark:text-gray-200">{technicianName}</p></div>
             <div><p className="text-xs text-gray-500">Tempo Real</p><p className="font-medium dark:text-gray-200">{Math.floor((os.executionTimeSeconds || 0)/60)} min</p></div>
          </div>

          <div><h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Descrição</h4><div className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{os.description}</div></div>

          {os.imageAttachments?.length > 0 && (
             <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Galeria</h4>
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {os.imageAttachments.map((img, idx) => (
                        <div key={idx} className="bg-black/5 p-1 rounded group relative">
                            <img src={img.url} className="w-20 h-20 object-cover rounded" />
                            <p className="text-[9px] truncate max-w-[80px]">{img.fileName || img.caption}</p>
                        </div>
                    ))}
                </div>
             </div>
          )}
          
          <div className="border-t pt-4 dark:border-gray-700">
            <h4 className="text-sm font-bold mb-3 dark:text-white">Histórico</h4>
            <div className="max-h-40 overflow-y-auto space-y-3 mb-4">
              {os.logs?.map((log) => (
                <div key={log.id} className="text-sm border-l-2 border-gray-300 pl-3">
                  <div className="flex justify-between text-xs text-gray-400"><span>{log.authorId}</span><span>{new Date(log.timestamp).toLocaleString()}</span></div>
                  <p className="text-gray-700 dark:text-gray-300">{log.comment}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddLog} className="flex gap-2"><input className="input flex-1 dark:bg-gray-700 dark:text-white" placeholder="Comentário..." value={newLog} onChange={e => setNewLog(e.target.value)} /><button type="submit" className="btn-secondary text-xs">Enviar</button></form>
          </div>
        </div>
      </Modal>
      {showExecutionModal && <OSExecutionModal os={os} onClose={() => setShowExecutionModal(false)} />}
    </>
  );
};
export default OSDetailModal;