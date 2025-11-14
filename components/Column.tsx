// File: components/Column.tsx
// Este componente representa uma única coluna no painel Kanban (ex: "OSs Pendentes").

import React from 'react';
// Importa os componentes `Droppable` e `Draggable` da biblioteca de drag-and-drop.
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { OS, OSStatus } from '../types';
import Card from './Card';
// Importa as constantes de cores para estilizar o cabeçalho da coluna.
import { STATUS_COLORS } from '../constants';

// Define as propriedades que o componente Column espera receber do Board.
interface ColumnProps {
    status: OSStatus; // O status que esta coluna representa.
    title: string; // O título a ser exibido no cabeçalho.
    osList: OS[]; // A lista de OSs que pertencem a esta coluna.
    onCardClick: (os: OS) => void; // Função para lidar com o clique em um card.
    onOpenDownloadFilter: () => void; // Função para abrir o modal de download.
}

const Column: React.FC<ColumnProps> = ({ status, title, osList, onCardClick, onOpenDownloadFilter }) => {
    return (
        // Contêiner principal da coluna.
        <div className="flex flex-col w-80 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex-shrink-0">
            {/* Cabeçalho da coluna, colorido de acordo com o status. */}
            <div className={`flex items-center justify-between p-3 rounded-t-lg ${STATUS_COLORS[status]}`}>
                 <h4 className="font-bold text-white">{title}</h4>
                 <div className="flex items-center space-x-2">
                    {/* Botão de download */}
                    <button onClick={onOpenDownloadFilter} title="Baixar relatórios" className="text-white hover:bg-black/20 p-1 rounded-full">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                    </button>
                    {/* Contador de OSs na coluna. */}
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-black bg-opacity-20 rounded-full">
                        {osList.length}
                    </span>
                 </div>
            </div>
           
            {/* `Droppable` define a área onde os cards podem ser soltos. `droppableId` deve ser único. */}
            <Droppable droppableId={status}>
                {(provided, snapshot) => (
                    // `provided.innerRef` e `...provided.droppableProps` são necessários para a biblioteca funcionar.
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                    >
                        {/* Mapeia a lista de OSs para renderizar um componente `Card` para cada uma. */}
                        {osList.map((os, index) => (
                            // `Draggable` torna o card arrastável. `draggableId` e `key` devem ser únicos.
                            <Draggable key={os.id} draggableId={os.id} index={index}>
                                {(provided, snapshot) => (
                                    // `provided.innerRef`, `...provided.draggableProps`, e `...provided.dragHandleProps` são necessários.
                                    // `dragHandleProps` define a área que pode ser usada para arrastar o item (neste caso, o card inteiro).
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
                        {/* `provided.placeholder` cria um espaço na lista enquanto um item está sendo arrastado. */}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default Column;
