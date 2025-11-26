// File: components/modals/OSDetailModal.tsx
// Este componente renderiza um modal com uma visão detalhada de uma Ordem de Serviço, incluindo um sistema de abas.

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { OS, OSLog, OSStatus, Role } from '../../types';
import Modal from './Modal';
import OSSummaryModal from './OSSummaryModal';

interface OSDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    os: OS;
    setModalConfig: (config: any) => void;
}

const STATUS_COLORS = {
    [OSStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    [OSStatus.IN_PROGRESS]: 'bg-blue-100 text-blue-800 border-blue-200',
    [OSStatus.IN_REVIEW]: 'bg-purple-100 text-purple-800 border-purple-200',
    [OSStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-200',
};

const OSDetailModal: React.FC<OSDetailModalProps> = ({ isOpen, onClose, os, setModalConfig }) => {
    const { user } = useAuth();
    const { plants, users, addOSLog, updateOS } = useData();
    
    const [activeTab, setActiveTab] = useState('details');
    const [comment, setComment] = useState('');
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    
    // Estado local para refletir a mudança de status instantaneamente
    const [currentStatus, setCurrentStatus] = useState(os.status);

    // Sincroniza se a prop mudar externamente
    useEffect(() => {
        setCurrentStatus(os.status);
    }, [os.status]);

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
        if (!user || currentStatus === newStatus) return;
        
        // Atualiza visualmente na hora
        setCurrentStatus(newStatus);

        const log: Omit<OSLog, 'id' | 'timestamp'> = { 
            authorId: user.id, 
            comment: `Status alterado de ${currentStatus} para ${newStatus}.`, 
            statusChange: { from: currentStatus, to: newStatus } 
        };
        addOSLog(os.id, log);
        updateOS({ ...os, status: newStatus });
    };

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => ( 
        <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-0.5">{value || 'N/A'}</p>
        </div> 
    );

    const TabButton: React.FC<{tabName: string; label: string}> = ({tabName, label}) => ( 
        <button 
            onClick={() => setActiveTab(tabName)} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tabName 
                ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
        >
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
                <div className="flex items-center justify-between w-full gap-4">
                    <button 
                        onClick={() => setShowSummaryModal(true)} 
                        className="flex items-center px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13 3.5a.5.5 0 01.5.5v11.566l-3.5-1.75-3.5 1.75V4a.5.5 0 01.5-.5h6z" />
                        </svg>
                        Resumo com IA
                    </button>
                    
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select 
                                value={currentStatus} 
                                onChange={(e) => handleStatusChange(e.target.value as OSStatus)} 
                                className={`appearance-none pl-4 pr-10 py-2 text-sm font-bold rounded-full border-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${STATUS_COLORS[currentStatus]}`}
                            >
                                {Object.values(OSStatus).map(status => (
                                    <option key={status} value={status} className="bg-white text-gray-900">
                                        {status}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-current">
                                <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                            </div>
                        </div>

                        <button 
                            onClick={() => setModalConfig({ type: 'OS_FORM', data: os })} 
                            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-full hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                        >
                            Editar
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-5 bg-gray-50 dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    <DetailItem label="Prioridade" value={<span className={`inline-block w-3 h-3 rounded-full mr-2 ${os.priority === 'Alta' || os.priority === 'Urgente' ? 'bg-red-500' : 'bg-green-500'}`}></span> + os.priority} />
                    <DetailItem label="Data Início" value={new Date(os.startDate).toLocaleDateString()} />
                    <DetailItem label="Usina" value={<span className="text-blue-600 dark:text-blue-400">{plant?.name}</span>} />
                    <DetailItem label="Atividade" value={os.activity} />
                    <DetailItem label="Técnico" value={technician?.name} />
                    <DetailItem label="Supervisor" value={supervisor?.name} />
                    <DetailItem label="Criado em" value={new Date(os.createdAt).toLocaleString()} />
                    <DetailItem label="Última Atualização" value={new Date(os.updatedAt).toLocaleString()} />
                </div>

                <div>
                    <div className="flex border-b dark:border-gray-700 mb-4">
                        <TabButton tabName="details" label="Descrição e Ativos" />
                        <TabButton tabName="log" label={`Atividade (${os.logs.length})`} />
                        {os.attachmentsEnabled && <TabButton tabName="attachments" label={`Anexos (${os.imageAttachments?.length || 0})`} />}
                    </div>
                    
                    <div className="min-h-[200px]">
                        {activeTab === 'details' && ( 
                            <div className="animate-fadeIn">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Descrição</h4>
                                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap border dark:border-gray-700">
                                    {os.description}
                                </div>
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mt-6 mb-3">Ativos Envolvidos</h4>
                                <div className="flex flex-wrap gap-2">
                                    {os.assets.map(asset => (
                                        <span key={asset} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-3 py-1 rounded-full font-medium border dark:border-gray-600">
                                            {asset}
                                        </span>
                                    ))}
                                </div>
                            </div> 
                        )}

                        {activeTab === 'log' && ( 
                            <div className="space-y-4 animate-fadeIn">
                                <form onSubmit={handleAddLog} className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={comment} 
                                        onChange={(e) => setComment(e.target.value)} 
                                        placeholder="Escreva um comentário..." 
                                        className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-gray-600" 
                                        disabled={!canComment} 
                                    />
                                    <button type="submit" className="btn-primary px-6" disabled={!canComment || !comment.trim()}>
                                        Enviar
                                    </button>
                                </form>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {os.logs.length > 0 ? os.logs.map(log => { 
                                        const author = users.find(u => u.id === log.authorId); 
                                        return ( 
                                            <div key={log.id} className="text-sm p-3 bg-white dark:bg-slate-800 border dark:border-gray-700 rounded-lg shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <p className="font-bold text-gray-900 dark:text-white">{author?.name}</p>
                                                    <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p className="text-gray-700 dark:text-gray-300">{log.comment}</p>
                                            </div> 
                                        ); 
                                    }) : <p className="text-sm text-center text-gray-500 py-4">Nenhuma atividade registrada.</p>}
                                </div>
                            </div> 
                        )}

                        {activeTab === 'attachments' && os.attachmentsEnabled && ( 
                            <div className="animate-fadeIn space-y-6">
                                {/* AQUI APENAS VISUALIZAÇÃO, O UPLOAD FOI MOVIDO PARA O EDITAR */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {os.imageAttachments?.map(att => ( 
                                        <div key={att.id} className="relative group rounded-lg overflow-hidden shadow-md border dark:border-gray-700">
                                            <a href={att.url} target="_blank" rel="noreferrer">
                                                <img src={att.url} alt={att.caption || 'Anexo'} className="w-full h-32 object-cover transition-transform group-hover:scale-105" />
                                            </a>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                                <p className="text-white text-xs truncate mb-1">{att.caption || 'Sem legenda'}</p>
                                            </div>
                                        </div>
                                    ))} 
                                    {(!os.imageAttachments || os.imageAttachments.length === 0) && (
                                        <p className="text-sm text-gray-500 col-span-full text-center py-8 italic">Nenhum anexo encontrado.</p>
                                    )}
                                </div>
                            </div> 
                        )}
                    </div>
                </div>
            </div>
        </Modal>
        {showSummaryModal && <OSSummaryModal isOpen={true} onClose={() => setShowSummaryModal(false)} os={os} />}
        </>
    );
};

export default OSDetailModal;