# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc # ✅ Import essencial para a otimização
from app.core.database import get_db
from app.core import models

class OSModel(BaseModel):
    id: str
    title: str
    description: str
    status: str
    priority: str
    plantId: str
    technicianId: Optional[str] = None
    supervisorId: Optional[str] = None
    startDate: str
    endDate: Optional[str] = None
    activity: str
    assets: List[str] = []
    attachmentsEnabled: bool = True
    createdAt: str
    updatedAt: str
    logs: List[Dict[str, Any]] = []
    imageAttachments: List[Dict[str, Any]] = []
    
    # Novos campos de execução e planejamento
    executionStart: Optional[str] = None
    executionTimeSeconds: int = 0
    isInReview: bool = False
    subtasksStatus: List[Dict[str, Any]] = [] 
    
    subPlantId: Optional[str] = None
    inverterId: Optional[str] = None
    classification1: Optional[str] = None
    classification2: Optional[str] = None
    estimatedDuration: Optional[int] = 0
    plannedDowntime: Optional[int] = 0

    class Config:
        from_attributes = True

router = APIRouter(prefix="/api/os", tags=["os"])

# --- Rotas SQL ---

@router.get("", response_model=List[OSModel])
def list_os(db: Session = Depends(get_db)):
    return db.query(models.OS).all()

# ✅ FUNÇÃO OTIMIZADA PARA GERAR ID
def _get_next_id(db: Session) -> str:
    # Busca apenas o último registro que começa com "OS", ordenado de forma decrescente.
    # Isso evita carregar milhares de linhas na memória.
    last_os = db.query(models.OS)\
        .filter(models.OS.id.like("OS%"))\
        .order_by(models.OS.id.desc())\
        .first()
    
    next_num = 1
    if last_os:
        try:
            # Extrai o número do ID (OS0045 -> 45)
            next_num = int(last_os.id[2:]) + 1
        except ValueError:
            # Fallback seguro caso haja IDs manuais fora do padrão
            pass 

    return f"OS{str(next_num).zfill(4)}"

@router.post("", response_model=OSModel)
def create_os(payload: OSModel, db: Session = Depends(get_db)):
    # Se ID não informado ou já existe, gera novo
    if not payload.id or db.query(models.OS).filter(models.OS.id == payload.id).first():
        payload.id = _get_next_id(db)
        # Atualiza título padrão
        if " - " not in payload.title:
             payload.title = f"{payload.id} - {payload.activity}"
    
    db_os = models.OS(**payload.dict())
    db.add(db_os)
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/batch", response_model=List[OSModel])
def create_os_batch(payloads: List[OSModel], db: Session = Depends(get_db)):
    # Otimização para lote: Pega o último ID do banco UMA VEZ e incrementa localmente
    last_os = db.query(models.OS)\
        .filter(models.OS.id.like("OS%"))\
        .order_by(models.OS.id.desc())\
        .first()
        
    next_num = 1
    if last_os:
        try:
            next_num = int(last_os.id[2:]) + 1
        except: pass
            
    created = []
    
    for p in payloads:
        new_id = f"OS{str(next_num).zfill(4)}"
        next_num += 1
        
        p.id = new_id
        p.title = f"{new_id} - {p.activity}"
        
        db_os = models.OS(**p.dict())
        db.add(db_os)
        created.append(db_os)
        
    db.commit()
    for c in created: db.refresh(c)
    return created

@router.put("/{os_id}", response_model=OSModel)
def update_os(os_id: str, payload: OSModel, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(404, "OS not found")
    
    # Protege imagens de serem apagadas se não enviadas no payload
    update_data = payload.dict(exclude={'imageAttachments'})
    
    for key, value in update_data.items():
        setattr(db_os, key, value)
    
    # Status automático para revisão
    if db_os.isInReview and db_os.status != "Em Revisão":
         db_os.status = "Em Revisão"

    db.commit()
    db.refresh(db_os)
    return db_os

@router.delete("/batch")
def delete_os_batch(ids: List[str] = Body(...), db: Session = Depends(get_db)):
    # Delete em massa eficiente
    db.query(models.OS).filter(models.OS.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": len(ids)}

@router.delete("/{os_id}")
def delete_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(404, "OS not found")
    db.delete(db_os)
    db.commit()
    return {"ok": True}