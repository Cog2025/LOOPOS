// File: components/Board.tsx
// Este componente é o contêiner principal para o painel Kanban,
// utilizando a biblioteca `react-beautiful-dnd` para a funcionalidade de arrastar e soltar.

import React from 'react';
// Importa os componentes e tipos necessários da biblioteca de drag-and-drop.
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { OS, OSStatus } from '../types';
import Column from './Column';
// Importa constantes usadas para os títulos das colunas e a ordem dos status.
import { STATUS_COLUMN_TITLES, OS_STATUSES } from '../constants';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';

// Define as propriedades que o componente Board espera receber do Dashboard.
interface BoardProps {
    osList: OS[]; // A lista de Ordens de Serviço a serem exibidas.
    onUpdateOS: (os: OS) => void; // Função para atualizar uma OS (ex: mudar o status).
    onCardClick: (os: OS) => void; // Função para abrir o modal de detalhes da OS.
    onOpenDownloadFilter: () => void; // Função para abrir o modal de download.
}


const Board: React.FC<BoardProps> = ({ osList, onUpdateOS, onCardClick, onOpenDownloadFilter }) => {
    const { filterOSForUser } = useData();
    const { user } = useAuth();
    // Lista efetivamente exibida de acordo com o papel do usuário
    const visibleOS = user ? filterOSForUser(user) : osList;

    /**
     * Função chamada ao final de uma operação de arrastar e soltar.
     * @param result O objeto contendo informações sobre a ação de arrastar (origem, destino, etc.).
     */
    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Se não houver destino (o item foi solto fora de uma coluna) ou se o item voltou para a mesma posição, não faz nada.
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
            }

        // Encontra a OS que foi movida.
        const osToMove = visibleOS.find(os => os.id === draggableId);
        if (osToMove) {
            // Obtém o novo status a partir do ID da coluna de destino.
            const newStatus = destination.droppableId as OSStatus;
            // Chama a função de atualização do DataContext para persistir a mudança de status.
            onUpdateOS({ ...osToMove, status: newStatus });
        }
    };

    // O JSX do painel.
    return (
        // `DragDropContext` é o componente que envolve toda a área onde o drag-and-drop é permitido.
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full p-4 space-x-4 overflow-x-auto">
                {/* Mapeia a lista de status para criar uma coluna para cada um. */}
                {OS_STATUSES.map(status => {
                    // Filtra a lista de OS para obter apenas as que pertencem a esta coluna (status).
                    const osInColumn = visibleOS.filter(os => os.status === status);
                    return (
                        <Column
                            key={status}
                            status={status}
                            title={STATUS_COLUMN_TITLES[status]}
                            osList={osInColumn}
                            onCardClick={onCardClick}
                            onOpenDownloadFilter={onOpenDownloadFilter}
                        />
                    );
                })}
            </div>
        </DragDropContext>
    );
};

export default Board;