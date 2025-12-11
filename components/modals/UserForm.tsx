// File: components/modals/UserForm.tsx
// Este componente renderiza um formulário modal para criar ou editar usuários.

import React, { useState } from 'react';
import { User, Role } from '../../types';
import { useData } from '../../contexts/DataContext';

interface UserFormProps {
    user?: User; // Se undefined, é criação
    initialData?: User; // Compatibilidade com chamadas antigas se houver
    role?: Role;  // Role pré-definida
    onClose: () => void;
    // Callback para salvar. Quem usa o componente define a lógica (API).
    onSave: (user: Partial<User>) => void;
    isOpen?: boolean;
}

// ✅ CORREÇÃO: Mapa de tradução limpo para evitar erro de duplicidade de chave TS
// Se Role.CLIENT for "Cliente", colocar [Role.CLIENT]: "..." e "Cliente": "..." causava o erro.
const roleLabels: Partial<Record<string, string>> = {
    [Role.ADMIN]: "Administrador",
    [Role.COORDINATOR]: "Coordenador",
    [Role.SUPERVISOR]: "Supervisor",
    [Role.OPERATOR]: "Operador",
    [Role.TECHNICIAN]: "Técnico",
    [Role.ASSISTANT]: "Auxiliar",
    [Role.CLIENT]: "Cliente",
};

const UserForm: React.FC<UserFormProps> = ({ 
    user: propUser, 
    initialData, 
    role, 
    onClose, 
    onSave,
    isOpen = true 
}) => {
    // Adapter para props
    const user = propUser || initialData;
    
    // Contexto apenas para ler plantas (não para salvar usuário)
    const { plants } = useData();
    
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState(''); 
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [selectedPlants, setSelectedPlants] = useState<string[]>(user?.plantIds || []);
    
    const currentRole = user?.role || role || Role.CLIENT;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const userData: Partial<User> = {
            ...user,
            name,
            username,
            role: currentRole,
            email,
            phone,
            plantIds: selectedPlants
        };

        if (password) {
            userData.password = password;
        }

        // Chama o callback do pai (ManagementModal)
        onSave(userData);
    };

    const togglePlant = (plantId: string) => {
        setSelectedPlants(prev => 
            prev.includes(plantId) 
                ? prev.filter(id => id !== plantId)
                : [...prev, plantId]
        );
    };

    if (!isOpen) return null;

    // Tenta pegar o label do enum, ou usa a string direta como fallback
    const roleTitle = roleLabels[currentRole] || currentRole;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold mb-4 dark:text-white">
                    {user ? 'Editar Usuário' : `Novo ${roleTitle}`}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">Nome Completo</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Usuário (Login)</label>
                            <input 
                                required
                                type="text" 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Senha</label>
                            <input 
                                type="password" 
                                placeholder={user ? "(Manter atual)" : "Senha inicial"}
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Email</label>
                            <input 
                                type="email" 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">Telefone</label>
                            <input 
                                type="tel" 
                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">Vínculo com Usinas</label>
                        <div className="max-h-32 overflow-y-auto border rounded p-2 dark:bg-gray-700 dark:border-gray-600">
                            {plants.map(plant => (
                                <label key={plant.id} className="flex items-center space-x-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={selectedPlants.includes(plant.id)}
                                        onChange={() => togglePlant(plant.id)}
                                        className="rounded text-blue-600"
                                    />
                                    <span className="text-sm dark:text-gray-200">{plant.name}</span>
                                </label>
                            ))}
                            {plants.length === 0 && <p className="text-xs text-gray-500">Nenhuma usina cadastrada.</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;