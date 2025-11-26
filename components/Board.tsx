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
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

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

        // Se soltar na coluna "FUTURAS", a gente ignora (para não mudar status para algo inválido)
        if (destination.droppableId === 'FUTURE') return;

        // Encontra a OS que foi movida.
        const osToMove = visibleOS.find(os => os.id === draggableId);
        if (osToMove) {
            // Prepara atualização
            const updates: Partial<OS> = { status: destination.droppableId as OSStatus };
            
            // Se veio de FUTURAS para PENDENTES, a data deveria atualizar para HOJE
            if (source.droppableId === 'FUTURE' && destination.droppableId === OSStatus.PENDING) {
                updates.startDate = new Date().toISOString();
            }

            // Chama a função de atualização do DataContext para persistir a mudança de status.
            onUpdateOS({ ...osToMove, ...updates });
        }
    };

    // Helper para verificar datas futuras
    const isFuture = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Fim de hoje
        return date > today;
    };

    // Separa as OSs Pendentes em "Atuais" e "Futuras"
    const futureOS = visibleOS.filter(os => os.status === OSStatus.PENDING && isFuture(os.startDate));
    
    // Função auxiliar para filtrar OS da coluna (excluindo futuras se for Pendente)
    const getColumnOS = (status: OSStatus) => {
        if (status === OSStatus.PENDING) {
            return visibleOS.filter(os => os.status === status && !isFuture(os.startDate));
        }
        return visibleOS.filter(os => os.status === status);
    };

    // O JSX do painel.
    return (
        // `DragDropContext` é o componente que envolve toda a área onde o drag-and-drop é permitido.
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full p-4 space-x-4 overflow-x-auto">
                
                {/* 1. Coluna Especial: AGENDADAS (Futuras) */}
                {/* Usamos um ID 'FUTURE' para o Droppable para diferenciar */}
                <Column
                    key="FUTURE"
                    status={OSStatus.PENDING} // Usa status base pendente
                    title={`📅 Agendadas (> Hoje)`}
                    osList={futureOS}
                    onCardClick={onCardClick}
                    onOpenDownloadFilter={onOpenDownloadFilter}
                    isFutureColumn={true} // Prop nova para estilizar diferente
                />

                {/* Mapeia a lista de status para criar uma coluna para cada um. */}
                {OS_STATUSES.map(status => {
                    // Filtra a lista de OS para obter apenas as que pertencem a esta coluna (status).
                    const osInColumn = getColumnOS(status);
                    const title = status === OSStatus.PENDING ? "Pendentes (A Vencer)" : STATUS_COLUMN_TITLES[status];

                    return (
                        <Column
                            key={status}
                            status={status}
                            title={title}
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