// File: components/modals/DownloadModal.tsx
// Este componente renderiza um modal para filtrar e baixar relatórios de Ordens de Serviço em formato ZIP contendo PDFs individuais.
// ATUALIZAÇÃO: Filtro de "Usina" agora respeita as permissões do usuário (Cliente só vê suas usinas).

import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Role, Priority } from '../../types';
import { generateOSReport } from '../utils/pdfGenerator';
import { Download } from 'lucide-react';
import JSZip from 'jszip'; 

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DownloadModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { osList, plants, users } = useData();
  const { user } = useAuth();

  const [selectedPlant, setSelectedPlant] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Helpers passados para o gerador
  const getPlantName = (id: string) => plants.find(p => p.id === id)?.name || id;
  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'N/A';

  const availablePlants = useMemo(() => {
      if (!user) return [];
      if (user.role === Role.ADMIN || user.role === Role.OPERATOR) return plants;
      return plants.filter(p => user.plantIds?.includes(p.id));
  }, [plants, user]);

  const technicians = useMemo(() => {
    return users.filter(u => {
      if (u.role !== Role.TECHNICIAN && u.role !== Role.ASSISTANT) return false;
      if (selectedPlant) return u.plantIds?.includes(selectedPlant);
      return true;
    });
  }, [users, selectedPlant]);

  const filteredData = useMemo(() => {
    return osList.filter(os => {
      const isAllowed = user?.role === Role.ADMIN || user?.role === Role.OPERATOR || 
                        (user?.plantIds?.includes(os.plantId));
      
      if (!isAllowed) return false;

      if (selectedPlant && os.plantId !== selectedPlant) return false;
      if (selectedPriority && os.priority !== selectedPriority) return false;
      if (selectedTechnician && os.technicianId !== selectedTechnician) return false;
      if (startDate && os.startDate < startDate) return false;
      if (endDate && os.startDate > endDate) return false;
      
      return true;
    });
  }, [osList, selectedPlant, selectedPriority, selectedTechnician, startDate, endDate, user]);

  const handleDownloadZip = async () => {
    if (filteredData.length === 0) {
      alert("Nenhuma OS encontrada com os filtros selecionados.");
      return;
    }

    setIsGenerating(true);
    try {
      const zip = new JSZip();
      const folderName = `Relatorio_OS_${new Date().toISOString().split('T')[0]}`;
      const folder = zip.folder(folderName);

      const helpers = { getPlantName, getUserName };

      for (const os of filteredData) {
        // ✅ CORREÇÃO: Passa [os] como array e os helpers exigidos
        const doc = await generateOSReport(
            [os], // <--- Envolve em array
            `Relatório Individual - ${os.id}`, 
            helpers, 
            false // <--- Não salva direto, retorna o doc
        );
        
        const safeDate = os.startDate.split('T')[0];
        const safePlant = getPlantName(os.plantId).replace(/[^a-z0-9]/gi, '_').substring(0, 15);
        const safeTitle = os.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        const fileName = `${safeDate}_${safePlant}_${safeTitle}.pdf`;
        
        const pdfBlob = doc.output('blob');
        folder?.file(fileName, pdfBlob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      
      const url = window.URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error("Erro ao gerar ZIP:", error);
      alert("Erro ao gerar o relatório. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded p-2 text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Baixar Relatórios (PDF)">
      <div className="space-y-4 p-1">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-700 text-xs text-yellow-800 dark:text-yellow-200">
          Selecione os filtros abaixo para gerar um arquivo ZIP contendo os relatórios individuais de cada OS.
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Usina</label>
            <select value={selectedPlant} onChange={e => setSelectedPlant(e.target.value)} className={inputClass}>
              <option value="">Todas as permitidas</option>
              {availablePlants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Técnico</label>
            <select value={selectedTechnician} onChange={e => setSelectedTechnician(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Prioridade</label>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t dark:border-gray-700">
          <div>
            <label className="label block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">De</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="label block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Até</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-xs text-blue-800 dark:text-blue-200">
          <strong>Resumo:</strong> {filteredData.length} Ordens de Serviço encontradas.
        </div>

        <div className="flex justify-end pt-4 border-t dark:border-gray-700 gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 rounded text-gray-800 dark:text-white font-medium">Cancelar</button>
          <button 
            onClick={handleDownloadZip} 
            disabled={isGenerating || filteredData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? 'Gerando...' : <><Download size={18} /> Baixar ZIP</>}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DownloadModal;