// File: components/modals/OSForm.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { OS, OSStatus, Priority, Role } from '../../types';
import Modal from './Modal';

// --- COMPONENTE INTERNO: SELECT PESQUISÁVEL ---
interface Option { label: string; value: string; }
interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedLabel = options.find(o => o.value === value)?.label || '';
    const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!search) return options;
        const s = normalize(search);
        return options.filter(o => normalize(o.label).includes(s));
    }, [options, search]);

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`w-full p-2 border rounded text-sm flex justify-between items-center bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => { if (!disabled) { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 100); } }}
            >
                <span className="truncate">{selectedLabel || placeholder || 'Selecione...'}</span>
                <span className="ml-2 text-gray-500">▼</span>
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
                    <div className="p-2 sticky top-0 bg-white dark:bg-gray-700 border-b dark:border-gray-600">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full p-1 border rounded text-sm dark:bg-gray-800 dark:text-white dark:border-gray-600"
                            placeholder="Buscar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={`p-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-gray-100 ${option.value === value ? 'bg-blue-100 dark:bg-gray-600 font-bold' : ''}`}
                                onClick={() => { onChange(option.value); setIsOpen(false); setSearch(''); }}
                            >
                                {option.label}
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-sm text-gray-500 text-center">Nenhum resultado</div>
                    )}
                </div>
            )}
        </div>
    );
};

interface Props {
    isOpen: boolean;
    onClose: () => void;
    initialData?: OS;
}

const OSForm: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
    const { addOS, updateOS, plants, users, maintenancePlans } = useData();
    const { user } = useAuth();
    
    // Estado do formulário
    const [formData, setFormData] = useState<Partial<OS>>({
        title: '', description: '', status: OSStatus.PENDING, priority: Priority.MEDIUM,
        plantId: '', technicianId: '', supervisorId: '', assistantId: '', 
        startDate: new Date().toISOString().split('T')[0],
        activity: '', assets: [], 
        classification1: '', classification2: '',
        ...initialData
    });

    const [selectedAsset, setSelectedAsset] = useState<string>('');

    // Efeito para carregar dados iniciais e popular classificações baseadas na tarefa
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
            if (initialData.assets && initialData.assets.length > 0) {
                setSelectedAsset(initialData.assets[0]);
            }
        }
    }, [initialData]);

    // Opções de Usinas (Filtradas para Clientes)
    const plantOptions = useMemo(() => {
        let filteredPlants = plants;
        if (user?.role === Role.CLIENT) {
            filteredPlants = plants.filter(p => user.plantIds?.includes(p.id));
        }
        return filteredPlants.map(p => ({ label: p.name, value: p.id }));
    }, [plants, user]);

    // Usuários filtrados
    const technicians = useMemo(() => users.filter(u => u.role === Role.TECHNICIAN).map(u => ({ label: u.name, value: u.id })), [users]);
    const supervisors = useMemo(() => users.filter(u => u.role === Role.SUPERVISOR).map(u => ({ label: u.name, value: u.id })), [users]);
    const assistants = useMemo(() => users.filter(u => u.role === Role.ASSISTANT).map(u => ({ label: u.name, value: u.id })), [users]);

    // Dados da Usina Selecionada
    const selectedPlant = plants.find(p => p.id === formData.plantId);
    
    // Lista de Tarefas (Planos) da Usina
    const plantTasks = useMemo(() => {
        if (!formData.plantId) return [];
        const plans = maintenancePlans[formData.plantId] || [];
        return plans.map(p => ({ 
            label: p.title, 
            value: p.id,
            original: p 
        }));
    }, [formData.plantId, maintenancePlans]);

    // Ativos da Usina
    const assetOptions = useMemo(() => {
        if (!selectedPlant) return [];
        return (selectedPlant.assets || []).map(a => ({ label: a, value: a }));
    }, [selectedPlant]);

    // Coordenador Automático
    const automaticCoordinator = useMemo(() => {
        if (!selectedPlant?.coordinatorId) return null;
        return users.find(u => u.id === selectedPlant.coordinatorId);
    }, [selectedPlant, users]);

    // Manipulador de Mudança de Tarefa (Preenche classificações auto)
    const handleTaskChange = (taskId: string) => {
        const task = plantTasks.find(t => t.value === taskId)?.original;
        if (task) {
            setFormData(prev => ({
                ...prev,
                maintenancePlanId: task.id,
                activity: task.title,
                priority: (task.criticality === 'Alta' ? Priority.HIGH : 
                           task.criticality === 'Urgente' ? Priority.URGENT : 
                           task.criticality === 'Baixa' ? Priority.LOW : Priority.MEDIUM),
                classification1: task.classification1 || '',
                classification2: task.classification2 || '',
                estimatedDuration: task.estimated_duration_minutes ? task.estimated_duration_minutes * 60 : 0
            }));
        }
    };

    // Submissão do Formulário
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Validação de Campos Obrigatórios
        if (!formData.plantId) {
            alert("Erro: O campo 'Usina' é obrigatório.");
            return;
        }
        if (!formData.activity) {
            alert("Erro: O campo 'Tarefa (Plano)' é obrigatório.");
            return;
        }
        if (!selectedAsset && (!formData.assets || formData.assets.length === 0)) {
            alert("Erro: O campo 'Ativo' é obrigatório.");
            return;
        }

        // 2. Validação da Regra Elétrica (1 Técnico + 1 Auxiliar)
        const isElectrical = formData.classification1 === 'Elétrica' || formData.classification2 === 'Elétrica';
        if (isElectrical) {
            if (!formData.technicianId || !formData.assistantId) {
                alert("Bloqueio de Segurança: Tarefas com classificação 'Elétrica' exigem obrigatoriamente 1 Técnico E 1 Auxiliar.");
                return;
            }
        }

        const finalData = {
            ...formData,
            assets: selectedAsset ? [selectedAsset] : [],
        };

        if (initialData) {
            await updateOS(finalData as OS);
        } else {
            await addOS(finalData as OS);
        }
        onClose();
    };

    // Estilos
    const inputClasses = "w-full p-2 border rounded text-sm bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";
    const labelClass = "block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 uppercase tracking-wide";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={initialData ? `Editar OS: ${initialData.id}` : 'Nova Ordem de Serviço'}>
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[80vh]">
                <div className="flex-1 overflow-y-auto p-1 space-y-4">
                    
                    {/* Linha 1: Usina e Tarefa */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Usina <span className="text-red-500">*</span></label>
                            <SearchableSelect 
                                options={plantOptions} 
                                value={formData.plantId || ''} 
                                onChange={(val) => setFormData({...formData, plantId: val})}
                                placeholder="Selecione a Usina"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Tarefa (Plano) <span className="text-red-500">*</span></label>
                            <SearchableSelect 
                                options={plantTasks} 
                                value={formData.maintenancePlanId || ''} 
                                onChange={handleTaskChange}
                                placeholder="Selecione a Tarefa"
                                disabled={!formData.plantId}
                            />
                        </div>
                    </div>

                    {/* Linha 2: Ativo e Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Ativo <span className="text-red-500">*</span></label>
                            <SearchableSelect 
                                options={assetOptions} 
                                value={selectedAsset} 
                                onChange={setSelectedAsset}
                                placeholder="Qual equipamento?"
                                disabled={!formData.plantId}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Data de Início</label>
                            <input 
                                type="date" 
                                value={formData.startDate} 
                                onChange={e => setFormData({...formData, startDate: e.target.value})} 
                                className={inputClasses} 
                            />
                        </div>
                    </div>

                    {/* Linha 3: Classificações (Automáticas) */}
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-800 p-3 rounded border dark:border-gray-700">
                        <div>
                            <label className={labelClass}>Classificação 1</label>
                            <input disabled value={formData.classification1 || ''} className={`${inputClasses} bg-gray-100 opacity-70`} />
                        </div>
                        <div>
                            <label className={labelClass}>Classificação 2</label>
                            <input disabled value={formData.classification2 || ''} className={`${inputClasses} bg-gray-100 opacity-70`} />
                        </div>
                    </div>

                    {/* Linha 4: Equipe */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Técnico Responsável</label>
                            <SearchableSelect options={technicians} value={formData.technicianId || ''} onChange={(val) => setFormData({...formData, technicianId: val})} />
                        </div>
                         <div>
                             <label className={labelClass}>Auxiliar</label>
                             <SearchableSelect options={assistants} value={formData.assistantId || ''} onChange={(val) => setFormData({...formData, assistantId: val})} />
                         </div>
                         <div>
                             <label className={labelClass}>Supervisor</label>
                             <SearchableSelect options={supervisors} value={formData.supervisorId || ''} onChange={(val) => setFormData({...formData, supervisorId: val})} />
                         </div>
                    </div>

                    {/* Linha 5: Coordenador (Auto) */}
                    <div>
                         <label className={labelClass}>Coordenador</label>
                         <input disabled value={automaticCoordinator?.name || 'Não definido'} className={`${inputClasses} bg-gray-200 text-gray-900 font-bold opacity-100 cursor-not-allowed border-gray-400`} />
                     </div>

                    <div><label className={labelClass}>Descrição Adicional</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClasses} h-24`} /></div>
                </div>
                
                <div className="pt-4 border-t mt-auto flex justify-end gap-2 bg-white dark:bg-gray-800 shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-lg font-bold transition-colors">Cancelar</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-transform transform active:scale-95">Salvar OS</button>
                </div>
            </form>
        </Modal>
    );
};

export default OSForm;