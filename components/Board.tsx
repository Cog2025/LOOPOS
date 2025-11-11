import React from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
import { OS, OSStatus } from '../types';
import Column from './Column';
import { STATUS_COLUMN_TITLES, OS_STATUSES } from '../constants';

interface BoardProps {
    osList: OS[];
    onUpdateOS: (os: OS) => void;
    onCardClick: (os: OS) => void;
    onOpenDownloadFilter: () => void;
}

const Board: React.FC<BoardProps> = ({ osList, onUpdateOS, onCardClick, onOpenDownloadFilter }) => {

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        const osToMove = osList.find(os => os.id === draggableId);
        if (osToMove) {
            const newStatus = destination.droppableId as OSStatus;
            onUpdateOS({ ...osToMove, status: newStatus });
        }
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full p-4 space-x-4 overflow-x-auto">
                {OS_STATUSES.map(status => {
                    const osInColumn = osList.filter(os => os.status === status);
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
