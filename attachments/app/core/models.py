# /attachments/app/core/models.py
from sqlalchemy import Column, String, Boolean, Integer, Text, JSON, ForeignKey
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
    
    # Guardamos a lista de IDs como JSON
    plantIds = Column(JSON, default=list) 

class Plant(Base):
    __tablename__ = "plants"

    id = Column(String, primary_key=True, index=True)
    client = Column(String)
    name = Column(String)
    stringCount = Column(Integer, default=0)
    trackerCount = Column(Integer, default=0)
    
    # Estruturas complexas ficam como JSON
    subPlants = Column(JSON, default=list)
    assets = Column(JSON, default=list)

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
    startDate = Column(String) # ISO Format string
    activity = Column(String)
    attachmentsEnabled = Column(Boolean, default=True)
    createdAt = Column(String)
    updatedAt = Column(String)
    
    # Listas
    assets = Column(JSON, default=list)
    logs = Column(JSON, default=list)
    imageAttachments = Column(JSON, default=list)

# ✅ NOVA TABELA DE NOTIFICAÇÕES
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    userId = Column(String, index=True)
    message = Column(String)
    read = Column(Boolean, default=False)
    timestamp = Column(String)