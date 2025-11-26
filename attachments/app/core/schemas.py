# /attachments/app/core/schemas.py
from typing import List, Optional, Literal
from pydantic import BaseModel, Field

# -------------------- USERS --------------------
RoleLiteral = Literal["Admin","Coordenador","Supervisor","Operador","Técnico","Auxiliar"]

class UserBase(BaseModel):
    name: str
    username: str = Field(
        min_length=3, max_length=32,
        pattern=r"^[a-z0-9._-]+$",
        description="login sem espaços, ex: Fabio"
    )
    email: Optional[str] = None
    phone: Optional[str] = None
    role: RoleLiteral
    can_login: bool = True
    supervisorId: Optional[str] = None
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

class UserCreate(UserBase):
    password: Optional[str] = None
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[RoleLiteral] = None
    can_login: Optional[bool] = None
    supervisorId: Optional[str] = None
    password: Optional[str] = None
    plantIds: Optional[List[str]] = None
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

class UserOut(UserBase):
    id: str
    # Senha removida por segurança (Use /api/login para autenticar)
    # password: Optional[str] = None 
    plantIds: List[str] = []
    class Config:
        from_attributes = True  # Permite ler do objeto SQL


# -------------------- PLANTS --------------------
class SubPlant(BaseModel):
    id: int
    inverterCount: int = 0
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

class PlantBase(BaseModel):
    client: str
    name: str
    stringCount: int = 0
    trackerCount: int = 0
    subPlants: List[SubPlant] = Field(default_factory=list)
    assets: List[str] = Field(default_factory=list)
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

# MIXIN DE ASSIGNMENTS PARA REUTILIZAR
class AssignmentsMixin(BaseModel):
    coordinatorId: Optional[str] = ""
    supervisorIds: List[str] = Field(default_factory=list)
    technicianIds: List[str] = Field(default_factory=list)
    assistantIds: List[str] = Field(default_factory=list)
    class Config:
        from_attributes = True  # Permite ler do objeto SQL

# -------------------- NOTIFICATIONS --------------------
class NotificationBase(BaseModel):
    userId: str
    message: str
    read: bool = False
    timestamp: str

class NotificationCreate(NotificationBase):
    pass

class NotificationOut(NotificationBase):
    id: str
    class Config:
        from_attributes = True

# AGORA SIM: Create e Update aceitam assignments!
class PlantCreate(PlantBase, AssignmentsMixin):
    pass

class PlantUpdate(PlantBase, AssignmentsMixin):
    pass

class PlantOut(PlantBase, AssignmentsMixin):
    id: str


# -------------------- ASSIGNMENTS PAYLOAD (Mantido para compatibilidade) --------------------
class AssignmentsPayload(AssignmentsMixin):
    pass


