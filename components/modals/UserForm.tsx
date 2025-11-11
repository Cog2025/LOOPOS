import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { User, Role } from '../../types';
import Modal from './Modal';
import { ROLES } from '../../constants';

interface UserFormProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: User;
    roleToCreate?: Role;
}

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, initialData, roleToCreate }) => {
    const { users, plants, addUser, updateUser } = useData();
    const supervisors = users.filter(u => u.role === Role.SUPERVISOR);
    
    const isEditing = !!initialData;
    const currentUserRole = initialData ? initialData.role : roleToCreate;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        role: currentUserRole || Role.TECHNICIAN,
        password: '',
        plantIds: [] as string[],
        supervisorId: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                phone: initialData.phone,
                role: initialData.role,
                password: '', // Password is not edited here for security
                plantIds: initialData.plantIds || [],
                supervisorId: initialData.supervisorId || '',
            });
        } else {
             setFormData({
                name: '', email: '', phone: '',
                role: roleToCreate || Role.TECHNICIAN,
                password: '', plantIds: [], supervisorId: '',
            });
        }
    }, [initialData, roleToCreate, isOpen]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePlantChange = (plantId: string) => {
        setFormData(prev => {
            const newPlantIds = prev.plantIds.includes(plantId)
                ? prev.plantIds.filter(id => id !== plantId)
                : [...prev.plantIds, plantId];
            return { ...prev, plantIds: newPlantIds };
        });
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = {
            ...formData,
            plantIds: formData.plantIds.length > 0 ? formData.plantIds : undefined,
            supervisorId: formData.supervisorId || undefined,
        }
        if (isEditing) {
            updateUser({ ...initialData, ...userData });
        } else {
            // SECURITY_NOTE: In a real app, password must be hashed server-side.
            addUser({ ...userData, password: formData.password || '123' });
        }
        onClose();
    };
    
    const FormField: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            {children}
        </div>
    );
    
    const TextInput: React.FC<{name: string, value: string, type?: string, required?: boolean}> = ({name, value, type='text', required = false}) => (
         <input
            type={type}
            name={name}
            value={value}
            onChange={handleChange}
            required={required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
        />
    );

    const showPlantAssignment = currentUserRole && [Role.SUPERVISOR, Role.TECHNICIAN].includes(currentUserRole);

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isEditing ? `Editar ${initialData.name}` : `Novo ${roleToCreate}`}
            footer={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancelar</button>
                    <button onClick={handleSubmit} type="submit" form="user-form" className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Salvar</button>
                </>
            }
        >
            <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Nome"><TextInput name="name" value={formData.name} required /></FormField>
                <FormField label="Email"><TextInput name="email" value={formData.email} type="email" required /></FormField>
                <FormField label="Telefone"><TextInput name="phone" value={formData.phone} /></FormField>
                
                {!isEditing && (
                    <FormField label="Senha (temporária)">
                        <TextInput name="password" value={formData.password} type="password" required />
                    </FormField>
                )}

                {showPlantAssignment && (
                    <FormField label="Usinas Associadas">
                        <div className="grid grid-cols-2 gap-2 p-2 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">
                            {plants.map(plant => (
                                <label key={plant.id} className="flex items-center space-x-2">
                                    <input type="checkbox" checked={formData.plantIds.includes(plant.id)} onChange={() => handlePlantChange(plant.id)} className="rounded" />
                                    <span>{plant.name}</span>
                                </label>
                            ))}
                        </div>
                    </FormField>
                )}
                
                {formData.role === Role.TECHNICIAN && (
                    <FormField label="Supervisor Responsável">
                        <select name="supervisorId" value={formData.supervisorId} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600">
                            <option value="">Selecione um supervisor</option>
                            {supervisors.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
                        </select>
                    </FormField>
                )}
            </form>
        </Modal>
    );
};

export default UserForm;