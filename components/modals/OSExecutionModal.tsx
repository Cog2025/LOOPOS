// File: components/modals/OSExecutionModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal';
import { OS, OSStatus, SubtaskItem, ImageAttachment } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Play, Pause, CheckSquare, Square, Camera, Trash2, AlertTriangle, UploadCloud, Save } from 'lucide-react';

interface Props {
    os: OS;
    onClose: () => void;
}

const OSExecutionModal: React.FC<Props> = ({ os, onClose }) => {
    const { patchOS, addOSAttachment, deleteOSAttachment, osList } = useData();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // LIVE OS: Garante dados frescos do contexto
    const liveOS = useMemo(() => osList.find(o => o.id === os.id) || os, [osList, os.id]);

    const [elapsed, setElapsed] = useState(liveOS.executionTimeSeconds || 0);
    const [isRunning, setIsRunning] = useState(liveOS.status === OSStatus.IN_PROGRESS);
    const [isUploading, setIsUploading] = useState(false);
    
    // Checklist local
    const initializeChecklist = (): SubtaskItem[] => {
        if (!liveOS.subtasksStatus || liveOS.subtasksStatus.length === 0) return [];
        return liveOS.subtasksStatus.map(item => ({
            id: item.id,
            text: item.text,
            done: item.done,
            comment: (item as any).comment || ''
        }));
    };
    const [checklist, setChecklist] = useState<SubtaskItem[]>(initializeChecklist());

    useEffect(() => {
        setIsRunning(liveOS.status === OSStatus.IN_PROGRESS);
    }, [liveOS.status]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning) interval = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(interval);
    }, [isRunning]);

    useEffect(() => {
        if (liveOS.status === OSStatus.PENDING) handleStart();
    }, []);

    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // --- HANDLERS ---

    const handleStart = () => {
        setIsRunning(true);
        patchOS(liveOS.id, { status: OSStatus.IN_PROGRESS, executionStart: liveOS.executionStart || new Date().toISOString() });
    };

    const handlePause = () => {
        setIsRunning(false);
        patchOS(liveOS.id, { executionTimeSeconds: elapsed });
    };

    const handleSaveAndClose = () => {
        patchOS(liveOS.id, { 
            executionTimeSeconds: elapsed,
            subtasksStatus: checklist
        });
        onClose();
    };

    const handleCheck = (idx: number) => {
        const newCheck = [...checklist];
        newCheck[idx].done = !newCheck[idx].done;
        setChecklist(newCheck);
        patchOS(liveOS.id, { subtasksStatus: newCheck });
    };

    const handleCommentChange = (idx: number, text: string) => {
        const newCheck = [...checklist];
        newCheck[idx].comment = text;
        setChecklist(newCheck);
    };

    const saveChecklist = () => {
        patchOS(liveOS.id, { subtasksStatus: checklist });
    };

    const handleFinish = () => {
        const allDone = checklist.every(i => i.done);
        if (!allDone && !confirm("Nem todos os itens foram marcados. Deseja finalizar mesmo assim?")) return;

        if (confirm("Finalizar OS e enviar para revisão?")) {
            setIsRunning(false);
            patchOS(liveOS.id, { 
                status: OSStatus.IN_REVIEW, 
                executionTimeSeconds: elapsed, 
                endDate: new Date().toISOString(), 
                subtasksStatus: checklist 
            });
            onClose();
        }
    };

    // --- UPLOAD DE FOTOS (CORRIGIDO PARA LOTE) ---
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, subtaskIdx?: number) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        const files = Array.from(e.target.files);

        // Função auxiliar para ler arquivo como Promise
        const readFile = (file: File): Promise<ImageAttachment> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        id: `temp-${Date.now()}-${Math.random()}`, // ID temporário
                        url: reader.result as string,
                        caption: subtaskIdx !== undefined ? `Item ${subtaskIdx + 1}` : "Foto Geral",
                        fileName: file.name,
                        uploadedBy: user?.name || "Técnico",
                        uploadedAt: new Date().toISOString()
                    });
                };
                reader.readAsDataURL(file);
            });
        };

        try {
            // 1. Lê todos os arquivos primeiro
            const newAttachments = await Promise.all(files.map(file => readFile(file)));

            // 2. Envia um por um, mas ESPERANDO cada um terminar antes do próximo
            // Isso evita a "corrida" onde um sobrescreve o outro no banco
            for (const att of newAttachments) {
                // Remove ID e uploadedAt pois o addOSAttachment gera novos
                const { id, uploadedAt, ...cleanAtt } = att;
                await addOSAttachment(liveOS.id, cleanAtt);
            }
        } catch (error) {
            console.error("Erro no upload:", error);
            alert("Erro ao processar imagens.");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
            setIsUploading(false);
        }
    };

    const handleDeletePhoto = async (attId: string) => {
        if(confirm("Excluir este anexo permanentemente?")) {
            await deleteOSAttachment(liveOS.id, attId);
        }
    };

    const hasIT = (text: string) => text.toUpperCase().includes("IT_") || text.toUpperCase().includes("INSTRUÇÃO");

    const getImagesForItem = (idx: number) => {
        if (!liveOS.imageAttachments) return [];
        return liveOS.imageAttachments.filter(img => img.caption === `Item ${idx + 1}`);
    };

    return (
        <Modal isOpen={true} onClose={handleSaveAndClose} title={`Execução: ${liveOS.id}`}>
            <div className="flex flex-col h-[80vh]">
                
                {/* CABEÇALHO COM CRONÔMETRO */}
                <div className="flex flex-col items-center justify-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 mb-4 shrink-0">
                    <div className="text-4xl font-mono font-bold text-green-400 mb-4 bg-gray-900 p-4 rounded shadow-inner">{formatTime(elapsed)}</div>
                    
                    {!isRunning ? (
                        <button onClick={handleStart} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transform transition hover:scale-105 flex items-center gap-2">
                            ▶ INICIAR / RETOMAR
                        </button>
                    ) : (
                        <div className="text-sm text-green-400 animate-pulse font-bold">
                            ● CRONÔMETRO ATIVO
                        </div>
                    )}
                </div>

                {/* CONTEÚDO COM SCROLL */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    
                    {/* CHECKLIST */}
                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <h4 className="text-sm font-bold text-gray-400 uppercase mb-3 border-b border-gray-700 pb-2">Lista de Verificação</h4>
                        <div className="space-y-4">
                            {checklist.map((item, i) => (
                                <div key={i} className={`bg-gray-700/30 rounded p-3 border ${item.done ? 'border-green-800' : 'border-gray-600'}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => handleCheck(i)}>
                                            <input type="checkbox" checked={item.done} readOnly className="mt-1 w-5 h-5 rounded text-green-500 bg-gray-700" />
                                            <div className={`select-none ${item.done ? "line-through text-gray-500" : "text-gray-200"}`}>
                                                <span className="text-blue-400 font-bold mr-2">{i + 1})</span>
                                                {item.text}
                                                {hasIT(item.text) && (
                                                    <span 
                                                        className="ml-2 inline-flex items-center gap-1 bg-blue-900/50 text-blue-300 text-[10px] px-2 py-0.5 rounded cursor-pointer hover:bg-blue-800 border border-blue-700"
                                                        onClick={(e) => { e.stopPropagation(); alert("Baixando Instrução de Trabalho..."); }}
                                                        title="Baixar Procedimento"
                                                    >
                                                        📄 Procedimento
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <label className={`cursor-pointer p-1 rounded hover:bg-gray-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Anexar foto ao item">
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, i)} />
                                            <Camera className="w-5 h-5 text-gray-400 hover:text-white" />
                                        </label>
                                    </div>
                                    
                                    <textarea 
                                        className="w-full bg-gray-900/50 border border-gray-600 rounded p-2 text-sm text-gray-300 placeholder-gray-500 focus:border-blue-500 outline-none mb-2"
                                        placeholder="Adicionar observação..."
                                        rows={2}
                                        value={item.comment || ''}
                                        onChange={(e) => handleCommentChange(i, e.target.value)}
                                        onBlur={saveChecklist}
                                    />

                                    {/* FOTOS DO ITEM */}
                                    {getImagesForItem(i).length > 0 && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {getImagesForItem(i).map((img, idx) => (
                                                <div key={img.id} className="relative group bg-gray-800 p-2 rounded border border-gray-700 flex items-center gap-2">
                                                    <img src={img.url} className="w-10 h-10 object-cover rounded border border-gray-600" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-gray-300 truncate" title={img.fileName}>{img.fileName}</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeletePhoto(img.id)}
                                                        className="text-red-400 hover:text-red-200 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* FOTOS GERAIS */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="mb-4">
                            <h5 className="text-xs font-bold text-gray-500 uppercase mb-2 flex justify-between items-center">
                                Fotos Gerais da OS
                                {isUploading && <span className="text-blue-400 text-[10px] animate-pulse">Enviando...</span>}
                            </h5>
                            <div className="flex flex-wrap gap-2">
                                {liveOS.imageAttachments?.filter(img => img.caption === "Foto Geral").map(img => (
                                    <div key={img.id} className="relative group w-20 h-20">
                                        <img src={img.url} className="w-full h-full object-cover rounded border border-gray-600" />
                                        <button 
                                            onClick={() => handleDeletePhoto(img.id)}
                                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                        >✕</button>
                                    </div>
                                ))}
                                <label className={`w-20 h-20 flex items-center justify-center bg-gray-700 rounded border border-gray-600 border-dashed cursor-pointer hover:bg-gray-600 transition-colors ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e)} disabled={isUploading} />
                                    <span className="text-2xl text-gray-400">+</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-auto pt-4 border-t border-gray-700 flex justify-between items-center shrink-0">
                    <button onClick={handleSaveAndClose} className="text-gray-400 hover:text-white underline text-sm">
                        Salvar e Fechar (Sem finalizar)
                    </button>
                    <button onClick={handleFinish} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded font-bold shadow-lg flex items-center gap-2">
                        ✅ Finalizar OS
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default OSExecutionModal;