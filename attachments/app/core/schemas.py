# /attachments/app/core/schemas.py
# Esquemas Pydantic para requests/responses da API.

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


class UserCreate(UserBase):
    password: Optional[str] = None


class UserUpdate(BaseModel):  # ✅ NÃO herda de UserBase, define seus próprios campos
    name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[RoleLiteral] = None
    can_login: Optional[bool] = None
    supervisorId: Optional[str] = None
    password: Optional[str] = None
    plantIds: Optional[List[str]] = None  # ✅ ADICIONE ISTO


class UserOut(UserBase):
    id: str
    plantIds: List[str] = []  # preenchido a partir das atribuições por usina


# -------------------- PLANTS --------------------
class SubPlant(BaseModel):
    id: int
    inverterCount: int = 0


class PlantBase(BaseModel):
    client: str
    name: str
    stringCount: int = 0
    trackerCount: int = 0
    subPlants: List[SubPlant] = Field(default_factory=list)
    assets: List[str] = Field(default_factory=list)


class PlantCreate(PlantBase):
    pass


class PlantUpdate(PlantBase):
    pass


class PlantOut(PlantBase):
    id: str


# -------------------- ASSIGNMENTS --------------------
class AssignmentsPayload(BaseModel):
    coordinatorId: Optional[str] = None
    supervisorIds: List[str] = Field(default_factory=list)
    technicianIds: List[str] = Field(default_factory=list)
    assistantIds: List[str] = Field(default_factory=list)