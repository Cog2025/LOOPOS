// File: components/modals/StandardLibraryModal.tsx
import React, { useEffect, useState, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { TaskTemplate } from '../../types';
import { STANDARD_ASSETS } from '../../constants';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const StandardLibraryModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { fetchTaskTemplates, taskTemplates, addTemplate, updateTemplate, deleteTemplate } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingItem, setEditingItem] = useState<Partial<TaskTemplate>>({});
    
    // Inicia recolhido
    const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());

    const inputStyle = { color: 'black', backgroundColor: 'white', borderColor: '#cbd5e1' }; 
    const inputClass = "w-full p-2 border rounded text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 outline-none";
    const labelClass = "text-[10px] font-bold text-gray-500 uppercase mb-1 block";

    const [selectedAsset, setSelectedAsset] = useState<string>('');

    useEffect(() => { 
        if (isOpen) {
            fetchTaskTemplates().then(() => {
                setExpandedAssets(new Set());
            });
        }
    }, [isOpen, taskTemplates.length]);

    const availableAssets = useMemo(() => {
        const fromDB = taskTemplates.map(t => t.asset_category);
        const combined = new Set([...STANDARD_ASSETS, ...fromDB]);
        return Array.from(combined).sort();
    }, [taskTemplates]);

    // ✅ CORREÇÃO: Inicializa grupos mesmo sem tarefas
    const groupedTasks = useMemo(() => {
        const groups: Record<string, TaskTemplate[]> = {};
        
        // 1. Inicializa grupos vazios
        const assetsToInitialize = selectedAsset ? [selectedAsset] : availableAssets;
        assetsToInitialize.forEach(asset => {
            groups[asset] = [];
        });
        
        // 2. Distribui tarefas
        const filtered = taskTemplates.filter(t => 
            (searchTerm ? t.title.toLowerCase().includes(searchTerm.toLowerCase()) : true) &&
            (selectedAsset ? t.asset_category === selectedAsset : true)
        );

        filtered.forEach(task => {
            const asset = task.asset_category || 'Geral';
            // Garante que exista (para ativos fora do padrão)
            if (!groups[asset]) groups[asset] = [];
            groups[asset].push(task);
        });

        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as Record<string, TaskTemplate[]>);
    }, [taskTemplates, searchTerm, selectedAsset, availableAssets]);

    const toggleGroup = (asset: string) => {
        setExpandedAssets(prev => {
            const next = new Set(prev);
            next.has(asset) ? next.delete(asset) : next.add(asset);
            return next;
        });
    };

    const handleSave = async () => {
        const payload = { 
            ...editingItem, 
            plan_code: 'LOOP-STD',
            frequency_days: Number(editingItem.frequency_days || 0),
            estimated_duration_minutes: Number(editingItem.estimated_duration_minutes || 0)
        };
        if (payload.id) await updateTemplate(payload.id, payload);
        else await addTemplate(payload);
        setIsEditing(false);
        setEditingItem({});
        fetchTaskTemplates();
    };

    const handleDelete = async (id: string) => {
        if(confirm("Excluir este padrão da biblioteca?")) {
            await deleteTemplate(id);
            fetchTaskTemplates();
        }
    };

    const handleNewAssetGroup = () => {
        const name = prompt("Nome do Novo Ativo Padrão:");
        if (name) {
            setEditingItem({ asset_category: name, title: "Nova Tarefa Padrão", subtasks: [] });
            setIsEditing(true);
        }
    };

    const addSubtask = () => setEditingItem(prev => ({ ...prev, subtasks: [...(prev.subtasks || []), ""] }));
    const updateSubtask = (idx: number, val: string) => {
        const newSubs = [...(editingItem.subtasks || [])];
        newSubs[idx] = val;
        setEditingItem(prev => ({ ...prev, subtasks: newSubs }));
    };
    const removeSubtask = (idx: number) => {
        setEditingItem(prev => ({ ...prev, subtasks: (prev.subtasks || []).filter((_, i) => i !== idx) }));
    };

    if (isEditing) {
        return (
            <Modal isOpen={isOpen} onClose={() => setIsEditing(false)} title={editingItem.id ? "Editar Padrão" : "Novo Padrão"}>
                <div className="space-y-4 p-1 max-h-[75vh] overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2"><label className={labelClass}>Título</label><input className={inputClass} style={inputStyle} value={editingItem.title || ''} onChange={e => setEditingItem({...editingItem, title: e.target.value})} autoFocus /></div>
                        <div>
                            <label className={labelClass}>Ativo</label>
                            <input className={inputClass} style={inputStyle} list="assets-dl" value={editingItem.asset_category || ''} onChange={e => setEditingItem({...editingItem, asset_category: e.target.value})} />
                            <datalist id="assets-dl">{availableAssets.map(a => <option key={a} value={a} />)}</datalist>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-700/30 p-3 rounded border dark:border-gray-600">
                        <div><label className={labelClass}>Freq (Dias)</label><input type="number" className={inputClass} style={inputStyle} value={editingItem.frequency_days || ''} onChange={e => setEditingItem({...editingItem, frequency_days: Number(e.target.value)})} /></div>
                        <div><label className={labelClass}>Duração (Min)</label><input type="number" className={inputClass} style={inputStyle} value={editingItem.estimated_duration_minutes || ''} onChange={e => setEditingItem({...editingItem, estimated_duration_minutes: Number(e.target.value)})} /></div>
                        <div className="col-span-2"><label className={labelClass}>Tipo</label><input className={inputClass} style={inputStyle} value={editingItem.task_type || ''} onChange={e => setEditingItem({...editingItem, task_type: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className={labelClass}>Criticidade</label><select className={inputClass} style={inputStyle} value={editingItem.criticality || 'Médio'} onChange={e => setEditingItem({...editingItem, criticality: e.target.value})}><option>Baixo</option><option>Médio</option><option>Alto</option><option>Muito alto</option></select></div>
                        <div><label className={labelClass}>Classificação 1</label><input className={inputClass} style={inputStyle} value={editingItem.classification1 || ''} onChange={e => setEditingItem({...editingItem, classification1: e.target.value})} /></div>
                        <div><label className={labelClass}>Classificação 2</label><input className={inputClass} style={inputStyle} value={editingItem.classification2 || ''} onChange={e => setEditingItem({...editingItem, classification2: e.target.value})} /></div>
                    </div>
                    <div className="border rounded-lg overflow-hidden border-gray-300 dark:border-gray-600">
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 flex justify-between items-center border-b">
                            <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Subtarefas</label>
                            <button onClick={addSubtask} className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 font-bold shadow-sm">+ Adicionar Item</button>
                        </div>
                        <div className="p-2 space-y-2 bg-gray-50 dark:bg-gray-800 max-h-60 overflow-y-auto">
                            {editingItem.subtasks?.map((st, i) => (
                                <div key={i} className="flex gap-2 items-center group">
                                    <span className="text-xs text-gray-400 font-mono w-6 text-right select-none">{i+1}.</span>
                                    <input className={inputClass} style={inputStyle} value={st} onChange={e => updateSubtask(i, e.target.value)} />
                                    <button onClick={() => removeSubtask(i)} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancelar</button>
                        <button onClick={handleSave} className="btn-primary">Salvar Padrão</button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Biblioteca Padrão LOOP`}>
            <div className="flex flex-col h-[75vh]">
                <div className="flex flex-wrap gap-3 mb-4 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg border dark:border-gray-700 shadow-sm shrink-0 items-center justify-between">
                    <div className="flex-1 min-w-[200px]">
                        <select className={inputClass} style={inputStyle} value={selectedAsset} onChange={e => setSelectedAsset(e.target.value)}>
                            <option value="">Todos os Ativos</option>
                            {availableAssets.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="flex-[2] min-w-[200px]">
                        <input className={inputClass} style={{...inputStyle, width: '100%'}} placeholder="Buscar por título..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={handleNewAssetGroup} className="btn-primary whitespace-nowrap px-4">+ Novo Grupo de Ativos</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-2">
                    {Object.entries(groupedTasks).map(([asset, tasks]) => {
                        const isExpanded = expandedAssets.has(asset) || (selectedAsset === asset);
                        return (
                            <div key={asset} className="border dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-all">
                                <div 
                                    className="bg-gray-100 dark:bg-gray-700 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    onClick={() => toggleGroup(asset)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500 text-xs transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                                        <h4 className="font-bold text-gray-800 dark:text-white text-sm">{asset} <span className="font-normal text-gray-500 text-xs ml-1">({tasks.length})</span></h4>
                                    </div>
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setEditingItem({ asset_category: asset, title: "Nova Tarefa Padrão", subtasks: [] }); 
                                            setIsEditing(true); 
                                        }}
                                        className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded shadow-sm"
                                    >
                                        + Tarefa
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="p-2 space-y-2 bg-gray-50 dark:bg-gray-800/50">
                                        {tasks.map((task) => (
                                            <div key={task.id} className="p-3 border dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 hover:border-blue-300 transition-all relative group">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1 cursor-pointer" onClick={() => { setEditingItem(task); setIsEditing(true); }}>
                                                        <div className="font-bold text-sm text-gray-800 dark:text-gray-200 mb-1">{task.title}</div>
                                                        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
                                                            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">📅 {task.frequency_days} dias</span>
                                                            <span className={`px-1.5 py-0.5 rounded text-white ${task.criticality === 'Alto' ? 'bg-orange-500' : 'bg-green-500'}`}>{task.criticality}</span>
                                                            <span className="bg-gray-100 px-1.5 py-0.5 rounded border">⏱ {task.estimated_duration_minutes} min</span>
                                                        </div>
                                                        <div className="mt-1 text-[10px] text-gray-400 truncate max-w-md">
                                                            {task.subtasks?.length > 0 ? `📋 ${task.subtasks.length} itens no checklist` : 'Sem checklist'}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => {setEditingItem(task); setIsEditing(true);}} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">✏️</button>
                                                        <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">🗑️</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {tasks.length === 0 && <div className="text-center text-xs text-gray-400 p-2 italic">Nenhuma tarefa.</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </Modal>
    );
};

export default StandardLibraryModal;