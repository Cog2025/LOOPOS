# attachments/app/core/schemas.py
from pydantic import BaseModel
from typing import List, Optional, Union, Any

# --- Subusinas (Versão Tolerante - Aceita ID int ou string) ---
class SubPlant(BaseModel):
    id: Any # ✅ MUDANÇA: Aceita qualquer coisa (int do legado ou str novo)
    name: Optional[str] = "Subusina Padrão"
    inverterCount: int = 0
    trackersPerInverter: int = 0
    stringsPerInverter: int = 0

# --- Payload de Atribuições ---
class AssignmentsPayload(BaseModel):
    coordinatorId: Optional[str] = ""
    supervisorIds: List[str] = []
    technicianIds: List[str] = []
    assistantIds: List[str] = []

# --- Plantas ---
class PlantBase(BaseModel):
    name: str
    client: str
    stringCount: int = 0
    trackerCount: int = 0
    assets: List[str] = []
    subPlants: List[SubPlant] = [] 

class PlantCreate(PlantBase, AssignmentsPayload):
    pass

class PlantUpdate(PlantBase, AssignmentsPayload):
    pass

class PlantOut(PlantBase, AssignmentsPayload):
    id: str
    class Config:
        from_attributes = True

# --- Usuários ---
class UserBase(BaseModel):
    name: str
    username: str
    role: str
    email: Optional[str] = None
    phone: Optional[str] = None
    supervisorId: Optional[str] = None
    can_login: bool = True
    plantIds: List[str] = []

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    id: str
    class Config:
        from_attributes = True

# --- OS e Outros ---
class OSLog(BaseModel):
    id: str
    timestamp: str
    authorId: str
    comment: str

class ImageAttachment(BaseModel):
    id: str
    url: str
    caption: Optional[str] = None
    fileName: Optional[str] = None
    uploadedBy: Optional[str] = None
    uploadedAt: Optional[str] = None

class SubtaskItem(BaseModel):
    id: int
    text: str
    done: bool
    comment: Optional[str] = None


# Adicione esta classe para o histórico
class ExecutionSession(BaseModel):
    sessionId: str
    userId: str
    userName: str
    startTime: str
    endTime: str
    durationSeconds: int
    completedSubtasks: List[str] # Texto das subtarefas concluídas na sessão

class OSBase(BaseModel):
    title: str
    description: str
    status: str
    priority: str
    plantId: str
    subPlantId: Optional[str] = None
    inverterId: Optional[str] = None
    technicianId: Optional[str] = None
    supervisorId: Optional[str] = None
    startDate: str
    endDate: Optional[str] = None
    activity: str
    assets: List[str] = []
    logs: List[OSLog] = []
    imageAttachments: List[ImageAttachment] = []
    subtasksStatus: List[SubtaskItem] = []
    
    classification1: Optional[str] = None
    classification2: Optional[str] = None
    estimatedDuration: Optional[int] = 0
    plannedDowntime: Optional[int] = 0
    
    executionStart: Optional[str] = None
    executionTimeSeconds: Optional[int] = 0
    isInReview: bool = False

    # ✅ NOVOS CAMPOS NO SCHEMA
    currentExecutorId: Optional[str] = None
    executionHistory: List[ExecutionSession] = [] # ou List[Dict] para ser mais flexível

class OSCreate(OSBase):
    id: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class OSUpdate(OSBase):
    updatedAt: Optional[str] = None

# ✅ MUDANÇA CRÍTICA: 'Any' desabilita a validação estrita de tipo
class OSOut(OSBase):
    id: str
    createdAt: Any = None 
    updatedAt: Any = None
    
    class Config:
        from_attributes = True

# --- Notificações ---
class NotificationCreate(BaseModel):
    id: str
    userId: str
    message: str
    read: bool = False
    timestamp: str

class NotificationOut(NotificationCreate):
    #id: str
    class Config:
        from_attributes = True

# --- Manutenção ---
class TaskTemplateCreate(BaseModel):
    plan_code: Optional[str] = None
    asset_category: str
    title: str
    task_type: str
    criticality: str
    classification1: Optional[str] = None
    classification2: Optional[str] = None
    estimated_duration_minutes: int = 0
    frequency: str = "Dias"
    frequency_days: int
    subtasks: List[str] = []

class TaskTemplateOut(TaskTemplateCreate):
    id: str
    class Config:
        from_attributes = True