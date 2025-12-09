// File: components/Board.tsx
import React, { useState, useMemo } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import Column from './Column';
import { useData } from '../contexts/DataContext';
import { OSStatus, OS } from '../types';
import OSDetailModal from './modals/OSDetailModal';
import OSForm from './modals/OSForm';

interface BoardProps {
    onOpenDownloadFilter?: () => void;
    // ✅ NOVO: Recebe a lista filtrada do pai (Dashboard)
    osList: OS[];
}

const Board: React.FC<BoardProps> = ({ onOpenDownloadFilter, osList }) => {
  const { updateOS } = useData();
  
  const [selectedOSId, setSelectedOSId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const selectedOS = useMemo(() => 
    osList.find(o => o.id === selectedOSId) || null, 
  [osList, selectedOSId]);

  // Agora usa 'osList' (que vem filtrada) em vez de pegar tudo do contexto
  const columnsData = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      
      const future = osList.filter(os => os.status === OSStatus.PENDING && os.startDate > today);
      const pending = osList.filter(os => os.status === OSStatus.PENDING && os.startDate <= today);
      const inProgress = osList.filter(os => os.status === OSStatus.IN_PROGRESS);
      const inReview = osList.filter(os => os.status === OSStatus.IN_REVIEW);
      const completed = osList.filter(os => os.status === OSStatus.COMPLETED);

      return {
          'FUTURE': { title: '📅 Futuras', items: future, color: 'bg-indigo-900', isFuture: true },
          [OSStatus.PENDING]: { title: 'Pendente', items: pending, color: 'bg-yellow-100 dark:bg-yellow-900/30', isFuture: false },
          [OSStatus.IN_PROGRESS]: { title: 'Em Execução', items: inProgress, color: 'bg-blue-100 dark:bg-blue-900/30', isFuture: false },
          [OSStatus.IN_REVIEW]: { title: 'Em Revisão', items: inReview, color: 'bg-purple-100 dark:bg-purple-900/30', isFuture: false },
          [OSStatus.COMPLETED]: { title: 'Concluído', items: completed, color: 'bg-green-100 dark:bg-green-900/30', isFuture: false },
      };
  }, [osList]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const os = osList.find(o => o.id === draggableId);
    if (!os) return;

    const destId = destination.droppableId;
    let updates: Partial<OS> = {};

    if (destId === 'FUTURE') {
        updates.status = OSStatus.PENDING;
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        updates.startDate = tomorrow.toISOString().split('T')[0];
    } else {
        updates.status = destId as OSStatus;

        if (source.droppableId === 'FUTURE') {
            updates.startDate = new Date().toISOString().split('T')[0];
        }
        
        if (destId === OSStatus.IN_PROGRESS) {
            updates.isInReview = false; 
            updates.endDate = undefined; 
            if (!os.executionStart) updates.executionStart = new Date().toISOString();
        }
        
        if (destId === OSStatus.IN_REVIEW) {
            updates.isInReview = true;
        }

        if (destId === OSStatus.COMPLETED) {
            updates.endDate = new Date().toISOString();
            updates.isInReview = false;
        }
    }

    updateOS({ ...os, ...updates });
  };

  return (
    <div className="h-full flex flex-col">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-4 p-4 min-w-[1600px]">
            {Object.entries(columnsData).map(([columnId, col]) => (
              <Column 
                key={columnId} 
                status={columnId as any} 
                title={col.title} 
                items={col.items} 
                color={col.color}
                isFutureColumn={col.isFuture}
                onCardClick={(os) => setSelectedOSId(os.id)}
                onOpenDownloadFilter={onOpenDownloadFilter}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {selectedOS && !isEditing && (
        <OSDetailModal 
          isOpen={true} 
          os={selectedOS} 
          onClose={() => setSelectedOSId(null)} 
          onEdit={() => setIsEditing(true)}
        />
      )}

      {isEditing && selectedOS && (
        <OSForm 
          isOpen={true} 
          initialData={selectedOS} 
          onClose={() => setIsEditing(false)}
        />
      )}
    </div>
  );
};

export default Board;