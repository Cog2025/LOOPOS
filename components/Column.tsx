// File: components/Column.tsx
// Este componente representa uma única coluna no painel Kanban (ex: "OSs Pendentes").

import React, { useState } from 'react';
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
    isFutureColumn?: boolean; // Nova prop opcional para identificar coluna de futuras
}

const ITEMS_PER_PAGE = 10; // Número inicial de itens para paginação local

const Column: React.FC<ColumnProps> = ({ status, title, osList, onCardClick, onOpenDownloadFilter, isFutureColumn }) => {
    
    // Estado para controlar quantos itens exibir (paginação local)
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
    
    // Se for coluna futura, mudamos a cor do cabeçalho para diferenciar visualmente
    // Caso contrário usa a cor padrão do status
    const headerColor = isFutureColumn ? 'bg-indigo-500 text-white' : STATUS_COLORS[status];
    const droppableId = isFutureColumn ? 'FUTURE' : status;

    // Lógica de Paginação
    const visibleOS = osList.slice(0, visibleCount);
    const hasMore = osList.length > visibleCount;

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    };

    return (
        // Contêiner principal da coluna.
        // Adicionado max-h-full para garantir que o scroll funcione dentro da área disponível
        <div className="flex flex-col w-80 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-md flex-shrink-0 max-h-full">
            {/* Cabeçalho da coluna, colorido de acordo com o status. */}
            <div className={`flex items-center justify-between p-3 rounded-t-lg ${headerColor}`}>
                 <h4 className="font-bold text-white flex items-center">
                    {isFutureColumn && <span className="mr-2">⏳</span>}
                    {title}
                 </h4>
                 <div className="flex items-center space-x-2">
                    {/* Botão de download (apenas se não for coluna futura) */}
                    {!isFutureColumn && (
                        <button onClick={onOpenDownloadFilter} title="Baixar relatórios" className="text-white hover:bg-black/20 p-1 rounded-full">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                               <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                             </svg>
                        </button>
                    )}
                    {/* Contador de OSs na coluna. */}
                    <span className="px-2 py-1 text-xs font-semibold text-white bg-black bg-opacity-20 rounded-full">
                        {osList.length}
                    </span>
                 </div>
            </div>
           
            {/* `Droppable` define a área onde os cards podem ser soltos. `droppableId` deve ser único. */}
            <Droppable droppableId={droppableId}>
                {(provided, snapshot) => (
                    // `provided.innerRef` e `...provided.droppableProps` são necessários para a biblioteca funcionar.
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-2 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                        style={{ minHeight: '100px' }} 
                    >
                        {/* Mapeia a lista de OSs (PAGINADA) para renderizar um componente `Card`. */}
                        {visibleOS.map((os, index) => (
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

                        {/* Botão "Carregar Mais" (aparece apenas se houver mais itens na lista completa) */}
                        {hasMore && (
                            <button 
                                onClick={handleLoadMore}
                                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 rounded transition-colors mt-2"
                            >
                                Carregar mais ({osList.length - visibleCount}) ...
                            </button>
                        )}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default Column;