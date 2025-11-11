// types.ts

export enum Role {
    ADMIN = 'Admin',
    OPERATOR = 'Operador',
    SUPERVISOR = 'Supervisor',
    TECHNICIAN = 'Técnico',
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
    email: string;
    phone: string;
    role: Role;
    password?: string;
    plantIds?: string[];
    supervisorId?: string;
}

export interface SubPlant {
    id: number;
    inverterCount: number;
}

export interface Plant {
    id: string;
    client: string;
    name: string;
    subPlants: SubPlant[];
    stringCount: number;
    trackerCount: number;
    assets: string[];
}

export interface OSLog {
    id: string;
    timestamp: string;
    authorId: string;
    comment: string;
    statusChange?: { from: OSStatus; to: OSStatus };
}

export interface ImageAttachment {
    id: string;
    url: string; // Base64 Data URL
    caption?: string;
    uploadedBy: string; // User ID
    uploadedAt: string;
}

export interface OS {
    id: string;
    title: string;
    description: string;
    status: OSStatus;
    priority: Priority;
    plantId: string;
    technicianId: string;
    supervisorId: string;
    startDate: string;
    endDate?: string;
    createdAt: string;
    updatedAt: string;
    activity: string;
    assets: string[];
    logs: OSLog[];
    attachmentsEnabled: boolean; // <-- NOVO
    imageAttachments: ImageAttachment[]; // <-- NOVO
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    read: boolean;
    timestamp: string;
}
