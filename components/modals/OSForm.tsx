// File: components/modals/OSForm.tsx
// Este componente renderiza o formulário modal para criar e editar Ordens de Serviço (OS).

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

type NewAttachmentDraft = {
  id: string;
  file: File;
  caption: string;
  previewUrl: string;
};

const OSForm: React.FC<OSFormProps> = ({ isOpen, onClose, initialData }) => {
  const { user } = useAuth();
  const { plants, users, addOS, updateOS, addOSAttachment, deleteOSAttachment } = useData();
  const isEditing = !!initialData;

  // Estilos aprimorados
  const inputClasses = "input w-full text-slate-900 dark:text-white bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-md placeholder-slate-400 dark:placeholder-slate-300";
  const labelClasses = "block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1";

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
  const [newAttachmentsDraft, setNewAttachmentsDraft] = useState<NewAttachmentDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(initialData));
      setCurrentAttachments(initialData?.imageAttachments || []);
      setNewAttachmentsDraft([]);
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    return () => {
        newAttachmentsDraft.forEach(draft => URL.revokeObjectURL(draft.previewUrl));
    };
  }, [newAttachmentsDraft]);

  const availableTechnicians = useMemo(() => {
    if (!formData.plantId) return [];
    return users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(formData.plantId));
  }, [formData.plantId, users]);

  const supervisorForSelectedTech = useMemo(() => {
    if (!formData.technicianId) return null;
    const tech = users.find(u => u.id === formData.technicianId);
    return users.find(u => u.id === tech?.supervisorId) || null;
  }, [formData.technicianId, users]);

  useEffect(() => {
    if (!isEditing) {
      setFormData(prev => ({ ...prev, technicianId: '', supervisorId: '' }));
    }
  }, [formData.plantId, isEditing]);

  useEffect(() => {
    setFormData(prev => ({...prev, supervisorId: supervisorForSelectedTech?.id || ''}));
  }, [supervisorForSelectedTech]);

  const selectedPlant = plants.find(p => p.id === formData.plantId);
  const availableAssets = selectedPlant?.assets || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleAssetToggle = (asset: string) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.includes(asset) ? prev.assets.filter(a => a !== asset) : [...prev.assets, asset]
    }));
  };

  const handleFilesSelected = (filesList: FileList | null) => {
    if (!filesList) return;
    const files = Array.from(filesList);
    
    const newDrafts = files.map((file, i) => ({
      id: `draft-${Date.now()}-${i}`,
      file,
      caption: "",
      previewUrl: URL.createObjectURL(file)
    }));
    
    setNewAttachmentsDraft(prev => [...prev, ...newDrafts]);
  };

  const handleRemoveDraft = (id: string) => {
    setNewAttachmentsDraft(prev => prev.filter(draft => draft.id !== id));
  };

  const handleUploadAll = async () => {
    if (newAttachmentsDraft.length === 0 || !initialData) return;
    setIsUploading(true);

    const finalFD = new FormData();
    newAttachmentsDraft.forEach(d => {
        finalFD.append('files', d.file);
        finalFD.append('captions', d.caption);
    });

    try {
        const res = await fetch(`/api/os/${initialData.id}/attachments`, { method: 'POST', body: finalFD });
        if (res.ok) {
            const saved = await res.json();
            saved.forEach((att: any) => addOSAttachment(initialData.id, att));
            setCurrentAttachments(prev => [...prev, ...saved]);
            setNewAttachmentsDraft([]);
            alert("Upload realizado com sucesso!");
        } else {
            alert("Erro no upload.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão.");
    } finally {
        setIsUploading(false);
    }
  };

  const handleDeleteExisting = async (attId: string) => {
    if (!initialData || !confirm("Excluir este anexo permanentemente?")) return;
    try {
        await fetch(`/api/os/${initialData.id}/attachments/${attId}`, { method: "DELETE" });
        deleteOSAttachment(initialData.id, attId);
        setCurrentAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (error) {
        console.error(error);
        alert("Erro ao excluir.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const osData = { ...formData, startDate: new Date(formData.startDate).toISOString() };
    if (isEditing) {
      updateOS({ ...initialData, ...osData });
    } else {
      addOS(osData);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Editar OS: ${initialData?.id}` : 'Nova Ordem de Serviço'}
      footer={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200">Cancelar</button>
          <button type="submit" form="os-form" className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Salvar Dados</button>
        </>
      }
    >
      <div className="space-y-6">
          <form id="os-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo Atividade */}
            <div>
                <label className={labelClasses}>Atividade Principal</label>
                <select name="activity" value={formData.activity} onChange={handleChange} required className={inputClasses}>
                    <option value="">Selecione a Atividade</option>
                    {OS_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
            </div>
            
            {/* Campo Descrição */}
            <div>
                <label className={labelClasses}>Descrição Detalhada</label>
                <textarea 
                    name="description" 
                    placeholder="Descreva o trabalho a ser realizado..." 
                    value={formData.description} 
                    onChange={handleChange} 
                    required 
                    className={`${inputClasses} min-h-[80px]`} 
                />
            </div>
            
            {/* Grid Prioridade e Data */}
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClasses}>Prioridade</label>
                    <select name="priority" value={formData.priority} onChange={handleChange} className={inputClasses}>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className={labelClasses}>Data de Início</label>
                    <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required className={inputClasses} />
                 </div>
            </div>

            {/* Grid Usina e Técnico */}
            <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClasses}>Usina</label>
                    <select name="plantId" value={formData.plantId} onChange={handleChange} required className={inputClasses} disabled={isEditing}>
                        <option value="">Selecione a Usina</option>
                        {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className={labelClasses}>Técnico Responsável</label>
                    <select name="technicianId" value={formData.technicianId} onChange={handleChange} required className={inputClasses}>
                        <option value="">Selecione o Técnico</option>
                        {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
            </div>
            
            {/* Ativos */}
            <div>
                <label className={labelClasses}>Ativos Envolvidos</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border border-slate-300 dark:border-slate-500 rounded-md max-h-32 overflow-y-auto bg-gray-50 dark:bg-slate-800">
                    {availableAssets.length > 0 ? availableAssets.map(asset => (
                    <label key={asset} className="flex items-center space-x-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={formData.assets.includes(asset)} onChange={() => handleAssetToggle(asset)} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="dark:text-gray-300">{asset}</span>
                    </label>
                    )) : <p className="text-xs text-gray-500 col-span-full text-center py-2">Selecione uma usina para ver os ativos.</p>}
                </div>
            </div>

          </form>

          {/* SEÇÃO DE ANEXOS (Só aparece na edição) */}
          {isEditing && (
            <div className="border-t pt-6 dark:border-gray-700">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300 mr-2">ANEXOS</span>
                    Galeria de Imagens
                </h4>
                
                {/* Lista de Existentes */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {currentAttachments.map(att => (
                        <div key={att.id} className="relative group rounded-md overflow-hidden border dark:border-gray-600 shadow-sm">
                            <img src={att.url} className="w-full h-24 object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] text-white truncate max-w-[70%]">{att.caption || 'Sem legenda'}</span>
                                <button type="button" onClick={() => handleDeleteExisting(att.id)} className="text-red-400 hover:text-red-200 p-1" title="Excluir">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                    {currentAttachments.length === 0 && (
                        <div className="col-span-2 text-center py-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                            <p className="text-xs text-gray-500">Nenhum anexo nesta OS.</p>
                        </div>
                    )}
                </div>

                {/* Área de Upload */}
                <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                        <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            Selecionar Fotos
                        </label>
                        <input id="file-upload" type="file" multiple accept="image/*" onChange={(e) => handleFilesSelected(e.target.files)} className="hidden" />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{newAttachmentsDraft.length > 0 ? `${newAttachmentsDraft.length} arquivo(s) selecionado(s)` : 'Nenhum arquivo selecionado'}</span>
                    </div>

                    {/* Lista de Rascunhos */}
                    {newAttachmentsDraft.length > 0 && (
                        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1">
                            {newAttachmentsDraft.map(draft => (
                                <div key={draft.id} className="flex items-center gap-3 bg-white dark:bg-slate-700 p-2 rounded border dark:border-slate-600 shadow-sm">
                                    <img src={draft.previewUrl} className="w-10 h-10 object-cover rounded border dark:border-gray-600" />
                                    <input 
                                        type="text" 
                                        value={draft.caption} 
                                        onChange={(e) => setNewAttachmentsDraft(prev => prev.map(d => d.id === draft.id ? { ...d, caption: e.target.value } : d))}
                                        placeholder="Legenda..." 
                                        className="flex-1 text-xs px-2 py-1.5 border rounded dark:bg-slate-800 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button onClick={() => handleRemoveDraft(draft.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors">✕</button>
                                </div>
                            ))}
                        </div>
                    )}

                    {newAttachmentsDraft.length > 0 && (
                        <button 
                            type="button" 
                            onClick={handleUploadAll} 
                            disabled={isUploading}
                            className="w-full bg-green-600 text-white py-2.5 rounded-md font-bold hover:bg-green-700 disabled:bg-gray-400 transition-all shadow-md flex justify-center items-center"
                        >
                            {isUploading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Enviando...
                                </>
                            ) : `⬆️ Fazer Upload Agora`}
                        </button>
                    )}
                </div>
            </div>
          )}
      </div>
    </Modal>
  );
};

export default OSForm;