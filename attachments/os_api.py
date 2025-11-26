# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
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
    activity: str
    assets: List[str] = []
    attachmentsEnabled: bool = True
    createdAt: str
    updatedAt: str
    logs: List[Dict[str, Any]] = []
    imageAttachments: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

router = APIRouter(prefix="/api/os", tags=["os"])

# --- Rotas SQL ---

@router.get("", response_model=List[OSModel])
def list_os(db: Session = Depends(get_db)):
    return db.query(models.OS).all()

@router.post("", response_model=OSModel)
def create_os(payload: OSModel, db: Session = Depends(get_db)):
    if db.query(models.OS).filter(models.OS.id == payload.id).first():
        raise HTTPException(400, "OS id already exists")
    
    db_os = models.OS(**payload.dict())
    
    db.add(db_os)
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/batch", response_model=List[OSModel])
def create_os_batch(payloads: List[OSModel], db: Session = Depends(get_db)):
    # Busca todos para calcular IDs (ou faz query inteligente)
    all_os = db.query(models.OS).all()
    max_num = 0
    for o in all_os:
        if o.id.startswith("OS"):
            try:
                num = int(o.id[2:])
                if num > max_num: max_num = num
            except: pass
            
    next_num = max_num + 1
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
    
    # 🔴 CORREÇÃO CRÍTICA:
    # Excluímos 'imageAttachments' da atualização. 
    # Assim, o botão "Salvar" não apaga as imagens que foram enviadas via Upload.
    update_data = payload.dict(exclude={'imageAttachments'})
    
    for key, value in update_data.items():
        setattr(db_os, key, value)
    
    db.commit()
    db.refresh(db_os)
    return db_os

# ✅ NOVA ROTA: Exclusão em Massa
@router.delete("/batch")
def delete_os_batch(ids: List[str] = Body(...), db: Session = Depends(get_db)):
    # Deleta todas as OSs cujos IDs estão na lista
    db.query(models.OS).filter(models.OS.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": len(ids)}


# Rota individual (mantida para compatibilidade)
@router.delete("/{os_id}")
def delete_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(404, "OS not found")
    db.delete(db_os)
    db.commit()
    return {"ok": True}