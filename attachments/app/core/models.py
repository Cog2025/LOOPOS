# attachments/app/core/models.py
from sqlalchemy import Column, String, Integer, Boolean, Text, JSON, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.core.database import Base

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
    plantIds = Column(JSON, default=list) 

class Plant(Base):
    __tablename__ = "plants"
    id = Column(String, primary_key=True, index=True)
    client = Column(String)
    name = Column(String)
    stringCount = Column(Integer, default=0)
    trackerCount = Column(Integer, default=0)
    subPlants = Column(JSON, default=list) # ✅ Já estava correto
    assets = Column(JSON, default=list)    # ✅ Já estava correto
    # Campos de atribuição (opcional se quiser salvar no objeto da planta também, mas seu sistema usa User)
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
    frequency_days = Column(Integer)
    subtasks = Column(JSON, default=list)
    active = Column(Boolean, default=True)

class OS(Base):
    __tablename__ = "os"
    id = Column(String, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    status = Column(String)
    priority = Column(String)
    plantId = Column(String)
    technicianId = Column(String, nullable=True)
    supervisorId = Column(String, nullable=True)
    startDate = Column(String) 
    endDate = Column(String, nullable=True)
    activity = Column(String)
    attachmentsEnabled = Column(Boolean, default=True)
    createdAt = Column(String)
    updatedAt = Column(String)
    assets = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    imageAttachments = Column(JSON, default=list)
    executionStart = Column(String, nullable=True)
    executionTimeSeconds = Column(Integer, default=0)
    isInReview = Column(Boolean, default=False)
    maintenancePlanId = Column(String, nullable=True)
    subtasksStatus = Column(JSON, default=list)

    # ✅ NOVOS CAMPOS OBRIGATÓRIOS (Adicione estes):
    subPlantId = Column(String, nullable=True)
    inverterId = Column(String, nullable=True)
    classification1 = Column(String, nullable=True)
    classification2 = Column(String, nullable=True)
    estimatedDuration = Column(Integer, default=0)
    plannedDowntime = Column(Integer, default=0)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    userId = Column(String, index=True)
    message = Column(String)
    read = Column(Boolean, default=False)
    timestamp = Column(String)