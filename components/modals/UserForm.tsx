// File: components/modals/UserForm.tsx
// Este componente renderiza um formulário modal para criar ou editar usuários.

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { User, Role } from '../../types';
import Modal from './Modal';
import { ROLES } from '../../constants';

// Componentes auxiliares para layout
const FormField: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({label, children, className}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const inputClasses = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 caret-blue-600";

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: User;
  role?: Role;
}

type UserFormData = Omit<User, 'id'>;

const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, initialData, role }) => {
  const { addUser, updateUser, plants, users } = useData();
  
  const [formData, setFormData] = useState<UserFormData>({
    name: '', username: '', email: '', phone: '', password: '',
    role: role || Role.TECHNICIAN, can_login: true,
    supervisorId: '', plantIds: []
  });

  // ✅ CORREÇÃO CRÍTICA DE SINCRONIZAÇÃO:
  // Garante que os checkboxes reflitam as atribuições feitas no PlantForm,
  // mesmo que o objeto do usuário ainda não tenha sido atualizado no contexto.
  useEffect(() => {
    if (initialData) {
        // 1. Começa com os IDs que o usuário já tem salvos
        const userPlantIds = new Set(initialData.plantIds || []);
        
        // 2. VARREDURA: Olha todas as usinas para ver se este usuário está escalado lá
        plants.forEach(p => {
            if (
                p.coordinatorId === initialData.id ||
                p.supervisorIds?.includes(initialData.id) ||
                p.technicianIds?.includes(initialData.id) ||
                p.assistantIds?.includes(initialData.id)
            ) {
                userPlantIds.add(p.id); // Força a marcação do checkbox
            }
        });

        setFormData({
            ...initialData,
            plantIds: Array.from(userPlantIds), // Usa a lista combinada e corrigida
            password: '' // Limpa senha para não exibir hash
        });
    } else {
        // Reset para novo usuário
        setFormData({
            name: '', username: '', email: '', phone: '', password: '',
            role: role || Role.TECHNICIAN, can_login: true,
            supervisorId: '', plantIds: []
        });
    }
  }, [initialData, role, isOpen, plants]); // 'plants' na dependência garante reatividade

  // Filtra supervisores baseado nas usinas selecionadas
  const supervisorsForSelectedPlants = useMemo(() => {
      if (formData.plantIds.length === 0) return users.filter(u => u.role === Role.SUPERVISOR);
      
      const plantSupervisors = new Set<string>();
      formData.plantIds.forEach(pId => {
          const plant = plants.find(p => p.id === pId);
          plant?.supervisorIds?.forEach(id => plantSupervisors.add(id));
      });
      return users.filter(u => plantSupervisors.has(u.id));
  }, [formData.plantIds, plants, users]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handlePlantChange = (plantId: string) => {
      setFormData(prev => {
          const current = prev.plantIds || [];
          const updated = current.includes(plantId) 
              ? current.filter(id => id !== plantId)
              : [...current, plantId];
          return { ...prev, plantIds: updated };
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (initialData) {
          // Mantém a senha antiga se não for alterada
          const payload = { ...initialData, ...formData };
          if (!formData.password) payload.password = initialData.password;
          await updateUser(payload);
      } else {
          await addUser(formData);
      }
      onClose();
    } catch (error) { alert("Erro ao salvar usuário"); }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Usuário' : 'Novo Usuário'}>
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto p-1">
        <div className="grid grid-cols-2 gap-4">
            <FormField label="Nome Completo"><input name="name" value={formData.name} onChange={handleChange} required className={inputClasses} /></FormField>
            <FormField label="Usuário (Login)"><input name="username" value={formData.username} onChange={handleChange} required className={inputClasses} /></FormField>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
            <FormField label="E-mail"><input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputClasses} /></FormField>
            <FormField label="Telefone"><input name="phone" value={formData.phone} onChange={handleChange} className={inputClasses} /></FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <FormField label="Senha">
                <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder={initialData ? "(Manter atual)" : ""} required={!initialData} className={inputClasses} />
            </FormField>
            <FormField label="Função">
                <select name="role" value={formData.role} onChange={handleChange} className={inputClasses}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </FormField>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer mt-2">
            <input type="checkbox" name="can_login" checked={formData.can_login} onChange={handleChange} className="rounded text-blue-600 w-5 h-5" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Permitir Login no Sistema?</span>
        </label>

        {/* Exibe seleção de usinas para cargos técnicos/operacionais */}
        {(formData.role === Role.TECHNICIAN || formData.role === Role.SUPERVISOR || formData.role === Role.ASSISTANT || formData.role === Role.COORDINATOR) && (
          <FormField label="Usinas Associadas">
            <div className="grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-800">
              {plants.map(plant => (
                <label key={plant.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded">
                  <input
                    type="checkbox"
                    checked={formData.plantIds.includes(plant.id)}
                    onChange={() => handlePlantChange(plant.id)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm">{plant.name}</span>
                </label>
              ))}
            </div>
          </FormField>
        )}

        {formData.role === Role.TECHNICIAN && (
          <FormField label="Supervisor Responsável">
            <select name="supervisorId" value={formData.supervisorId || ''} onChange={handleChange} className={inputClasses}>
              <option value="">Selecione um supervisor</option>
              {supervisorsForSelectedPlants.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </FormField>
        )}
        
        <div className="pt-4 border-t mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar</button>
        </div>
      </form>
    </Modal>
  );
};

export default React.memo(UserForm);