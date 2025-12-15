// File: src/types.ts
// Este arquivo centraliza todas as definições de tipos e interfaces TypeScript para garantir consistência e segurança de tipo em toda a aplicação.

// Definições globais de tipos

export enum Role {
  ADMIN = "Admin",
  COORDINATOR = "Coordenador",
  SUPERVISOR = "Supervisor",
  OPERATOR = "Operador",
  TECHNICIAN = "Técnico",
  ASSISTANT = "Auxiliar",
  CLIENT = "Cliente",
}

export enum OSStatus {
    PENDING = 'Pendente',
    IN_PROGRESS = 'Em Progresso',
    IN_REVIEW = 'Em Revisão',
    COMPLETED = 'Concluído',
}

export enum Priority {
    LOW = 'Baixa',
    MEDIUM = 'Média',
    HIGH = 'Alta',
    URGENT = 'Urgente',
}

export interface User {
    id: string;
    name: string;
    username: string;
    email?: string;
    phone: string;
    role: Role;
    can_login?: boolean;
    supervisorId?: string;
    password?: string;
    plantIds?: string[];
}

// ✅ ESTRUTURA DE SUBUSINAS
export interface SubPlant {
    id: string; // UUID ou ID simples (para compatibilidade com legado)
    name: string;
    inverterCount: number;
    trackersPerInverter: number;
    stringsPerInverter: number;
}

export interface Plant {
    id: string;
    client: string;
    name: string;
    assets: string[]; // Lista de ativos (ex: "Inversores", "Jardinagem")
    subPlants: SubPlant[]; // ✅ Lista de subusinas
    
    // Contagem total (calculada ou manual)
    stringCount: number;
    trackerCount: number;
    
    coordinatorId?: string | null;
    supervisorIds?: string[];
    technicianIds?: string[];
    assistantIds?: string[];
}

export interface OSLog {
    id: string;
    timestamp: string;
    authorId: string;
    comment: string;
}

export interface ImageAttachment {
    id: string;
    url: string;
    caption?: string;
    uploadedBy?: string;
    uploadedAt: string;
    fileName?: string;
}

export interface SubtaskItem {
    id: number;
    text: string;
    done: boolean;
    comment?: string;
}

// ✅ NOVA INTERFACE ADICIONADA PARA CORRIGIR O ERRO
// Representa uma sessão de trabalho em uma OS (Início -> Pausa/Fim)
export interface ExecutionSession {
    sessionId: string;
    userId: string;
    userName: string;
    startTime: string;
    endTime: string;
    durationSeconds: number;
    completedSubtasks: string[]; // Lista de textos das subtarefas feitas nesta sessão
}

export interface OS {
    id: string;
    title: string;
    description: string;
    status: OSStatus;
    priority: Priority;
    
    // ✅ LOCALIZAÇÃO PRECISA
    plantId: string;
    subPlantId?: string; // Opcional (pode ser na usina toda)
    inverterId?: string; // Opcional (pode ser num inversor específico)
    
    technicianId: string;
    supervisorId: string;
    startDate: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
    activity: string;
    assets: string[]; // Categorias (ex: "Inversores")
    
    logs: OSLog[];
    attachmentsEnabled: boolean;
    imageAttachments: ImageAttachment[];
    
    // Execução
    executionStart?: string;
    executionTimeSeconds?: number;
    currentExecutorId?: string | null; // Quem está travando a OS no momento
    executionHistory?: ExecutionSession[]; // ✅ Histórico detalhado de sessões
    isInReview?: boolean;
    subtasksStatus?: SubtaskItem[]; 
    maintenancePlanId?: string;

    // Metadados do Plano
    classification1?: string;
    classification2?: string;
    plannedDowntime?: number;
    estimatedDuration?: number;
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    timestamp: string;
}

export interface TaskTemplate {
    id: string;
    plan_code: string;
    asset_category: string;
    title: string;
    task_type: string;
    criticality: string;
    classification1?: string;
    classification2?: string;
    estimated_duration_minutes: number;
    frequency: string;
    frequency_days: number;
    subtasks: string[];
}

export interface PlantMaintenancePlan {
    id: string;
    plantId: string;
    asset_category: string;
    title: string;
    task_type: string;
    criticality: string;
    classification1?: string;
    classification2?: string;
    estimated_duration_minutes?: number; 
    frequency_days: number;
    subtasks: string[];
    active: boolean;
}

export type ViewType = 'KANBAN' | 'CALENDAR' | 'SCHEDULE_52_WEEKS' | 'MAINTENANCE_PLANS';