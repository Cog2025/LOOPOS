import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { useData } from './DataContext';

interface AuthContextType {
    user: User | null;
    login: (email: string, pass: string) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const { users } = useData();

    useEffect(() => {
        // Check for a logged-in user in local storage on initial load
        const storedUser = localStorage.getItem('authUser');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const login = (email: string, pass: string): boolean => {
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
        if (foundUser) {
            const userToStore = { ...foundUser };
            delete userToStore.password; // Don't store password
            setUser(userToStore);
            localStorage.setItem('authUser', JSON.stringify(userToStore));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('authUser');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
