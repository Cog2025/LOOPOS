import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Role } from '../types';
import { Shield, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../components/utils/config';

const AdminPermissoes: React.FC = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    
    const roles = ["Operador", "Coordenador", "Supervisor", "Técnico", "Auxiliar", "Coordinator", "Technician", "Assistant"];
    const [selectedRole, setSelectedRole] = useState(roles[0]);

    const token = localStorage.getItem('access_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(user?.id ? { 'X-User-Id': user.id } : {})
    };

    const fetchPermissions = async () => {
        const res = await fetch(`${API_BASE}/api/permissions/${selectedRole}`, { headers });
        if (!res.ok) throw new Error("Erro ao buscar permissões");
        return res.json();
    };

    const { data: permissions, isLoading } = useQuery({
        queryKey: ['permissionsAdmin', selectedRole],
        queryFn: fetchPermissions
    });

    const [localPerms, setLocalPerms] = useState<Record<string, boolean>>({});

    React.useEffect(() => {
        if (permissions) {
            const map: Record<string, boolean> = {};
            permissions.forEach((p: any) => { map[p.slug] = p.allowed; });
            setLocalPerms(map);
        }
    }, [permissions, selectedRole]);

    const updatePermissions = async (payload: any) => {
        const res = await fetch(`${API_BASE}/api/permissions/${selectedRole}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ permissions: payload })
        });
        if (!res.ok) throw new Error("Erro ao atualizar");
        return res.json();
    };

    const mutation = useMutation({
        mutationFn: updatePermissions,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['permissionsAdmin'] });
            queryClient.invalidateQueries({ queryKey: ['permissions'] });
            alert("Permissões salvas com sucesso!");
        }
    });

    const handleToggle = (slug: string) => {
        setLocalPerms(prev => ({ ...prev, [slug]: !prev[slug] }));
    };

    const handleSave = () => {
        const payload = Object.keys(localPerms).map(slug => ({
            slug, allowed: localPerms[slug]
        }));
        mutation.mutate(payload);
    };

    if (user?.role !== Role.ADMIN && user?.role !== Role.OPERATOR) {
        return <div className="p-6 text-red-500">Acesso restrito.</div>;
    }

    return (
        <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-blue-600" size={28} />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gerenciador de Permissões</h2>
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecione o Cargo (Role)</label>
                    <select 
                        className="w-full md:w-1/3 p-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>

                {isLoading ? (
                    <div className="text-gray-500 animate-pulse">Carregando permissões...</div>
                ) : (
                    <div className="space-y-4 max-w-2xl">
                        {Object.keys(localPerms).length === 0 && (
                            <div className="text-gray-500 italic">Nenhuma permissão encontrada para este cargo. Execute o seed.</div>
                        )}
                        {Object.keys(localPerms).map(slug => (
                            <div key={slug} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                                <div className="flex flex-col">
                                    <span className="font-bold text-gray-800 dark:text-gray-200">{slug}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">Permite ações associadas à chave '{slug}'</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={localPerms[slug] || false}
                                        onChange={() => handleToggle(slug)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-8 border-t dark:border-gray-700 pt-4 flex justify-end">
                    <button 
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-sm disabled:opacity-50 transition-colors"
                    >
                        <Save size={18} />
                        {mutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};
export default AdminPermissoes;
