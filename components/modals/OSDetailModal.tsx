import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { OS, OSLog, OSStatus, Role, ImageAttachment } from '../../types';
import Modal from './Modal';
import OSSummaryModal from './OSSummaryModal';

interface OSDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    os: OS;
    setModalConfig: (config: any) => void;
}

const OSDetailModal: React.FC<OSDetailModalProps> = ({ isOpen, onClose, os, setModalConfig }) => {
    const { user } = useAuth();
    const { plants, users, addOSLog, updateOS } = useData();
    
    const [activeTab, setActiveTab] = useState('details');
    const [comment, setComment] = useState('');
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    const plant = plants.find(p => p.id === os.plantId);
    const technician = users.find(u => u.id === os.technicianId);
    const supervisor = users.find(u => u.id === os.supervisorId);

    const canComment = user?.role === Role.ADMIN || user?.id === os.technicianId || user?.id === os.supervisorId;

    const handleAddLog = (e: React.FormEvent) => {
        e.preventDefault();
        if (!comment.trim() || !user) return;
        addOSLog(os.id, { authorId: user.id, comment });
        setComment('');
    };
    
    const handleStatusChange = (newStatus: OSStatus) => {
        if (!user || os.status === newStatus) return;
        
        const log: Omit<OSLog, 'id' | 'timestamp'> = {
            authorId: user.id,
            comment: `Status alterado de ${os.status} para ${newStatus}.`,
            statusChange: { from: os.status, to: newStatus }
        };
        addOSLog(os.id, log);
        updateOS({ ...os, status: newStatus });
    };

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value || 'N/A'}</p>
        </div>
    );
    
    const TabButton: React.FC<{tabName: string; label: string}> = ({tabName, label}) => (
        <button onClick={() => setActiveTab(tabName)} className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === tabName ? 'bg-gray-100 dark:bg-gray-700 border-b-2 border-blue-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            {label}
        </button>
    );

    return (
        <>
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Detalhes da OS: ${os.id}`}
            footer={
                <div className="flex justify-between w-full">
                    <button onClick={() => setShowSummaryModal(true)} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /><path d="M13 3.5a.5.5 0 01.5.5v11.566l-3.5-1.75-3.5 1.75V4a.5.5 0 01.5-.5h6zM10 7a.5.5 0 000 1h3a.5.5 0 000-1h-3zM7 9a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 017 9z" /></svg>
                       Resumo com IA
                    </button>
                    <div className="flex items-center">
                        <select
                            value={os.status}
                            onChange={(e) => handleStatusChange(e.target.value as OSStatus)}
                            className="input mr-3"
                            style={{ backgroundColor: { [OSStatus.PENDING]: '#f59e0b', [OSStatus.IN_PROGRESS]: '#3b82f6', [OSStatus.IN_REVIEW]: '#8b5cf6', [OSStatus.COMPLETED]: '#22c55e' }[os.status], color: 'white' }}
                        >
                            {Object.values(OSStatus).map(status => <option key={status} value={status} style={{backgroundColor: '#4b5563', color: 'white'}}>{status}</option>)}
                        </select>
                        <button onClick={() => setModalConfig({ type: 'OS_FORM', data: os })} className="btn-primary">Editar</button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <DetailItem label="Prioridade" value={os.priority} />
                    <DetailItem label="Data Início" value={new Date(os.startDate).toLocaleDateString()} />
                    <DetailItem label="Usina" value={`${plant?.name} (${plant?.client})`} />
                    <DetailItem label="Atividade" value={os.activity} />
                    <DetailItem label="Técnico" value={technician?.name} />
                    <DetailItem label="Supervisor" value={supervisor?.name} />
                     <DetailItem label="Criado em" value={new Date(os.createdAt).toLocaleString()} />
                     <DetailItem label="Última Atualização" value={new Date(os.updatedAt).toLocaleString()} />
                </div>
                
                <div className="border-b dark:border-gray-600">
                    <TabButton tabName="details" label="Descrição e Ativos" />
                    <TabButton tabName="log" label={`Atividade (${os.logs.length})`} />
                    {os.attachmentsEnabled && <TabButton tabName="attachments" label={`Anexos (${os.imageAttachments.length})`} />}
                </div>
                
                <div className="p-1 min-h-[200px]">
                    {activeTab === 'details' && (
                        <div>
                            <h4 className="font-semibold mb-2">Descrição</h4>
                            <p className="text-sm whitespace-pre-wrap">{os.description}</p>
                            <h4 className="font-semibold mt-4 mb-2">Ativos Envolvidos</h4>
                            <div className="flex flex-wrap gap-2">
                                {os.assets.map(asset => <span key={asset} className="bg-gray-200 dark:bg-gray-600 text-xs px-2 py-1 rounded-full">{asset}</span>)}
                            </div>
                        </div>
                    )}
                    {activeTab === 'log' && (
                         <div className="space-y-4">
                            <form onSubmit={handleAddLog} className="flex space-x-2">
                                <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Adicionar comentário..." className="input w-full" disabled={!canComment} />
                                <button type="submit" className="btn-primary" disabled={!canComment || !comment.trim()}>Enviar</button>
                            </form>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                                {os.logs.length > 0 ? os.logs.map(log => {
                                    const author = users.find(u => u.id === log.authorId);
                                    return (
                                        <div key={log.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                            <p className="font-semibold">{author?.name} <span className="text-xs font-normal text-gray-500 dark:text-gray-400">em {new Date(log.timestamp).toLocaleString()}</span></p>
                                            <p className="mt-1">{log.comment}</p>
                                        </div>
                                    );
                                }) : <p className="text-sm text-center text-gray-500">Nenhuma atividade registrada.</p>}
                            </div>
                         </div>
                    )}
                    {activeTab === 'attachments' && os.attachmentsEnabled && (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-64 overflow-y-auto">
                                {os.imageAttachments.map(att => (
                                    <div key={att.id} className="relative group">
                                        <img src={att.url} alt={att.caption || 'Anexo'} className="w-full h-24 object-cover rounded-md" />
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                                            <p className="text-white text-xs truncate">{att.caption}</p>
                                        </div>
                                    </div>
                                ))}
                                 {os.imageAttachments.length === 0 && <p className="text-sm text-gray-500 col-span-full text-center">Nenhum anexo encontrado.</p>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
        {showSummaryModal && <OSSummaryModal isOpen={true} onClose={() => setShowSummaryModal(false)} os={os} />}
        </>
    );
};

export default OSDetailModal;