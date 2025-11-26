// File: components/modals/ScheduleOSModal.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Role, OSStatus, Priority } from '../../types';
import Modal from './Modal';
import { OS_ACTIVITIES } from '../../constants';

interface ScheduleOSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const ScheduleOSModal: React.FC<ScheduleOSModalProps> = ({ isOpen, onClose }) => {
  const { plants, users, addOSBatch } = useData(); // ✅ Usa addOSBatch

  const [activity, setActivity] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [plantId, setPlantId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [recurrence, setRecurrence] = useState<RecurrenceType>('WEEKLY');
  const [interval, setInterval] = useState(1); 
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);

  const availableTechnicians = useMemo(() => {
    if (!plantId) return [];
    return users.filter(u => u.role === Role.TECHNICIAN && u.plantIds?.includes(plantId));
  }, [plantId, users]);

  useEffect(() => {
    if (technicianId) {
        const tech = users.find(u => u.id === technicianId);
        if (tech?.supervisorId) setSupervisorId(tech.supervisorId);
    }
  }, [technicianId, users]);

  const inputClasses = "input w-full text-slate-900 dark:text-white bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 rounded-md";
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleDay = (dayIndex: number) => {
    setSelectedWeekDays(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !plantId) return;

    setIsGenerating(true);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const datesToCreate: Date[] = [];
    let current = new Date(start);

    while (current <= end) {
        let shouldAdd = false;
        if (recurrence === 'DAILY') shouldAdd = true;
        else if (recurrence === 'WEEKLY') {
            if (selectedWeekDays.length === 0 || selectedWeekDays.includes(current.getDay())) shouldAdd = true;
        } else if (recurrence === 'MONTHLY') {
             if (current.getDate() === start.getDate()) shouldAdd = true;
        }

        if (shouldAdd) datesToCreate.push(new Date(current));

        if (recurrence === 'DAILY') current.setDate(current.getDate() + interval);
        else if (recurrence === 'WEEKLY') current.setDate(current.getDate() + 1);
        else if (recurrence === 'MONTHLY') current.setMonth(current.getMonth() + interval);
    }

    if (confirm(`Isso criará ${datesToCreate.length} Ordens de Serviço. Continuar?`)) {
        const batchData = datesToCreate.map(date => ({
            description: description || `Agendamento Recorrente - ${activity}`,
            status: OSStatus.PENDING,
            priority,
            plantId,
            technicianId,
            supervisorId,
            startDate: date.toISOString(),
            activity,
            assets: [],
            attachmentsEnabled: true
        }));

        await addOSBatch(batchData); // ✅ Envia tudo de uma vez
        onClose();
    }
    setIsGenerating(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Agendamento Avançado" footer={
        <>
           <button onClick={onClose} className="btn-secondary">Cancelar</button>
           <button onClick={handleGenerate} disabled={isGenerating} className="btn-primary ml-3">
             {isGenerating ? 'Gerando...' : 'Gerar Cronograma'}
           </button>
        </>
    }>
      {/* ... (Conteúdo do formulário igual ao anterior) ... */}
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <div className="grid grid-cols-2 gap-4">
             <div><label className="label">Atividade</label><select value={activity} onChange={e => setActivity(e.target.value)} className={inputClasses}><option value="">Selecione...</option>{OS_ACTIVITIES.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
             <div><label className="label">Prioridade</label><select value={priority} onChange={e => setPriority(e.target.value as Priority)} className={inputClasses}>{Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Usina</label><select value={plantId} onChange={e => setPlantId(e.target.value)} className={inputClasses}><option value="">Selecione a Usina</option>{plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label">Técnico</label><select value={technicianId} onChange={e => setTechnicianId(e.target.value)} className={inputClasses}><option value="">Selecione...</option>{availableTechnicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
        </div>

        <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-100 dark:border-slate-700">
            <h4 className="font-bold text-sm mb-3 dark:text-white flex items-center"><span className="text-lg mr-2">🔄</span> Configurar Repetição</h4>
            <div className="flex gap-4 mb-4">
                <div className="flex-1"><label className="label">Frequência</label><select value={recurrence} onChange={e => setRecurrence(e.target.value as RecurrenceType)} className={inputClasses}><option value="DAILY">Diária</option><option value="WEEKLY">Semanal</option><option value="MONTHLY">Mensal</option></select></div>
                <div className="w-1/3"><label className="label">A cada</label><div className="flex items-center gap-2"><input type="number" min="1" value={interval} onChange={e => setInterval(Number(e.target.value))} className={inputClasses} /><span className="text-sm text-gray-500">{recurrence === 'WEEKLY' ? 'semanas' : recurrence === 'MONTHLY' ? 'meses' : 'dias'}</span></div></div>
            </div>
            {recurrence === 'WEEKLY' && (
                <div className="mb-4"><label className="label mb-2 block">Repetir nos dias:</label><div className="flex gap-2 justify-between">{weekDays.map((day, i) => (<button key={day} type="button" onClick={() => toggleDay(i)} className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${selectedWeekDays.includes(i) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'}`}>{day.charAt(0)}</button>))}</div></div>
            )}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
                <div><label className="label">Início</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses} /></div>
                <div><label className="label">Fim</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClasses} /></div>
            </div>
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição Padrão..." className={`${inputClasses} h-20`} />
      </div>
    </Modal>
  );
};

export default ScheduleOSModal;