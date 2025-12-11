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

    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
        if (!isOpen) setSearch('');
    }, [isOpen]);

    const filteredOptions = options.filter(o => 
        normalize(o.label).includes(normalize(search))
    );

    return (
        <div className="relative w-full" ref={wrapperRef}>
            <div 
                className={`w-full p-2 border border-gray-400 rounded bg-white text-gray-900 flex justify-between items-center cursor-pointer transition-colors ${disabled ? 'bg-gray-200 opacity-70 cursor-not-allowed' : 'hover:border-blue-600 focus:ring-2 focus:ring-blue-500'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`truncate font-medium ${!selectedLabel ? 'text-gray-500' : 'text-gray-900'}`}>
                    {selectedLabel || placeholder || 'Selecione...'}
                </span>
                <span className="text-gray-600 text-xs ml-2">▼</span>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-xl mt-1 max-h-60 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-200 bg-white sticky top-0">
                        <input 
                            ref={inputRef}
                            className="w-full p-2 text-sm border-2 border-blue-100 focus:border-blue-500 rounded bg-white text-black outline-none placeholder-gray-400 font-medium"
                            placeholder="Digite para filtrar..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="overflow-y-auto flex-1 bg-white">
                        {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                            <div 
                                key={opt.value}
                                className={`p-2.5 text-sm cursor-pointer border-b border-gray-50 last:border-0 transition-colors 
                                    ${opt.value === value ? 'bg-blue-100 text-blue-900 font-bold' : 'text-gray-800 hover:bg-gray-100'}`}
                                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                            >
                                {opt.label}
                            </div>
                        )) : (
                            <div className="p-4 text-xs text-gray-500 text-center italic">"{search}" não encontrado.</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

interface OSFormProps { isOpen: boolean; onClose: () => void; initialData?: OS; }

const OSForm: React.FC<OSFormProps> = ({ isOpen, onClose, initialData }) => {
  const { user } = useAuth();
  const { plants, users, addOS, updateOS, fetchPlantPlan, maintenancePlans } = useData();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    description: '', status: OSStatus.PENDING, priority: Priority.MEDIUM,
    plantId: '', subPlantId: '', inverterId: '', technicianId: '', supervisorId: '',
    startDate: new Date().toISOString().split('T')[0], activity: '', assets: [] as string[],
    subtasksStatus: [] as any[], attachmentsEnabled: true,
    classification1: '', classification2: '', estimatedDuration: 0, plannedDowntime: 0
  });

  const [selectedAssetCategory, setSelectedAssetCategory] = useState('');
  const [selectedPlanTask, setSelectedPlanTask] = useState('');
  const [specificComponents, setSpecificComponents] = useState<string[]>([]);
  
  // Classes CSS reutilizáveis com suporte a Dark Mode
  const inputClasses = "w-full p-2 border border-gray-400 rounded bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";
  // ✅ CORREÇÃO: Texto cinza escuro no light, cinza claro no dark
  const labelClass = "block text-sm font-bold mb-1 text-gray-800 dark:text-gray-200";

  useEffect(() => {
    if (initialData) {
        setFormData({
            description: initialData.description, status: initialData.status, priority: initialData.priority,
            plantId: initialData.plantId, subPlantId: initialData.subPlantId || '', inverterId: initialData.inverterId || '',
            technicianId: initialData.technicianId || '', supervisorId: initialData.supervisorId || '',
            startDate: initialData.startDate, activity: initialData.activity, assets: initialData.assets,
            subtasksStatus: initialData.subtasksStatus || [], attachmentsEnabled: initialData.attachmentsEnabled,
            classification1: initialData.classification1 || '', classification2: initialData.classification2 || '',
            estimatedDuration: initialData.estimatedDuration || 0, plannedDowntime: initialData.plannedDowntime || 0
        });
        setSelectedAssetCategory(initialData.assets[0] || '');
        setSelectedPlanTask(initialData.activity);
    }
  }, [initialData]);

  useEffect(() => { if (formData.plantId) fetchPlantPlan(formData.plantId); }, [formData.plantId]);

  // --- MEMOS E FILTROS ---
  const availablePlants = useMemo(() => plants.sort((a,b) => a.name.localeCompare(b.name)), [plants]);
  const currentPlant = useMemo(() => plants.find(p => p.id === formData.plantId), [plants, formData.plantId]);
  
  const allPlantTasks = useMemo(() => maintenancePlans[formData.plantId] || [], [maintenancePlans, formData.plantId]);

  const availableAssetOptions = useMemo(() => 
      (currentPlant?.assets || []).map(a => ({ label: a, value: a })), 
  [currentPlant]);

  const filteredTaskOptions = useMemo(() => {
      const source = selectedAssetCategory 
          ? allPlantTasks.filter(t => t.asset_category === selectedAssetCategory)
          : allPlantTasks;
      const uniqueTasks = Array.from(new Set(source.map(t => t.title))).map(title => source.find(t => t.title === title)!);
      return uniqueTasks.map(t => ({ label: t.title, value: t.title }));
  }, [allPlantTasks, selectedAssetCategory]);

  const availableTechnicians = useMemo(() => {
      if (!currentPlant) return [];
      const techs = (currentPlant.technicianIds || []).map(id => users.find(u => u.id === id)).filter(Boolean);
      return techs;
  }, [currentPlant, users]);

  const automaticSupervisor = useMemo(() => {
      if (!currentPlant) return null;
      const svId = currentPlant.supervisorIds?.[0];
      return users.find(u => u.id === svId);
  }, [currentPlant, users]);

  useEffect(() => {
      if (formData.technicianId && !formData.supervisorId && automaticSupervisor) {
          setFormData(prev => ({ ...prev, supervisorId: automaticSupervisor.id }));
      }
  }, [formData.technicianId, automaticSupervisor]);

  const componentLists = useMemo(() => {
      if (!currentPlant) return { inverters: [], trackers: [], strings: [] };
      const inverters: string[] = [];
      const trackers: string[] = [];
      const strings: string[] = [];

      currentPlant.subPlants.forEach((sp, subIndex) => {
          const subId = subIndex + 1; 
          for (let i = 1; i <= sp.inverterCount; i++) {
              inverters.push(`INV${subId}.${i}`);
              for (let s = 1; s <= sp.stringsPerInverter; s++) {
                  strings.push(`S${subId}.${i}.${s}`);
              }
          }
          const totalTrackers = sp.inverterCount * sp.trackersPerInverter; 
          for (let t = 1; t <= totalTrackers; t++) {
              trackers.push(`TR${subId}.${t}`);
          }
      });
      return { inverters, trackers, strings };
  }, [currentPlant]);

  const showStrings = selectedPlanTask.toUpperCase().includes('STRING');
  const showInverters = !showStrings && selectedAssetCategory === 'Inversores';
  const showTrackers = selectedAssetCategory === 'Trackers';

  const toggleSpecific = (val: string) => {
      if (val === 'Todos') {
          if (specificComponents.includes('Todos')) setSpecificComponents([]);
          else setSpecificComponents(['Todos']);
      } else {
          let current = specificComponents.filter(x => x !== 'Todos');
          if (current.includes(val)) current = current.filter(x => x !== val);
          else current = [...current, val];
          setSpecificComponents(current);
      }
  };

  const handleTaskChange = (taskTitle: string) => {
      setSelectedPlanTask(taskTitle);
      const task = allPlantTasks.find(t => t.title === taskTitle);
      if (task) {
          if (task.asset_category) setSelectedAssetCategory(task.asset_category);
          setFormData(prev => ({
              ...prev,
              activity: task.title,
              description: task.title,
              priority: task.criticality === 'Alto' || task.criticality === 'Muito alto' ? Priority.HIGH : Priority.MEDIUM,
              classification1: task.classification1 || '',
              classification2: task.classification2 || '',
              estimatedDuration: task.estimated_duration_minutes || 0,
              subtasksStatus: task.subtasks.map((st, i) => ({ id: i, text: st, done: false }))
          }));
          setSpecificComponents([]);
      }
  };

  const handleAssetChange = (asset: string) => {
      setSelectedAssetCategory(asset);
      if (selectedPlanTask) {
          const currentTask = allPlantTasks.find(t => t.title === selectedPlanTask);
          if (currentTask && currentTask.asset_category !== asset) setSelectedPlanTask('');
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalTitle = formData.activity;
    if (specificComponents.length > 0) {
        finalTitle += specificComponents.includes('Todos') ? ' - Todos' : ` - ${specificComponents.join(', ')}`;
    }
    const payload = {
        ...formData,
        title: finalTitle,
        assets: [selectedAssetCategory],
        activity: selectedPlanTask,
        inverterId: specificComponents.join(', ')
    };
    if (isEditing && initialData) await updateOS({ ...initialData, ...payload } as any);
    else await addOS(payload as any);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}>
        <form onSubmit={handleSubmit} className="flex flex-col h-[85vh]">
            <div className="flex-1 overflow-y-auto space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Usina</label>
                        <SearchableSelect 
                            options={availablePlants.map(p => ({ label: p.name, value: p.id }))}
                            value={formData.plantId}
                            onChange={(val) => {
                                setFormData({...formData, plantId: val, technicianId: '', supervisorId: ''});
                                setSpecificComponents([]);
                                setSelectedAssetCategory('');
                                setSelectedPlanTask('');
                            }}
                            disabled={isEditing}
                            placeholder="Selecione a Usina..."
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Data de Início</label>
                        <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className={inputClasses} required />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Tarefa (Plano)</label>
                        <SearchableSelect 
                            options={filteredTaskOptions}
                            value={selectedPlanTask}
                            onChange={handleTaskChange}
                            placeholder={selectedAssetCategory ? "Filtrado por Ativo..." : "Todas as Tarefas..."}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Ativo</label>
                        <SearchableSelect 
                            options={availableAssetOptions}
                            value={selectedAssetCategory}
                            onChange={handleAssetChange}
                            placeholder="Selecione o Ativo..."
                        />
                    </div>
                </div>

                {(showInverters || showTrackers || showStrings) && (
                    <div className="bg-blue-50 dark:bg-gray-700 p-3 rounded border border-blue-200 dark:border-gray-600 animate-fadeIn">
                        <label className="block text-sm font-bold mb-1 text-blue-900 dark:text-blue-200">
                            {showStrings ? 'Selecionar String(s)' : showTrackers ? 'Selecionar Tracker(s)' : 'Selecionar Inversor(es)'}
                        </label>
                        <div className="max-h-40 overflow-y-auto bg-white dark:bg-gray-800 border rounded p-2 grid grid-cols-3 gap-2">
                            <label className="flex items-center gap-2 cursor-pointer font-bold col-span-3 border-b pb-1 mb-1 text-gray-900 dark:text-gray-100">
                                <input type="checkbox" checked={specificComponents.includes('Todos')} onChange={() => toggleSpecific('Todos')} className="rounded text-blue-600" /> Todos
                            </label>
                            {(showStrings ? componentLists.strings : showTrackers ? componentLists.trackers : componentLists.inverters).map(item => (
                                <label key={item} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded text-xs text-gray-800 dark:text-gray-200">
                                    <input type="checkbox" checked={specificComponents.includes(item) || specificComponents.includes('Todos')} onChange={() => toggleSpecific(item)} disabled={specificComponents.includes('Todos')} className="rounded text-blue-600" />
                                    {item}
                                </label>
                            ))}
                        </div>
                        <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">Selecionado: {specificComponents.includes('Todos') ? 'Todos' : specificComponents.length > 0 ? specificComponents.join(', ') : 'Nenhum'}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className={labelClass}>Técnico</label>
                         {availableTechnicians.length > 0 ? (
                             <SearchableSelect 
                                options={availableTechnicians.map(t => ({ label: t.name, value: t.id }))}
                                value={formData.technicianId}
                                onChange={(val) => setFormData({...formData, technicianId: val})}
                                placeholder="Selecione o Técnico..."
                             />
                         ) : (
                             <div className="text-red-600 text-xs mt-2 border border-red-300 bg-red-50 p-2 rounded font-medium">Nenhum técnico atribuído a esta usina.</div>
                         )}
                     </div>
                     <div>
                         <label className={labelClass}>Supervisor</label>
                         <input disabled value={users.find(u => u.id === formData.supervisorId)?.name || automaticSupervisor?.name || 'Não definido'} className={`${inputClasses} bg-gray-200 text-gray-900 font-bold opacity-100 cursor-not-allowed border-gray-400`} />
                     </div>
                </div>
                <div><label className={labelClass}>Descrição</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inputClasses} h-24`} /></div>
            </div>
            <div className="pt-4 border-t mt-auto flex justify-end gap-2 bg-white dark:bg-gray-800 shrink-0">
                <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                <button type="submit" className="btn-primary">Salvar OS</button>
            </div>
        </form>
    </Modal>
  );
};

export default OSForm;