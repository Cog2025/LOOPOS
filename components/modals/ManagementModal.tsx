import React from 'react';
import Modal from './Modal';

interface ManagementModalProps<T extends { id: string }> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: T[];
    onEdit: (item: T) => void;
    // onDelete?: (itemId: string) => void; // Future improvement
    displayAttribute: keyof T;
}

const ManagementModal = <T extends { id: string; }>({ 
    isOpen, 
    onClose, 
    title, 
    items, 
    onEdit, 
    displayAttribute 
}: ManagementModalProps<T>) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-3">
                {items.length > 0 ? items.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                        <span className="text-gray-800 dark:text-gray-200">{String(item[displayAttribute])}</span>
                        <button 
                            onClick={() => onEdit(item)}
                            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                            Editar
                        </button>
                    </div>
                )) : (
                    <p className="text-center text-gray-500 dark:text-gray-400">Nenhum item encontrado.</p>
                )}
            </div>
        </Modal>
    );
};

export default ManagementModal;
