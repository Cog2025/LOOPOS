import { useQuery } from '@tanstack/react-query';

export interface PaginatedOSResponse {
    items: any[]; // Substitua por OSType depois, se disponível
    total: number;
    page: number;
    page_size: number;
}

const fetchOSList = async (page: number, pageSize: number): Promise<PaginatedOSResponse> => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
    
    // Obtendo tokens e headers (Compatibilidade híbrida atual JWT/Legacy)
    const token = localStorage.getItem('access_token');
    const userJson = localStorage.getItem('currentUser');
    const user = userJson ? JSON.parse(userJson) : null;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (user && user.id) headers['X-User-Id'] = user.id;

    const response = await fetch(`${API_BASE_URL}/api/os?legacy=false&page=${page}&page_size=${pageSize}`, {
        headers
    });
    
    if (!response.ok) {
        throw new Error('Erro ao buscar a lista de OS');
    }
    
    return response.json();
};

export const useOSList = (page = 1, pageSize = 50) => {
    return useQuery({
        queryKey: ['osList', page, pageSize],
        queryFn: () => fetchOSList(page, pageSize),
    });
};
