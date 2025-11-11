import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { OS, User, Plant, Notification, OSLog, ImageAttachment, Role, OSStatus, Priority } from '../types';
import { DEFAULT_PLANT_ASSETS } from '../constants';

// --- MOCK DATA ---
const initialUsers: User[] = [
    { id: 'user-1', name: 'Admin User', email: 'admin@admin.com', password: 'admin', phone: '111', role: Role.ADMIN },
    { id: 'user-2', name: 'Maria Oliveira', email: 'maria@supervisor.com', password: '123', phone: '222', role: Role.SUPERVISOR, plantIds: ['plant-1', 'plant-2'] },
    { id: 'user-3', name: 'Carlos Souza', email: 'carlos@technician.com', password: '123', phone: '333', role: Role.TECHNICIAN, plantIds: ['plant-1'], supervisorId: 'user-2' },
    { id: 'user-4', name: 'João Pereira', email: 'joao@technician.com', password: '123', phone: '444', role: Role.TECHNICIAN, plantIds: ['plant-2'], supervisorId: 'user-2' },
    { id: 'user-5', name: 'Ana Costa', email: 'ana@supervisor.com', password: '123', phone: '555', role: Role.SUPERVISOR, plantIds: ['plant-3'] },
    { id: 'user-6', name: 'Pedro Lima', email: 'pedro@technician.com', password: '123', phone: '666', role: Role.TECHNICIAN, plantIds: ['plant-3'], supervisorId: 'user-5' },
    { id: 'user-7', name: 'Luiza Fernandes', email: 'luiza@operator.com', password: '123', phone: '777', role: Role.OPERATOR },
];

const initialPlants: Plant[] = [
    { id: 'plant-1', client: 'Cliente A', name: 'UFV Solar I', subPlants: [{ id: 1, inverterCount: 10 }], stringCount: 100, trackerCount: 50, assets: DEFAULT_PLANT_ASSETS },
    { id: 'plant-2', client: 'Cliente B', name: 'UFV Solar II', subPlants: [{ id: 1, inverterCount: 15 }], stringCount: 150, trackerCount: 75, assets: DEFAULT_PLANT_ASSETS.slice(0, 10) },
    { id: 'plant-3', client: 'Cliente C', name: 'UFV Solar III', subPlants: [{ id: 1, inverterCount: 20 }], stringCount: 200, trackerCount: 100, assets: DEFAULT_PLANT_ASSETS },
];

// Start with no OS
const initialOS: OS[] = [];

const initialNotifications: Notification[] = [];

// --- CONTEXT ---
interface DataContextType {
    users: User[];
    plants: Plant[];
    osList: OS[];
    notifications: Notification[];
    addUser: (user: Omit<User, 'id'>) => void;
    updateUser: (user: User) => void;
    addPlant: (plant: Omit<Plant, 'id'>) => void;
    updatePlant: (plant: Plant, techIds: string[], supIds: string[]) => void;
    addOS: (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => void;
    updateOS: (os: OS) => void;
    addOSLog: (osId: string, log: Omit<OSLog, 'id' | 'timestamp'>) => void;
    addOSAttachment: (osId: string, attachment: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => void;
    deleteOSAttachment: (osId: string, attachmentId: string) => void;
    markNotificationAsRead: (notificationId: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useLocalStorage<User[]>('users', initialUsers);
    const [plants, setPlants] = useLocalStorage<Plant[]>('plants', initialPlants);
    const [osList, setOsList] = useLocalStorage<OS[]>('osList', initialOS);
    const [notifications, setNotifications] = useLocalStorage<Notification[]>('notifications', initialNotifications);
    
    const createNotification = (userId: string, message: string) => {
        const newNotif: Notification = {
            id: `notif-${Date.now()}`, userId, message, read: false, timestamp: new Date().toISOString()
        };
        setNotifications(prev => [newNotif, ...prev]);
    }

    const addUser = (user: Omit<User, 'id'>) => {
        const newUser: User = { ...user, id: `user-${Date.now()}` };
        setUsers(prev => [...prev, newUser]);
    };

    const updateUser = (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    };
    
    const addPlant = (plant: Omit<Plant, 'id'>) => {
        const newPlant: Plant = { ...plant, id: `plant-${Date.now()}` };
        setPlants(prev => [...prev, newPlant]);
    }
    
    const updatePlant = (updatedPlant: Plant, techIds: string[], supIds: string[]) => {
        setPlants(prev => prev.map(p => p.id === updatedPlant.id ? updatedPlant : p));
        setUsers(prevUsers => prevUsers.map(user => {
            if (user.role === Role.TECHNICIAN || user.role === Role.SUPERVISOR) {
                 const isAssigned = (user.role === Role.TECHNICIAN && techIds.includes(user.id)) || (user.role === Role.SUPERVISOR && supIds.includes(user.id));
                 const plantIds = user.plantIds || [];
                 const isCurrentlyAssigned = plantIds.includes(updatedPlant.id);

                 if (isAssigned && !isCurrentlyAssigned) {
                     return { ...user, plantIds: [...plantIds, updatedPlant.id] };
                 }
                 if (!isAssigned && isCurrentlyAssigned) {
                     return { ...user, plantIds: plantIds.filter(id => id !== updatedPlant.id) };
                 }
            }
            return user;
        }));
    };

    const addOS = (osData: Omit<OS, 'id' | 'title' | 'createdAt' | 'updatedAt' | 'logs' | 'imageAttachments'>) => {
        const now = new Date().toISOString();
        // Robust way to get the next ID number, parsing only the digits
        const nextIdNumber = (osList.length > 0 ? Math.max(...osList.map(os => parseInt(os.id.replace(/\D/g, ''), 10))) : 0) + 1;
        const newId = `OS${String(nextIdNumber).padStart(4, '0')}`;
        const newTitle = `${newId} - ${osData.activity}`;

        const newOS: OS = {
            ...osData,
            id: newId,
            title: newTitle,
            createdAt: now,
            updatedAt: now,
            logs: [],
            imageAttachments: [],
        };
        setOsList(prev => [newOS, ...prev]);

        const supervisor = users.find(u => u.id === osData.supervisorId);
        if (supervisor) {
            createNotification(supervisor.id, `Nova OS "${newTitle}" criada.`);
        }
        if (osData.technicianId) {
             createNotification(osData.technicianId, `Você foi atribuído à nova OS "${newTitle}".`);
        }
    };

    const updateOS = (updatedOS: OS) => {
        const originalOS = osList.find(os => os.id === updatedOS.id);
        if (!originalOS) return;
        
        // Rebuild title in case activity changed
        const newTitle = `${updatedOS.id} - ${updatedOS.activity}`;
        const finalOS = { ...updatedOS, title: newTitle, updatedAt: new Date().toISOString() };

        setOsList(prev => prev.map(os => os.id === updatedOS.id ? finalOS : os));
        
        if (originalOS.status !== updatedOS.status) {
            const message = `O status da OS "${finalOS.title}" foi alterado de ${originalOS.status} para ${finalOS.status}.`;
            createNotification(updatedOS.supervisorId, message);
            if (updatedOS.technicianId && updatedOS.technicianId !== updatedOS.supervisorId) {
                createNotification(updatedOS.technicianId, message);
            }
        }
    };
    
    const addOSLog = (osId: string, logData: Omit<OSLog, 'id' | 'timestamp'>) => {
        const newLog: OSLog = { ...logData, id: `log-${Date.now()}`, timestamp: new Date().toISOString() };
        setOsList(prev => prev.map(os => os.id === osId ? { ...os, logs: [newLog, ...os.logs] } : os));
        
        const os = osList.find(o => o.id === osId);
        if (os) {
            const author = users.find(u => u.id === logData.authorId);
            const message = `${author?.name || 'Usuário'} adicionou um comentário à OS "${os.title}".`;
            createNotification(os.supervisorId, message);
            if (logData.statusChange) {
                 const statusMessage = `O status da OS "${os.title}" foi alterado para ${logData.statusChange.to}.`;
                 createNotification(os.supervisorId, statusMessage);
            }
        }
    };

    const addOSAttachment = (osId: string, attachmentData: Omit<ImageAttachment, 'id' | 'uploadedAt'>) => {
        const newAttachment: ImageAttachment = { ...attachmentData, id: `img-${Date.now()}`, uploadedAt: new Date().toISOString() };
        setOsList(prev => prev.map(os => os.id === osId ? { ...os, imageAttachments: [newAttachment, ...os.imageAttachments] } : os));
    };
    
    const deleteOSAttachment = (osId: string, attachmentId: string) => {
        setOsList(prev => prev.map(os => {
            if (os.id === osId) {
                return { ...os, imageAttachments: os.imageAttachments.filter(att => att.id !== attachmentId) };
            }
            return os;
        }));
    };
    
    const markNotificationAsRead = (notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    };

    return (
        <DataContext.Provider value={{
            users, plants, osList, notifications,
            addUser, updateUser, addPlant, updatePlant,
            addOS, updateOS, addOSLog, addOSAttachment, deleteOSAttachment,
            markNotificationAsRead,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): DataContextType => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};