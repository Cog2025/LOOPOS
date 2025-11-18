// File: types.ts
// Este arquivo centraliza todas as definições de tipos e interfaces TypeScript para garantir consistência e segurança de tipo em toda a aplicação.

// Define os diferentes níveis de acesso (funções) dos usuários no sistema.
export enum Role {
  ADMIN = "Admin",
  COORDINATOR = "Coordenador",
  SUPERVISOR = "Supervisor",
  OPERATOR = "Operador",
  TECHNICIAN = "Técnico",
  ASSISTANT = "Auxiliar",
}

// Interface para a estrutura de um objeto de Usuário.
export interface User {
    id: string; // Identificador único.
    name: string; // Nome completo.
    username: string; // login sem e-mail
    email?: string; //Opcional
    phone: string; // Telefone de contato.
    role: Role; // Nível de acesso.
    can_login?: boolean;
    supervisorId?: string; // ID do supervisor responsável (apenas para técnicos).
    password?: string; // Senha (opcional para não ser exposta no frontend).
    plantIds?: string[]; // IDs das usinas às quais o usuário está associado.
}


// Define os possíveis status de uma Ordem de Serviço (OS), representando as colunas no painel Kanban.
export enum OSStatus {
    PENDING = 'Pendente',
    IN_PROGRESS = 'Em Progresso',
    IN_REVIEW = 'Em Revisão',
    COMPLETED = 'Concluído',
}

// Define os níveis de prioridade de uma OS.
export enum Priority {
    LOW = 'Baixa',
    MEDIUM = 'Média',
    HIGH = 'Alta',
    URGENT = 'Urgente',
}

// Interface para uma Sub-usina dentro de uma Usina.
export interface SubPlant {
    id: number; // Identificador numérico sequencial.
    inverterCount: number; // Quantidade de inversores nesta sub-usina.
}

// Interface para a estrutura de um objeto de Usina.
export interface Plant {
    id: string; // Identificador único.
    client: string; // Nome do cliente proprietário.
    name: string; // Nome da usina.
    subPlants: { id: number; inverterCount: number }[]; // Array de sub-usinas.
    stringCount: number; // Quantidade total de strings.
    trackerCount: number; // Quantidade total de trackers.
    assets: string[]; // Lista de nomes dos ativos presentes na usina.
    coordinatorId?: string | null;
    supervisorIds?: string[];
    technicianIds?: string[];
    assistantIds?: string[];
}

// Interface para um registro de log (histórico) de uma OS.
export interface OSLog {
    id: string; // Identificador único do log.
    timestamp: string; // Data e hora do registro.
    authorId: string; // ID do usuário que criou o registro.
    comment: string; // O comentário ou descrição da atividade.
    statusChange?: { from: OSStatus; to: OSStatus }; // Mudança de status, se houver.
}

// Interface para um anexo de imagem em uma OS.
export interface ImageAttachment {
    id: string; // Identificador único do anexo.
    url: string; // URL da imagem (neste caso, uma string Base64).
    caption?: string; // Legenda opcional para a imagem.
    uploadedBy: string; // ID do usuário que fez o upload.
    uploadedAt: string; // Data e hora do upload.
}

// Interface para a estrutura de um objeto de Ordem de Serviço (OS).
export interface OS {
    id:string; // Identificador único (ex: OS0001).
    title: string; // Título da OS (ex: OS0001 - Limpeza de Módulos).
    description: string; // Descrição detalhada do problema ou tarefa.
    status: OSStatus; // Status atual da OS.
    priority: Priority; // Nível de prioridade.
    plantId: string; // ID da usina onde o serviço será realizado.
    technicianId: string; // ID do técnico responsável.
    supervisorId: string; // ID do supervisor responsável.
    startDate: string; // Data de início planejada.
    endDate?: string; // Data de conclusão (opcional).
    createdAt: string; // Data e hora de criação.
    updatedAt: string; // Data e hora da última atualização.
    activity: string; // Atividade principal a ser executada.
    assets: string[]; // Lista de ativos afetados.
    logs: OSLog[]; // Histórico de atividades da OS.
    attachmentsEnabled: boolean; // Flag para indicar se o envio de anexos está permitido.
    imageAttachments: ImageAttachment[]; // Array de imagens anexadas.
}

// Interface para uma notificação destinada a um usuário.
export interface Notification {
    id: string; // Identificador único.
    userId: string; // ID do usuário que receberá a notificação.
    message: string; // Conteúdo da notificação.
    read: boolean; // Indica se a notificação já foi lida.
    timestamp: string; // Data e hora da criação.
}
