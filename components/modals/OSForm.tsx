import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { OS, OSStatus, Priority, Role, ImageAttachment } from '../../types';
import Modal from './Modal';
import { OS_ACTIVITIES } from '../../constants';

interface OSFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: OS;
}

const OSForm: React.FC<OSFormProps> = ({ isOpen, onClose, initialData }) => {
    const { user } = useAuth();
    const { plants, users, addOS, updateOS, deleteOSAttachment } = useData();
    const isEditing = !!initialData;

    const getInitialFormData = (os?: OS) => {
        if (os) {
            return {
                description: os.description, status: os.status, priority: os.priority,
                plantId: os.plantId, technicianId: os.technicianId, supervisorId: os.supervisorId,
                startDate: os.startDate.split('T')[0], activity: os.activity, assets: os.assets,
                attachmentsEnabled: os.attachmentsEnabled,
            };
        }
        return {
            description: '', status: OSStatus.PENDING, priority: Priority.MEDIUM,
            plantId: '', technicianId: '', supervisorId: '',
            startDate: new Date().toISOString().split('T')[0], activity: '', assets: [],
            attachmentsEnabled: true,
        };
    };

    const [formData, setFormData] = useState(getInitialFormData(initialData));
    const [currentAttachments, setCurrentAttachments] = useState<ImageAttachment[]>([]);
    const [newAttachmentFiles, setNewAttachmentFiles] = useState<File[]>([]);
    const [newAttachmentCaption, setNewAttachmentCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData(initialData));
            setCurrentAttachments(initialData?.imageAttachments || []);
        } else {
            setNewAttachmentFiles([]);
            setNewAttachmentCaption('');
        }
    }, [initialData, isOpen]);
    
    // Logic for chained dropdowns
    const availableTechnicians = useMemo(() => {
        if (!formData.plantId) return [];
        return users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(formData.plantId));
    }, [formData.plantId, users]);

    const supervisorForSelectedTech = useMemo(() => {
        if (!formData.technicianId) return null;
        const tech = users.find(u => u.id === formData.technicianId);
        return users.find(u => u.id === tech?.supervisorId) || null;
    }, [formData.technicianId, users]);

    // Effect to auto-select supervisor and reset technician/supervisor when plant changes
    useEffect(() => {
        if (!isEditing) { // Only apply this logic on new OS form
            setFormData(prev => ({ ...prev, technicianId: '', supervisorId: '' }));
        }
    }, [formData.plantId, isEditing]);
    
    useEffect(() => {
        if (supervisorForSelectedTech) {
            setFormData(prev => ({...prev, supervisorId: supervisorForSelectedTech.id}));
        } else if (!isEditing) {
             setFormData(prev => ({...prev, supervisorId: ''}));
        }
    }, [supervisorForSelectedTech, isEditing]);


    const selectedPlant = plants.find(p => p.id === formData.plantId);
    const availableAssets = selectedPlant?.assets || [];
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleAssetToggle = (asset: string) => {
        setFormData(prev => ({
            ...prev,
            assets: prev.assets.includes(asset) ? prev.assets.filter(a => a !== asset) : [...prev.assets, asset],
        }));
    };

    const handleAddAttachments = () => {
        if (newAttachmentFiles.length === 0 || !user || !isEditing) return;
        setIsUploading(true);
        
        const filePromises = newAttachmentFiles.map(file => (
            new Promise<ImageAttachment>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve({
                        id: `img-${Date.now()}-${Math.random()}`,
                        url: reader.result as string,
                        uploadedBy: user.id,
                        caption: newAttachmentCaption || file.name,
                        uploadedAt: new Date().toISOString()
                    });
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            })
        ));

        Promise.all(filePromises).then(newAttachments => {
            setCurrentAttachments(prev => [...prev, ...newAttachments]);
            setNewAttachmentFiles([]);
            setNewAttachmentCaption('');
            setIsUploading(false);
        }).catch(error => {
             console.error("Erro ao processar arquivos:", error);
             setIsUploading(false);
        });
    };
    
    const handleDeleteAttachment = (attachmentId: string) => {
         setCurrentAttachments(prev => prev.filter(att => att.id !== attachmentId));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const osData = { ...formData, startDate: new Date(formData.startDate).toISOString() };

        if (isEditing) {
            updateOS({ ...initialData, ...osData, imageAttachments: currentAttachments });
        } else {
            addOS(osData);
        }
        onClose();
    };
    
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? `Editar OS: ${initialData.id}` : 'Nova Ordem de Serviço'}
            footer={
                <>
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button type="submit" form="os-form" className="btn-primary ml-3">Salvar</button>
                </>
            }
        >
            <form id="os-form" onSubmit={handleSubmit} className="space-y-4">
                <select name="activity" value={formData.activity} onChange={handleChange} required className="input w-full">
                    <option value="">Selecione a Atividade Principal</option>
                    {OS_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <textarea name="description" placeholder="Descrição detalhada" value={formData.description} onChange={handleChange} required className="input w-full min-h-[100px]"/>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select name="priority" value={formData.priority} onChange={handleChange} className="input w-full">
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className="input w-full"/>
                    <select name="plantId" value={formData.plantId} onChange={handleChange} required className="input w-full">
                        <option value="">Selecione a Usina</option>
                        {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                     <select name="technicianId" value={formData.technicianId} onChange={handleChange} required className="input w-full" disabled={!formData.plantId}>
                        <option value="">Selecione o Técnico</option>
                        {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supervisor</label>
                        <input type="text" value={supervisorForSelectedTech?.name || 'Selecione um técnico primeiro'} readOnly className="input w-full bg-gray-100 dark:bg-gray-600" />
                     </div>
                </div>

                <div>
                    <label className="form-label">Ativos Envolvidos</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-48 overflow-y-auto mt-1">
                        {availableAssets.length > 0 ? availableAssets.map(asset => (
                            <label key={asset} className="flex items-center space-x-2 text-xs cursor-pointer">
                                <input type="checkbox" checked={formData.assets.includes(asset)} onChange={() => handleAssetToggle(asset)} className="rounded" />
                                <span>{asset}</span>
                            </label>
                        )) : <p className="text-gray-500 col-span-full text-center text-sm py-4">Selecione uma usina para ver os ativos.</p>}
                    </div>
                </div>

                <label className="flex items-center space-x-2">
                    <input type="checkbox" name="attachmentsEnabled" checked={formData.attachmentsEnabled} onChange={handleChange} className="rounded" />
                    <span className="text-sm">Permitir anexos de imagem</span>
                </label>

                {isEditing && formData.attachmentsEnabled && (
                    <div className="pt-4 border-t dark:border-gray-600">
                        <h4 className="font-semibold mb-2">Anexos</h4>
                        <div className="space-y-2 mb-4">
                           {currentAttachments.map(att => (
                               <div key={att.id} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                   <div className="flex items-center min-w-0">
                                      <img src={att.url} alt={att.caption} className="w-10 h-10 object-cover rounded mr-3 flex-shrink-0" />
                                      <span className="text-sm truncate" title={att.caption}>{att.caption}</span>
                                   </div>
                                   <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="text-red-500 hover:text-red-700 p-1 flex-shrink-0">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                   </button>
                               </div>
                           ))}
                           {currentAttachments.length === 0 && <p className="text-sm text-gray-500">Nenhum anexo.</p>}
                        </div>
                        <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                             <h5 className="font-semibold text-sm">Adicionar Novo Anexo</h5>
                             <div className='flex items-center space-x-2'>
                                <label className="btn-primary text-sm cursor-pointer whitespace-nowrap">
                                    Selecionar Imagens
                                    <input type="file" accept="image/*" multiple onChange={(e) => setNewAttachmentFiles(e.target.files ? Array.from(e.target.files) : [])} className="hidden"/>
                                </label>
                                <span className="text-sm text-gray-500 truncate w-full">{newAttachmentFiles.length > 0 ? `${newAttachmentFiles.length} arquivos selecionados` : 'Nenhum arquivo selecionado.'}</span>
                             </div>
                             <input type="text" placeholder="Legenda (opcional para todos)" value={newAttachmentCaption} onChange={(e) => setNewAttachmentCaption(e.target.value)} className="input w-full"/>
                             <button type="button" onClick={handleAddAttachments} disabled={newAttachmentFiles.length === 0 || isUploading} className="btn-primary w-full disabled:bg-gray-400">
                                {isUploading ? 'Adicionando...' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
};

export default OSForm;