// File: components/modals/DownloadModal.tsx
// Este componente renderiza um modal para filtrar e baixar relatórios de Ordens de Serviço em formato ZIP contendo PDFs individuais.


import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Role, Priority } from '../../types';
import { generateOSReport } from '../utils/pdfGenerator';
import { Download } from 'lucide-react';
import JSZip from 'jszip'; // Certifique-se de ter instalado: npm install jszip

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { osList, plants, users, filterOSForUser } = useData();
  const { user } = useAuth();

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Helpers
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';

  const technicians = useMemo(() => {
    return users.filter(u => {
      if (u.role !== Role.TECHNICIAN) return false;
      if ((user?.role === Role.ADMIN || user?.role === Role.OPERATOR) && !selectedPlant) return true;
      if (selectedPlant) return u.plantIds && u.plantIds.includes(selectedPlant);
      if (user?.plantIds && user.plantIds.length > 0) return u.plantIds?.some(pid => user.plantIds?.includes(pid));
      return false; 
    });
  }, [users, selectedPlant, user]);

  const filteredData = useMemo(() => {
    let list = filterOSForUser(user!);
    if (selectedPlant) list = list.filter(os => os.plantId === selectedPlant);
    if (selectedPriority) list = list.filter(os => os.priority === selectedPriority);
    if (selectedTechnician) list = list.filter(os => os.technicianId === selectedTechnician);
    if (startDate) list = list.filter(os => new Date(os.startDate) >= new Date(startDate));
    if (endDate) list = list.filter(os => new Date(os.startDate) <= new Date(endDate));
    return list;
  }, [osList, selectedPlant, selectedPriority, selectedTechnician, startDate, endDate, user, filterOSForUser]);

  // ✅ GERADOR DE ZIP
  const handleDownload = async () => {
    if (filteredData.length === 0) {
      alert("Nenhuma OS encontrada.");
      return;
    }

    setIsGenerating(true);
    const zip = new JSZip();
    const folderName = `Relatorio_OS_${new Date().toISOString().split('T')[0]}`;
    const folder = zip.folder(folderName);

    try {
      const helpers = { getPlantName, getUserName };

      // Gera um PDF para cada OS individualmente
      for (const os of filteredData) {
        // Chama com shouldSave = false para receber o objeto doc
        const doc = await generateOSReport([os], `OS ${os.id}`, helpers, false);
        
        // Adiciona ao ZIP
        const pdfBlob = doc.output('blob');
        folder?.file(`${os.id}_${os.activity.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBlob);
      }

      // Gera e baixa o ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (e) {
      console.error("Erro ao gerar ZIP:", e);
      alert("Erro ao gerar pacote de relatórios.");
    } finally {
      setIsGenerating(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Baixar Pacote de Relatórios (ZIP)"
      footer={
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleDownload} disabled={isGenerating} className="btn-primary flex items-center gap-2">
            <Download className="w-4 h-4" /> {isGenerating ? `Gerando ${filteredData.length} PDFs...` : "Baixar ZIP"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Usina</label>
            <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Técnico</label>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Prioridade</label>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
          <div>
            <label className="label">De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="label">Até</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-800 dark:text-blue-200">
          <strong>Resumo:</strong> {filteredData.length} Ordens de Serviço encontradas. Será gerado um arquivo ZIP contendo um PDF individual para cada uma.
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;