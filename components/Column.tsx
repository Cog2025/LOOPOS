import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { OS, OSStatus } from '../types';
import Card from './Card';
import { STATUS_COLORS } from '../constants';

interface ColumnProps {
    status: OSStatus;
    title: string;
    osList: OS[];
    onCardClick: (os: OS) => void;
    onOpenDownloadFilter: () => void;
}

const Column: React.FC<ColumnProps> = ({ status, title, osList, onCardClick, onOpenDownloadFilter }) => {
    return (
        <div className="flex flex-col w-80 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex-shrink-0">
            <div className={`flex items-center justify-between p-3 rounded-t-lg ${STATUS_COLORS[status]}`}>
                 <h4 className="font-bold text-white">{title}</h4>
                 <div className="flex items-center space-x-2">
                    <button onClick={onOpenDownloadFilter} title="Baixar relatórios" className="text-white hover:bg-black/20 p-1 rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                    </button>
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-black bg-opacity-20 rounded-full">
                        {osList.length}
                    </span>
                 </div>
            </div>
           
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                    >
                        {osList.map((os, index) => (
                            <Draggable key={os.id} draggableId={os.id} index={index}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`mb-3 ${snapshot.isDragging ? 'opacity-80 shadow-2xl' : ''}`}
                                    >
                                        <Card os={os} onCardClick={onCardClick} />
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default Column;
