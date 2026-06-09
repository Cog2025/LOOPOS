# attachments/app/core/models.py
from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, ForeignKey, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True)
    cnpj = Column(String, nullable=True)
    status = Column(String, default="Ativo")
    modulos_ativos = Column(JSON, default=list)
    created_at = Column(DateTime, default=func.now())

from sqlalchemy import UniqueConstraint

class RolePermission(Base):
    __tablename__ = "role_permissions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    role_name = Column(String, index=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    permissions = Column(JSON, default=list)
    
    __table_args__ = (UniqueConstraint('role_name', 'company_id', name='uq_role_company'),)

class AuditoriaLog(Base):
    __tablename__ = "auditoria_logs"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    empresa_id = Column(String, index=True, nullable=True)
    tabela = Column(String, index=True)
    registro_id = Column(String, index=True)
    acao = Column(String)
    dados_antigos = Column(JSON, nullable=True)
    dados_novos = Column(JSON, nullable=True)
    usuario_id = Column(String, nullable=True)
    usuario_nome = Column(String, nullable=True)
    data_hora = Column(DateTime(timezone=True), default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    username = Column(String, unique=True, index=True)
    email = Column(String, nullable=True)
    phone = Column(String)
    password = Column(String)
    role = Column(String)
    can_login = Column(Boolean, default=True)
    supervisorId = Column(String, nullable=True)
    assistantId = Column(String, nullable=True)
    plantIds = Column(JSON, default=list) 
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    is_superadmin = Column(Boolean, default=False)
    permissions = Column(JSON, default=list)

class Plant(Base):
    __tablename__ = "plants"
    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    client = Column(String)
    name = Column(String)
    stringCount = Column(Integer, default=0)
    trackerCount = Column(Integer, default=0)
    subPlants = Column(JSON, default=list)
    assets = Column(JSON, default=list)
    coordinatorId = Column(String, nullable=True)

class TaskTemplate(Base):
    __tablename__ = "task_templates"
    id = Column(String, primary_key=True, index=True)
    plan_code = Column(String)
    asset_category = Column(String)
    title = Column(String)
    task_type = Column(String)
    criticality = Column(String)
    classification1 = Column(String, nullable=True)
    classification2 = Column(String, nullable=True)
    estimated_duration_minutes = Column(Integer, default=0)
    planned_downtime_minutes = Column(Integer, default=0) # ✅ NOVO CAMPO
    frequency = Column(String)
    frequency_days = Column(Integer, nullable=True)
    subtasks = Column(JSON, default=list) 

class PlantMaintenancePlan(Base):
    __tablename__ = "plant_maintenance_plans"
    id = Column(String, primary_key=True, index=True)
    plantId = Column(String, index=True)
    asset_category = Column(String)
    title = Column(String)
    task_type = Column(String)
    criticality = Column(String)
    classification1 = Column(String)
    classification2 = Column(String)
    estimated_duration_minutes = Column(Integer, default=0) 
    planned_downtime_minutes = Column(Integer, default=0) # ✅ NOVO CAMPO
    frequency_days = Column(Integer)
    subtasks = Column(JSON, default=list)
    active = Column(Boolean, default=True)

class OS(Base):
    __tablename__ = "os"
    id = Column(String, primary_key=True, index=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=True)
    title = Column(String)
    description = Column(Text)
    status = Column(String)
    priority = Column(String)
    plantId = Column(String)
    technicianId = Column(String, nullable=True)
    supervisorId = Column(String, nullable=True)
    assistantId = Column(String, nullable=True)
    startDate = Column(String) 
    endDate = Column(String, nullable=True)
    activity = Column(String)
    attachmentsEnabled = Column(Boolean, default=True)
    createdAt = Column(String)
    updatedAt = Column(String)
    assets = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    imageAttachments = Column(JSON, default=list)
    
    # Execução
    executionStart = Column(String, nullable=True)
    executionTimeSeconds = Column(Integer, default=0)
    isInReview = Column(Boolean, default=False)
    maintenancePlanId = Column(String, nullable=True)
    subtasksStatus = Column(JSON, default=list)

    # Detalhes
    subPlantId = Column(String, nullable=True)
    inverterId = Column(String, nullable=True)
    classification1 = Column(String, nullable=True)
    classification2 = Column(String, nullable=True)
    estimatedDuration = Column(Integer, default=0)
    plannedDowntime = Column(Integer, default=0)

    # ✅ NOVOS CAMPOS PARA TRAVA E HISTÓRICO
    currentExecutorId = Column(String, nullable=True) # Quem está executando AGORA (Lock)
    executionHistory = Column(JSON, default=list)     # Lista de sessões de execução
    
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    userId = Column(String, index=True)
    message = Column(String)
    read = Column(Boolean, default=False)
    timestamp = Column(String)

class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String, index=True)
    slug = Column(String, index=True)
    allowed = Column(Boolean, default=False)