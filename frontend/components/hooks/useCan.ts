import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Role } from '../../types';
import { API_BASE } from '../utils/config';

interface Permission {
    slug: string;
    allowed: boolean;
}

const fetchPermissions = async (role: string): Promise<Permission[]> => {
    const response = await fetch(`${API_BASE}/api/permissions/${role}`);
    if (!response.ok) {
        throw new Error('Erro ao buscar permissões');
    }
    return response.json();
};

export const useCan = () => {
    const { user } = useAuth();

    const { data: permissions } = useQuery({
        queryKey: ['permissions', user?.role],
        queryFn: () => fetchPermissions(user!.role),
        enabled: !!user && user.role !== Role.ADMIN,
        staleTime: 1000 * 60 * 30, // Cache de 30 minutos
    });

    return (slug: string): boolean => {
        if (!user) return false;
        
        // Bypass de administrador
        if (user.role === Role.ADMIN) return true;
        
        if (!permissions) return false;
        
        const perm = permissions.find(p => p.slug === slug);
        return perm ? perm.allowed : false;
    };
};
