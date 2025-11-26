// File: components/modals/DownloadModal.tsx
// Este componente renderiza um modal para filtrar e baixar relatórios de Ordens de Serviço em formato ZIP contendo PDFs individuais.


import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { OSStatus, Role } from '../../types';
import { OS_STATUSES } from '../../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';

interface DownloadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({ isOpen, onClose }) => {
    const { plants, users, filterOSForUser } = useData();
    const { user } = useAuth();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<OSStatus[]>([]);
    const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
    const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
    
    // ✅ NOVO: Opção para incluir ou não agendamentos futuros
    const [includeFuture, setIncludeFuture] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 1. Pega as OSs que o usuário pode ver (Segurança Base)
    const visibleOS = useMemo(() => user ? filterOSForUser(user) : [], [user, filterOSForUser]);

    // 2. Filtra a lista de técnicos para mostrar apenas os relevantes nas opções
    // Se sou Carlos, só vejo "Carlos" na lista de filtro. Se sou Admin, vejo todos.
    const availableTechnicians = useMemo(() => {
        const techIds = new Set(visibleOS.map(os => os.technicianId).filter(Boolean));
        return users.filter(u => u.role === Role.TECHNICIAN && techIds.has(u.id));
    }, [visibleOS, users]);

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
        setter(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };
    const handleStatusChange = (status: OSStatus) => {
        setSelectedStatuses(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };

    const handleDownload = async () => {
        let filteredOS = visibleOS;

        // Filtros de Data
        if (startDate) { filteredOS = filteredOS.filter(os => new Date(os.startDate) >= new Date(startDate)); }
        if (endDate) { const end = new Date(endDate); end.setDate(end.getDate() + 1); filteredOS = filteredOS.filter(os => new Date(os.startDate) < end); }

        // 2. Lógica de Futuros
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (includeFuture) {
            // Se o checkbox "Incluir Futuros" estiver marcado,
            // e o usuário NÃO definiu data de início, vamos assumir que ele quer ver
            // as futuras. Mas se ele NÃO selecionou status nenhum, talvez ele queira SÓ as futuras?
            // Para evitar confusão, vamos manter o comportamento de "Incluir" (aditivo).
            
            // Mas se você quer baixar SÓ as futuras, o ideal seria filtrar:
            // filteredOS = filteredOS.filter(os => new Date(os.startDate) > today);
        } else {
            // Comportamento Padrão: Esconde futuras (agendadas)
            filteredOS = filteredOS.filter(os => {
                if (os.status !== OSStatus.PENDING) return true; 
                return new Date(os.startDate) <= today;
            });
        }

        // 3. Filtros de Seleção (Status, Usina, Técnico)
        // Se status estiver vazio, ele traz TODOS os status (comportamento padrão de filtros).
        if (selectedStatuses.length > 0) { filteredOS = filteredOS.filter(os => selectedStatuses.includes(os.status)); }
        if (selectedPlants.length > 0) { filteredOS = filteredOS.filter(os => selectedPlants.includes(os.plantId)); }
        if (selectedTechnicians.length > 0) { filteredOS = filteredOS.filter(os => selectedTechnicians.includes(os.technicianId)); }

        // ✅ LÓGICA DE FUTUROS: Remove agendamentos se a opção não estiver marcada
        if (!includeFuture) {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            // Filtra fora se for Pendente E a data for maior que hoje
            filteredOS = filteredOS.filter(os => {
                if (os.status !== OSStatus.PENDING) return true; // Concluído/Em andamento sempre mostra
                return new Date(os.startDate) <= today;
            });
        }

        if (filteredOS.length === 0) { alert("Nenhuma OS encontrada com os filtros selecionados."); return; }

        setIsLoading(true);
        const zip = new JSZip();

        for (const os of filteredOS) {
            const doc = new jsPDF();
            const plant = plants.find(p => p.id === os.plantId);
            const technician = users.find(u => u.id === os.technicianId);
            const supervisor = users.find(u => u.id === os.supervisorId);

            doc.setFontSize(16); doc.text(`Relatório da OS: ${os.title}`, 14, 20);
            autoTable(doc, { startY: 30, head: [['Campo', 'Valor']], body: [ ['ID', os.id], ['Status', os.status], ['Prioridade', os.priority], ['Usina', plant?.name || 'N/A'], ['Cliente', plant?.client || 'N/A'], ['Técnico', technician?.name || 'N/A'], ['Supervisor', supervisor?.name || 'N/A'], ['Data de Início', new Date(os.startDate).toLocaleDateString('pt-BR')], ['Atividade', os.activity], ], theme: 'striped', });

            let finalY = (doc as any).lastAutoTable.finalY || 10;
            
            doc.setFontSize(12); doc.text('Descrição:', 14, finalY + 10);
            const descLines = doc.splitTextToSize(os.description, 180);
            doc.setFontSize(10); doc.text(descLines, 14, finalY + 15);
            finalY += 15 + (descLines.length * 5);
            
            doc.setFontSize(12); doc.text('Ativos Envolvidos:', 14, finalY + 5);
            doc.setFontSize(10); doc.text(os.assets.join(', '), 14, finalY + 10);
            finalY += 15;

            if (os.imageAttachments && os.imageAttachments.length > 0) {
                doc.addPage();
                doc.setFontSize(12); doc.text('Anexos:', 14, 20);
                finalY = 25;

                for (const attachment of os.imageAttachments) {
                    try {
                        const img = new Image(); img.src = attachment.url;
                        await new Promise(resolve => { img.onload = resolve; img.onerror=resolve; });
                        
                        const imgProps = doc.getImageProperties(img.src); const margin = 14; const maxWidth = doc.internal.pageSize.getWidth() - 2 * margin; const maxHeight = 100; const ratio = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height); const imgWidth = imgProps.width * ratio; const imgHeight = imgProps.height * ratio;

                        if (finalY + imgHeight + 15 > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); finalY = margin; }

                        doc.addImage(img.src, 'JPEG', margin, finalY, imgWidth, imgHeight);
                        finalY += imgHeight + 2;
                        if (attachment.caption) { doc.setFontSize(8); doc.setTextColor(100); doc.text(attachment.caption, margin, finalY); finalY += 10; }
                    } catch (e) { console.error("Erro ao adicionar imagem ao PDF:", e); }
                }
            }
            
            const pdfBlob = doc.output('blob');
            const fileName = `${os.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            zip.file(fileName, pdfBlob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(zipBlob);
        link.download = `relatorios_os_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsLoading(false);
        onClose();
    };

    const FilterGroup: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => ( <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</label>{children}</div> );
    const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Baixar Relatório de OS" footer={ <> <button onClick={onClose} className="btn-secondary">Cancelar</button> <button onClick={handleDownload} disabled={isLoading} className="btn-primary ml-3 disabled:bg-gray-400">{isLoading ? 'Gerando...' : 'Gerar e Baixar'}</button> </> }>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
                <FilterGroup label="Data de Início (De/Até)"> <div className="flex items-center space-x-2"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses} /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClasses} /></div></FilterGroup>
                
                {/* CHECKBOX FUTUROS */}
                <div className="flex items-center space-x-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
                    <input type="checkbox" id="includeFuture" checked={includeFuture} onChange={e => setIncludeFuture(e.target.checked)} className="rounded text-blue-600 w-5 h-5" />
                    <label htmlFor="includeFuture" className="text-sm text-gray-700 dark:text-gray-200 font-medium cursor-pointer">
                        Incluir Agendamentos Futuros?
                    </label>
                </div>

                <FilterGroup label="Filtrar por Status"><div className="grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-md">{OS_STATUSES.map(status => ( <label key={status} className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={selectedStatuses.includes(status)} onChange={() => handleStatusChange(status)} className="rounded" /><span className="dark:text-gray-200">{status}</span></label>))}</div></FilterGroup>
                <FilterGroup label="Filtrar por Usina"><div className="grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">{plants.map(plant => ( <label key={plant.id} className="flex items-center space-x-2 cursor-pointer"><input type="checkbox" checked={selectedPlants.includes(plant.id)} onChange={() => handleFilterChange(setSelectedPlants, plant.id)} className="rounded" /><span className="dark:text-gray-200">{plant.name}</span></label>))}</div></FilterGroup>
                
                {/* LISTA DE TÉCNICOS DINÂMICA */}
                <FilterGroup label="Filtrar por Técnico">
                    <div className="grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">
                        {availableTechnicians.length > 0 ? availableTechnicians.map(tech => ( 
                            <label key={tech.id} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedTechnicians.includes(tech.id)} onChange={() => handleFilterChange(setSelectedTechnicians, tech.id)} className="rounded" />
                                <span className="dark:text-gray-200">{tech.name}</span>
                            </label>
                        )) : <p className="text-xs text-gray-500 italic">Nenhum técnico disponível para seu nível de acesso.</p>}
                    </div>
                </FilterGroup>
            </div>
        </Modal>
    );
};

export default DownloadModal;