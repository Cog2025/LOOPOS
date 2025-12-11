// File: components/modals/OSExecutionModal.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from './Modal';
import { OS, OSStatus, SubtaskItem, ImageAttachment } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, CheckSquare, Square, Camera, Trash2, UploadCloud, Save, PauseCircle } from 'lucide-react';

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

    // CRONÔMETRO AUTOMÁTICO (Auto-start, sem pausa manual)
    useEffect(() => {
        if (liveOS.status !== OSStatus.IN_PROGRESS) {
            patchOS(liveOS.id, { 
                status: OSStatus.IN_PROGRESS, 
                executionStart: liveOS.executionStart || new Date().toISOString() 
            });
        }

        const interval = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (sec: number) => {
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // --- HANDLERS ---

    const handleSaveAndClose = async () => {
        await patchOS(liveOS.id, { 
            executionTimeSeconds: elapsed,
            subtasksStatus: checklist
        });
        onClose();
    };

    const handleCheck = (idx: number) => {
        const newCheck = [...checklist];
        newCheck[idx].done = !newCheck[idx].done;
        setChecklist(newCheck);
        // Opcional: salvar em tempo real
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

    const handleFinish = async () => {
        const allDone = checklist.every(i => i.done);
        if (!allDone && !confirm("Nem todos os itens foram marcados. Deseja finalizar mesmo assim?")) return;

        if (confirm("Finalizar OS e enviar para revisão?")) {
            await patchOS(liveOS.id, { 
                status: OSStatus.IN_REVIEW, 
                executionTimeSeconds: elapsed, 
                endDate: new Date().toISOString(), 
                subtasksStatus: checklist 
            });
            onClose();
        }
    };

    // --- UPLOAD DE FOTOS (CORRIGIDO) ---
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, subtaskIdx?: number) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setIsUploading(true);
        const files = Array.from(e.target.files);

        // ✅ CORREÇÃO: Removemos propriedades extras (timestamp, type) que não existem na interface
        const readFile = (file: File): Promise<Omit<ImageAttachment, 'id' | 'uploadedAt'>> => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        url: reader.result as string,
                        caption: subtaskIdx !== undefined ? `Item ${subtaskIdx + 1}` : "Foto Geral",
                        fileName: file.name,
                        uploadedBy: user?.name || "Técnico"
                    });
                };
                reader.readAsDataURL(file);
            });
        };

        try {
            // 1. Lê todos os arquivos
            const newAttachments = await Promise.all(files.map(file => readFile(file)));

            // 2. Envia um por um
            for (const att of newAttachments) {
                await addOSAttachment(liveOS.id, att);
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
        <Modal isOpen={true} onClose={handleSaveAndClose} title={`Execução: ${liveOS.title}`}>
            <div className="flex flex-col h-[80vh]">
                
                {/* CABEÇALHO COM CRONÔMETRO (Sem botões de controle) */}
                <div className="flex flex-col items-center justify-center py-6 bg-gray-900 rounded-lg border border-gray-700 mb-4 shrink-0 relative overflow-hidden shadow-inner">
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                        <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Gravando</span>
                    </div>
                    
                    <Clock size={32} className="text-blue-400 mb-2 opacity-80" />
                    <div className="text-5xl font-mono font-bold text-white tracking-widest tabular-nums drop-shadow-md">
                        {formatTime(elapsed)}
                    </div>
                    <p className="text-xs text-gray-400 mt-2 uppercase tracking-wide">Tempo Total Decorrido</p>
                </div>

                {/* CONTEÚDO COM SCROLL */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    
                    {/* CHECKLIST */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
                            <CheckSquare size={16} /> Lista de Verificação
                        </h4>
                        <div className="space-y-4">
                            {checklist.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">Nenhum item de verificação.</p>}
                            {checklist.map((item, i) => (
                                <div key={i} className={`bg-gray-50 dark:bg-gray-700/30 rounded p-3 border transition-colors ${item.done ? 'border-green-500/50 bg-green-50/50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-600'}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => handleCheck(i)}>
                                            <div className={`mt-0.5 ${item.done ? 'text-green-600' : 'text-gray-400'}`}>
                                                {item.done ? <CheckSquare size={20} /> : <Square size={20} />}
                                            </div>
                                            <div className={`select-none text-sm ${item.done ? "line-through text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>
                                                <span className="text-blue-500 font-bold mr-2">{i + 1})</span>
                                                {item.text}
                                                {hasIT(item.text) && (
                                                    <span 
                                                        className="ml-2 inline-flex items-center gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] px-2 py-0.5 rounded cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700"
                                                        onClick={(e) => { e.stopPropagation(); alert("Baixando Instrução de Trabalho..."); }}
                                                        title="Baixar Procedimento"
                                                    >
                                                        📄 Procedimento
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <label className={`cursor-pointer p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`} title="Anexar foto ao item">
                                            <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e, i)} />
                                            <Camera className="w-5 h-5 text-gray-400 hover:text-blue-500" />
                                        </label>
                                    </div>
                                    
                                    <textarea 
                                        className="w-full bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded p-2 text-sm text-gray-800 dark:text-gray-300 placeholder-gray-400 focus:border-blue-500 outline-none mb-2 resize-y min-h-[60px]"
                                        placeholder="Adicionar observação..."
                                        rows={2}
                                        value={item.comment || ''}
                                        onChange={(e) => handleCommentChange(i, e.target.value)}
                                        onBlur={saveChecklist}
                                    />

                                    {/* FOTOS DO ITEM (CORRIGIDO: Ícone maior e fixo) */}
                                    {getImagesForItem(i).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {getImagesForItem(i).map((img) => (
                                                <div key={img.id} className="relative group w-16 h-16">
                                                    <img src={img.url} className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-600 shadow-sm" />
                                                    <button 
                                                        onClick={() => handleDeletePhoto(img.id)}
                                                        // ✅ Botão de deletar fixo e maior
                                                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-md z-10"
                                                        title="Excluir imagem"
                                                    >
                                                        <Trash2 size={16} />
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
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h5 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 flex justify-between items-center">
                            <span className="flex items-center gap-2"><Camera size={16} /> Fotos Gerais da OS</span>
                            {isUploading && <span className="text-blue-500 text-[10px] animate-pulse font-bold">Enviando...</span>}
                        </h5>
                        <div className="flex flex-wrap gap-2">
                            {liveOS.imageAttachments?.filter(img => img.caption === "Foto Geral").map(img => (
                                <div key={img.id} className="relative group w-20 h-20">
                                    <img src={img.url} className="w-full h-full object-cover rounded border border-gray-300 dark:border-gray-600 shadow-sm" />
                                    <button 
                                        onClick={() => handleDeletePhoto(img.id)}
                                        // ✅ Botão de deletar fixo e maior (Consistência)
                                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1.5 shadow-md flex items-center justify-center z-10"
                                        title="Excluir imagem"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            <label className={`w-20 h-20 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 border-dashed cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${isUploading ? 'opacity-50 cursor-wait' : ''}`}>
                                <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => handlePhotoUpload(e)} disabled={isUploading} />
                                {isUploading ? <UploadCloud className="animate-bounce text-gray-400" /> : <span className="text-2xl text-gray-400">+</span>}
                            </label>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0 bg-white dark:bg-gray-800 p-2 gap-3">
                    
                    {/* ✅ BOTÃO SALVAR (PAUSAR) DESTACADO */}
                    <button 
                        onClick={handleSaveAndClose} 
                        className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-2 text-sm px-4 py-3 rounded-lg font-bold shadow-md transition-colors flex-1 justify-center"
                    >
                        <Save size={18} /> 
                        <span>Salvar (Pausar)</span>
                    </button>

                    <button 
                        onClick={handleFinish} 
                        className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-sm px-4 py-3 rounded-lg font-bold shadow-md transition-colors flex-1 justify-center"
                    >
                        <span>✅</span> 
                        <span>Finalizar OS</span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default OSExecutionModal;