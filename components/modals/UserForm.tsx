// File: components/modals/UserForm.tsx
// Este componente renderiza um formulário modal para criar ou editar usuários.
// ATUALIZAÇÃO: Usa diretamente o Contexto (addUser/updateUser) para salvar, eliminando erro de onSave.

import React, { useState, useMemo } from 'react';
import { User, Role } from '../../types';
import { useData } from '../../contexts/DataContext';

interface UserFormProps {
    user?: User; // Se undefined, é criação
    initialData?: User; // Compatibilidade
    role?: Role;  // Role pré-definida
    onClose: () => void;
    isOpen?: boolean;
    // onSave removido, pois o form gerencia seu próprio salvamento via Contexto
}

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
    isOpen = true 
}) => {
    // Adapter para props
    const user = propUser || initialData;
    
    // ✅ CORREÇÃO: Importando as funções corretas do Contexto
    const { plants, addUser, updateUser } = useData();
    
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [password, setPassword] = useState(''); 
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [selectedPlants, setSelectedPlants] = useState<string[]>(user?.plantIds || []);
    const [selectedClientGroup, setSelectedClientGroup] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    
    const currentRole = user?.role || role || Role.CLIENT;

    // Dropdown inteligente de clientes
    const uniqueClients = useMemo(() => {
        const clients = new Set(plants.map(p => p.client).filter(Boolean));
        return Array.from(clients).sort();
    }, [plants]);

    const handleClientGroupChange = (clientName: string) => {
        setSelectedClientGroup(clientName);
        if (clientName) {
            const plantsOfClient = plants
                .filter(p => p.client === clientName)
                .map(p => p.id);
            setSelectedPlants(plantsOfClient);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
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

        try {
            if (user?.id) {
                // Edição
                await updateUser(userData as User);
            } else {
                // Criação (Omitindo ID pois o backend gera)
                await addUser(userData as Omit<User, 'id'>);
            }
            onClose();
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            alert("Erro ao salvar usuário. Verifique se o login já existe.");
        } finally {
            setIsSaving(false);
        }
    };

    const togglePlant = (plantId: string) => {
        setSelectedPlants(prev => 
            prev.includes(plantId) 
                ? prev.filter(id => id !== plantId)
                : [...prev, plantId]
        );
    };

    if (!isOpen) return null;

    const roleTitle = roleLabels[currentRole] || currentRole;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl flex flex-col max-h-[90vh]">
                <h2 className="text-xl font-bold mb-4 dark:text-white shrink-0">
                    {user ? 'Editar Usuário' : `Novo ${roleTitle}`}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                        <input 
                            required
                            type="text" 
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Usuário (Login)</label>
                            <input 
                                required
                                type="text" 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Senha</label>
                            <input 
                                type="password" 
                                placeholder={user ? "(Manter atual)" : "Senha inicial"}
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input 
                                type="email" 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                            <input 
                                type="tel" 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                        <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">
                            Associação de Usinas
                        </label>
                        
                        {currentRole === Role.CLIENT && (
                            <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-100 dark:border-blue-800">
                                <label className="block text-xs font-bold text-blue-800 dark:text-blue-300 mb-1 uppercase">
                                    Vincular a um Cliente (Seleção Rápida)
                                </label>
                                <select 
                                    className="w-full p-2 border border-blue-300 rounded text-sm bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                                    value={selectedClientGroup}
                                    onChange={(e) => handleClientGroupChange(e.target.value)}
                                >
                                    <option value="">Selecione uma empresa...</option>
                                    {uniqueClients.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                                    Selecionar uma empresa marcará automaticamente todas as suas usinas abaixo.
                                </p>
                            </div>
                        )}

                        <div className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2 dark:bg-gray-700 dark:border-gray-600 bg-gray-50">
                            {plants.length === 0 && <p className="text-xs text-gray-500">Nenhuma usina cadastrada.</p>}
                            
                            {[...plants].sort((a,b) => a.name.localeCompare(b.name)).map(plant => (
                                <label key={plant.id} className="flex items-center space-x-2 p-1.5 hover:bg-white dark:hover:bg-gray-600 rounded cursor-pointer transition-colors border-b border-transparent hover:border-gray-200">
                                    <input 
                                        type="checkbox"
                                        checked={selectedPlants.includes(plant.id)}
                                        onChange={() => togglePlant(plant.id)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium dark:text-gray-200">{plant.name}</span>
                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{plant.client}</span>
                                    </div>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-right">
                            {selectedPlants.length} usina(s) selecionada(s).
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <button 
                            type="button" 
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded font-medium dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow transition-colors flex items-center gap-2"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;