import React from 'react';
import { OS, Priority } from '../types';
import { useData } from '../contexts/DataContext';

interface CardProps {
    os: OS;
    onCardClick: (os: OS) => void;
}

const PRIORITY_COLORS: { [key in Priority]: string } = {
    [Priority.LOW]: 'border-l-green-500',
    [Priority.MEDIUM]: 'border-l-yellow-500',
    [Priority.HIGH]: 'border-l-orange-500',
    [Priority.URGENT]: 'border-l-red-500',
};

const Card: React.FC<CardProps> = ({ os, onCardClick }) => {
    const { plants, users } = useData();
    const plant = plants.find(p => p.id === os.plantId);
    const technician = users.find(u => u.id === os.technicianId);

    // Split title into ID and Activity
    const [osId, osActivity] = os.title.split(' - ');

    return (
        <div 
            onClick={() => onCardClick(os)}
            className={`bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${PRIORITY_COLORS[os.priority]}`}
        >
            <h5 className="font-bold text-sm text-gray-800 dark:text-gray-100 mb-1">
                <span className="font-extrabold">{osId}</span> - {osActivity}
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">
                {plant?.name || 'Usina não encontrada'}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span>{technician?.name.split(' ')[0] || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(os.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
            </div>
        </div>
    );
};

export default Card;