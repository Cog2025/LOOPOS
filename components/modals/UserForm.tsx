// File: components/modals/UserForm.tsx
// Este componente renderiza um formulário modal para criar ou editar usuários.

import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { User, Role } from '../../types';
import Modal from './Modal';
import { ROLES } from '../../constants';

// Componentes auxiliares movidos para o escopo do módulo para evitar remounts e perda de foco.
const FormField: React.FC<{label: string, children: React.ReactNode, className?: string}> = ({label, children, className}) => (
  <div className={className}>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    {children}
  </div>
);

const inputClasses =
  "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100 caret-blue-600";

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: User; // Dados do usuário a ser editado. Se ausente, é um formulário de criação.
  role?: Role; // Pré-seleciona a função ao criar um novo usuário a partir de um modal de gerenciamento específico.
}

// Cria tipo para facilitar o estado do formulário sem Partial
type UserFormData = {
  name: string;
  username: string;         // login (ex.: Fabio)
  email?: string;           // opcional
  phone: string;
  password: string;
  role: Role;
  plantIds: string[];
  supervisorId: string;
};


const UserForm: React.FC<UserFormProps> = ({ isOpen, onClose, initialData, role }) => {
  // Acessa os dados e funções do DataContext.
  const { addUser, updateUser, users, plants } = useData();
  const isEditing = !!initialData;

  // ADICIONADO: título estável apenas para esta abertura do modal
  const stableTitleRef = React.useRef(
    isEditing ? `Editar Usuário: ${initialData?.name ?? ''}` : 'Novo Usuário'
  );

  // Função para obter o estado inicial do formulário, seja para um novo usuário ou para edição.
  const getInitialState = (): UserFormData => {
    if (initialData) {
      return {
        name: initialData.name,
        username: initialData.username,
        email: initialData.email,
        phone: initialData.phone,
        password: '',
        role: initialData.role,
        plantIds: [...(initialData.plantIds || [])],
        supervisorId: initialData.supervisorId || '',
      };
    }
    return {
      name: '',
      username: '',
      email: undefined,
      phone: '',
      password: '',
      role: role || Role.OPERATOR, // “Operador”
      plantIds: [],
      supervisorId: ''
    };
  };

  // Estado para armazenar os dados do formulário.
  const [formData, setFormData] = useState<UserFormData>(getInitialState());

  // ADICIONADO: reset do formulário sempre que o modal abre
  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialState());
    }
  }, [isOpen, initialData, role]);

  // Filtra a lista de usuários para obter apenas os supervisores, para o dropdown.
  const supervisors = users.filter(u => u.role === Role.SUPERVISOR);

  
  // Mudança geral + normalização de username
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const v = name === 'username' ? value.toLowerCase() : value;
    setFormData(prev => ({ ...prev, [name]: v }));
  };

  // Seleção de usinas
  const handlePlantChange = (plantId: string) => {
    setFormData(prev => {
      const current = prev.plantIds;
      const plantIds = current.includes(plantId)
        ? current.filter(id => id !== plantId)
        : [...current, plantId];
      return { ...prev, plantIds };
    });
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, username, phone, password, role: formRole } = formData;
    
    if (!name || !username || !phone || (!isEditing && !password) || !formRole) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (isEditing) {
      const dataToUpdate: Partial<User> = {
        ...initialData,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        plantIds: formData.plantIds,  // ← Certifique-se que está aqui
        supervisorId: formData.supervisorId,
      };
      
      if (formData.password && formData.password.trim() !== '') {
        (dataToUpdate as any).password = formData.password;
      }
      
      // ✅ ADICIONE ISTO:
      console.log('Enviando para backend:', dataToUpdate);
      
      updateUser(dataToUpdate as User);
    } else {
      addUser(formData);
    }
    
    onClose();
  };



  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stableTitleRef.current}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" form="user-form" className="btn-primary ml-3">Salvar</button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nome Completo">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={inputClasses}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Usuário">
            <input
            type="text"
            name="username"
            value={formData.username}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[a-z0-9._-]*$/i.test(val) && val.length <= 32) {
                setFormData(prev => ({ ...prev, username: val }));
              }
            }}
            maxLength={32}
            placeholder="ex: usuario.nome"
          />
          </FormField>
          <FormField label="Telefone">
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className={inputClasses}
            />
          </FormField>
        </div>

        <FormField label="E-mail (opcional)">
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            placeholder="ex.: nome@dominio.com (opcional)"
            className={inputClasses}
          />
        </FormField>

        <FormField label="Senha">
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required={!isEditing}
            placeholder={isEditing ? 'Deixe em branco para não alterar' : ''}
            className={inputClasses}
          />
        </FormField>

        <FormField label="Função">
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            required
            className={inputClasses}
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </FormField>

        {formData.role === Role.TECHNICIAN && (
          <FormField label="Supervisor Responsável">
            <select
              name="supervisorId"
              value={formData.supervisorId}
              onChange={handleChange}
              required
              className={inputClasses}
            >
              <option value="">Selecione um supervisor</option>
              {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </FormField>
        )}

        {(formData.role === Role.TECHNICIAN || formData.role === Role.SUPERVISOR) && (
          <FormField label="Usinas Associadas">
            <div className="grid grid-cols-2 gap-2 p-3 border dark:border-gray-600 rounded-md max-h-32 overflow-y-auto">
              {plants.map(plant => (
                <label key={plant.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.plantIds.includes(plant.id)}
                    onChange={() => handlePlantChange(plant.id)}
                    className="rounded"
                  />
                  <span>{plant.name}</span>
                </label>
              ))}
            </div>
          </FormField>
        )}
      </form>
    </Modal>
  );
};

export default React.memo(UserForm);