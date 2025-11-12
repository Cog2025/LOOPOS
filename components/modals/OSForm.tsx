// File: components/modals/OSForm.tsx
// Este componente renderiza o formulário modal para criar e editar Ordens de Serviço (OS).

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { OS, OSStatus, Priority, Role, ImageAttachment } from '../../types';
import Modal from './Modal';
import { OS_ACTIVITIES } from '../../constants';

// Define as propriedades que o formulário de OS espera receber.
interface OSFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: OS; // Dados da OS a ser editada. Se ausente, é um formulário de criação.
}

type NewAttachmentDraft = {
  id: string;
  file: File;
  caption: string;
};

const OSForm: React.FC<OSFormProps> = ({ isOpen, onClose, initialData }) => {
  // Acessa contextos de autenticação e dados.
  const { user } = useAuth();
  const { plants, users, addOS, updateOS } = useData();
  const isEditing = !!initialData;

  // Padronização de classes com contraste e foco visíveis (WCAG 1.4.3, 1.4.11 e 2.4.7).
  const inputClasses =
    "input w-full text-slate-900 dark:text-slate-100 placeholder-slate-600 dark:placeholder-slate-300 " +
    "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-500 " +
    "hover:border-slate-400 dark:hover:border-slate-400 " +
    "focus-visible:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 " +
    "disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-600 dark:disabled:text-slate-400 " +
    "caret-sky-600 dark:caret-sky-400";

  const readOnlyClasses =
    "input w-full bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 " +
    "border-slate-300 dark:border-slate-600 cursor-not-allowed";

  const groupLabelClasses = "block text-sm font-medium text-slate-800 dark:text-slate-100 mb-1";
  const helperTextMuted = "text-sm text-slate-600 dark:text-slate-300";

  // Função para definir o estado inicial do formulário.
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

  // Estados do formulário.
  const [formData, setFormData] = useState(getInitialFormData(initialData));
  const [currentAttachments, setCurrentAttachments] = useState<ImageAttachment[]>([]);

  // Rascunhos de novos anexos com legenda por arquivo (legenda inicia vazia).
  const [newAttachmentsDraft, setNewAttachmentsDraft] = useState<NewAttachmentDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // `useEffect` para resetar o estado do formulário quando o modal é aberto.
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData(initialData));
      setCurrentAttachments(initialData?.imageAttachments || []);
    } else {
      setNewAttachmentsDraft([]); // limpa rascunhos ao fechar.
    }
  }, [initialData, isOpen]);

  // `useMemo` otimiza a performance, recalculando a lista de técnicos apenas quando a usina selecionada ou a lista de usuários muda.
  const availableTechnicians = useMemo(() => {
    if (!formData.plantId) return [];
    return users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(formData.plantId));
  }, [formData.plantId, users]);

  // `useMemo` para encontrar o supervisor do técnico selecionado.
  const supervisorForSelectedTech = useMemo(() => {
    if (!formData.technicianId) return null;
    const tech = users.find(u => u.id === formData.technicianId);
    return users.find(u => u.id === tech?.supervisorId) || null;
  }, [formData.technicianId, users]);

  // `useEffect` para limpar a seleção de técnico/supervisor quando a usina muda no formulário de criação.
  useEffect(() => {
    if (!isEditing) {
      setFormData(prev => ({ ...prev, technicianId: '', supervisorId: '' }));
    }
  }, [formData.plantId, isEditing]);

  // `useEffect` para preencher automaticamente o supervisor quando um técnico é selecionado.
  useEffect(() => {
    setFormData(prev => ({...prev, supervisorId: supervisorForSelectedTech?.id || ''}));
  }, [supervisorForSelectedTech]);

  // Busca os ativos disponíveis para a usina selecionada.
  const selectedPlant = plants.find(p => p.id === formData.plantId);
  const availableAssets = selectedPlant?.assets || [];

  // Manipuladores de eventos do formulário.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
  };

  const handleAssetToggle = (asset: string) => {
    setFormData(prev => ({
      ...prev,
      assets: prev.assets.includes(asset)
        ? prev.assets.filter(a => a !== asset)
        : [...prev.assets, asset]
    }));
  };

  // Edita legenda de anexo existente inline.
  const handleExistingCaptionChange = (id: string, caption: string) => {
    setCurrentAttachments(prev => prev.map(a => a.id === id ? { ...a, caption } : a));
  };

  // Seleção de arquivos -> cria rascunhos com legenda vazia (placeholder será exibido).
  const handleFilesSelected = (filesList: FileList | null) => {
    const files = filesList ? Array.from(filesList) : [];
    setNewAttachmentsDraft(files.map((file, i) => ({
      id: `draft-${Date.now()}-${i}`,
      file,
      caption: "" // iniciar vazio para mostrar apenas o placeholder
    })));
  };

  // Converte rascunhos para anexos definitivos (sem fallback para nome do arquivo).
  const handleAddAttachments = () => {
    if (newAttachmentsDraft.length === 0 || !user || !isEditing) return;
    setIsUploading(true);
    const filePromises = newAttachmentsDraft.map(draft => (
      new Promise<ImageAttachment>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({
          id: `img-${Date.now()}-${Math.random()}`,
          url: reader.result as string,
          uploadedBy: user.id,
          caption: draft.caption?.trim() ?? "", // manter vazio se o usuário não preencher
          uploadedAt: new Date().toISOString()
        });
        reader.onerror = reject;
        reader.readAsDataURL(draft.file);
      })
    ));
    Promise.all(filePromises)
      .then(newAttachments => {
        setCurrentAttachments(prev => [...prev, ...newAttachments]);
        setNewAttachmentsDraft([]);
        setIsUploading(false);
      })
      .catch(error => {
        console.error("Erro ao processar arquivos:", error);
        setIsUploading(false);
      });
  };

  // ADICIONADO: remover anexo existente pelo id
    const handleDeleteAttachment = (attachmentId: string) => {
    setCurrentAttachments(prev => prev.filter(att => att.id !== attachmentId));
    };


  // Submete o formulário.
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
      title={isEditing ? `Editar OS: ${initialData?.id}` : 'Nova Ordem de Serviço'}
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="os-form" className="btn-primary ml-3">Salvar</button>
        </>
      }
    >
      <form id="os-form" onSubmit={handleSubmit} className="space-y-4">
        <select
          name="activity"
          value={formData.activity}
          onChange={handleChange}
          required
          className={`${inputClasses} dark:bg-slate-900 dark:border-slate-700`}
          aria-label="Atividade Principal"
        >
          <option value="">Selecione a Atividade Principal</option>
          {OS_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <textarea
          name="description"
          placeholder="Descrição detalhada"
          value={formData.description}
          onChange={handleChange}
          required
          className={`${inputClasses} min-h-[100px] bg-slate-50 dark:bg-slate-950 dark:border-slate-700`}
          aria-label="Descrição detalhada"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className={`${inputClasses} dark:bg-slate-900 dark:border-slate-700`}
            aria-label="Prioridade"
          >
            {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
            className={`${inputClasses} dark:bg-slate-900 dark:border-slate-700`}
            aria-label="Data de início"
          />

          <select
            name="plantId"
            value={formData.plantId}
            onChange={handleChange}
            required
            className={`${inputClasses} dark:bg-slate-900 dark:border-slate-700`}
            aria-label="Usina"
          >
            <option value="">Selecione a Usina</option>
            {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select
            name="technicianId"
            value={formData.technicianId}
            onChange={handleChange}
            required
            className={`${inputClasses} dark:bg-slate-900 dark:border-slate-700`}
            disabled={!formData.plantId}
            aria-label="Técnico"
          >
            <option value="">Selecione o Técnico</option>
            {availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          <div>
            <label className={groupLabelClasses}>Supervisor</label>
            <input
              type="text"
              value={supervisorForSelectedTech?.name || 'Selecione um técnico'}
              readOnly
              className={readOnlyClasses}
              aria-label="Supervisor"
            />
          </div>
        </div>

        <div>
          <label className={groupLabelClasses}>Ativos Envolvidos</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-2 border dark:border-slate-600 rounded-md max-h-48 overflow-y-auto mt-1">
            {availableAssets.length > 0 ? (
              availableAssets.map(asset => (
                <label key={asset} className="flex items-center space-x-2 text-xs cursor-pointer text-slate-900 dark:text-slate-100">
                  <input
                    type="checkbox"
                    checked={formData.assets.includes(asset)}
                    onChange={() => handleAssetToggle(asset)}
                    className="rounded border-slate-400 dark:border-slate-500 focus:ring-2 focus:ring-sky-500"
                  />
                  <span>{asset}</span>
                </label>
              ))
            ) : (
              <p className={`${helperTextMuted} col-span-full text-center py-4`}>
                Selecione uma usina para ver os ativos.
              </p>
            )}
          </div>
        </div>

        <label className="flex items-center space-x-2 text-slate-900 dark:text-slate-100">
          <input
            type="checkbox"
            name="attachmentsEnabled"
            checked={formData.attachmentsEnabled}
            onChange={handleChange}
            className="rounded border-slate-400 dark:border-slate-500 focus:ring-2 focus:ring-sky-500"
          />
          <span className="text-sm">Permitir anexos de imagem</span>
        </label>

        {isEditing && formData.attachmentsEnabled && (
          <div className="pt-4 border-t dark:border-slate-600">
            <h4 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">Anexos</h4>

            {/* Lista de anexos existentes com legenda editável */}
            <div className="space-y-2 mb-4">
              {currentAttachments.map(att => (
                <div key={att.id} className="flex items-center justify-between bg-slate-100 dark:bg-slate-700 p-2 rounded">
                  <div className="flex items-center min-w-0 gap-3 w-full">
                    <img src={att.url} alt={att.caption} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                    <input
                      type="text"
                      value={att.caption}
                      onChange={(e) => handleExistingCaptionChange(att.id, e.target.value)}
                      className="input text-sm w-full bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-sky-500"
                      aria-label="Legenda do anexo"
                      placeholder="Legenda deste anexo"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="ml-3 text-red-600 hover:text-red-700 p-1 flex-shrink-0 focus:ring-2 focus:ring-red-500 rounded"
                    aria-label="Remover anexo"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
              {currentAttachments.length === 0 && (
                <p className={helperTextMuted}>Nenhum anexo.</p>
              )}
            </div>

            {/* Painel de novos anexos (rascunhos) com botão de upload acessível e legenda individual */}
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Adicionar Novo Anexo</h5>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="os-new-images"
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md
                             bg-sky-600 text-white hover:bg-sky-700
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500
                             ring-offset-2 ring-offset-slate-900 cursor-pointer"
                >
                  Selecionar Imagens
                </label>
                <input
                  id="os-new-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFilesSelected(e.target.files)}
                  className="sr-only"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200 truncate w-full">
                  {newAttachmentsDraft.length > 0
                    ? `${newAttachmentsDraft.length} arquivo(s) selecionado(s)`
                    : 'Nenhum arquivo selecionado.'}
                </span>
              </div>

              {newAttachmentsDraft.length > 0 && (
                <div className="space-y-2">
                  {newAttachmentsDraft.map(draft => (
                    <div key={draft.id} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                      <span className="text-xs text-slate-600 dark:text-slate-300 truncate md:col-span-1">
                        {draft.file.name}
                      </span>
                      <input
                        type="text"
                        value={draft.caption}
                        onChange={(e) =>
                          setNewAttachmentsDraft(prev =>
                            prev.map(x => x.id === draft.id ? { ...x, caption: e.target.value } : x)
                          )
                        }
                        placeholder="Legenda desta imagem"
                        className={`${inputClasses} md:col-span-2 dark:bg-slate-900 dark:border-slate-700`}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddAttachments}
                disabled={newAttachmentsDraft.length === 0 || isUploading}
                className="btn-primary w-full disabled:bg-slate-400"
              >
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