# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core import models
import base64
import os
import shutil
from pathlib import Path

# --- MODELO DE DADOS ---
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

# --- LÓGICA DE SALVAMENTO DE IMAGENS CORRIGIDA ---
def process_attachments(os_id: str, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    processed = []
    
    # 1. DETECTA ONDE O SERVIDOR ESTÁ RODANDO PARA EVITAR DUPLICAÇÃO DE CAMINHO
    current_working_dir = os.getcwd()
    
    # Se o terminal já está dentro da pasta 'attachments'
    if os.path.basename(current_working_dir) == "attachments":
        BASE_DIR = os.path.abspath("images")
    else:
        # Se está na raiz do projeto (LOOPOS)
        BASE_DIR = os.path.abspath("attachments/images")
        
    target_dir = os.path.join(BASE_DIR, os_id)
    
    # Cria a pasta da OS se não existir
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
            print(f"📂 [DEBUG] Pasta criada: {target_dir}")
        except Exception as e:
            print(f"❌ [ERRO] Falha ao criar pasta {target_dir}: {e}")

    for att in attachments:
        url = att.get("url", "")
        
        # Se for imagem nova (Base64)
        if url and url.startswith("data:image"):
            try:
                # Decodifica Base64
                header, encoded = url.split(",", 1)
                file_ext = header.split(";")[0].split("/")[1]
                
                # Trata nome do arquivo
                original_name = att.get("fileName") or f"img_{len(processed)}.{file_ext}"
                safe_name = "".join([c for c in original_name if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
                filename = safe_name or f"image_{len(processed)}.{file_ext}"
                
                file_path = os.path.join(target_dir, filename)
                
                # Salva no disco
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                # Atualiza URL para o caminho virtual (acessível pelo navegador)
                att["url"] = f"/attachments/images/{os_id}/{filename}"
                print(f"✅ [SUCESSO] Salvo em: {file_path}")
                
            except Exception as e:
                print(f"❌ [ERRO] Falha ao salvar arquivo: {e}")
        
        processed.append(att)
    return processed

# --- ROTAS ---

@router.get("", response_model=List[OSModel])
def list_os(db: Session = Depends(get_db)):
    return db.query(models.OS).all()

def _get_next_id(db: Session) -> str:
    last_os = db.query(models.OS).filter(models.OS.id.like("OS%")).order_by(models.OS.id.desc()).first()
    next_num = 1
    if last_os:
        try:
            next_num = int(last_os.id[2:]) + 1
        except: pass
    return f"OS{str(next_num).zfill(4)}"

@router.post("", response_model=OSModel)
def create_os(payload: OSModel, db: Session = Depends(get_db)):
    if not payload.id or db.query(models.OS).filter(models.OS.id == payload.id).first():
        payload.id = _get_next_id(db)
        if " - " not in payload.title:
             payload.title = f"{payload.id} - {payload.activity}"
    
    db_os = models.OS(**payload.dict())
    db.add(db_os)
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/batch", response_model=List[OSModel])
def create_os_batch(payloads: List[OSModel], db: Session = Depends(get_db)):
    last_os = db.query(models.OS).filter(models.OS.id.like("OS%")).order_by(models.OS.id.desc()).first()
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
    
    # 1. Processar Imagens (Salvar no disco físico correto)
    if payload.imageAttachments is not None:
        final_attachments = process_attachments(os_id, payload.imageAttachments)
        db_os.imageAttachments = final_attachments

    # 2. Atualizar outros campos
    update_data = payload.dict(exclude={'imageAttachments'}, exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_os, key, value)
    
    if db_os.isInReview and db_os.status != "Em Revisão":
         db_os.status = "Em Revisão"

    db.commit()
    db.refresh(db_os)
    return db_os

@router.delete("/batch")
def delete_os_batch(ids: List[str] = Body(...), db: Session = Depends(get_db)):
    db.query(models.OS).filter(models.OS.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": len(ids)}

@router.delete("/{os_id}")
def delete_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(404, "OS not found")
    
    # Limpeza de arquivos ao deletar (Tenta encontrar a pasta correta)
    try:
        current_working_dir = os.getcwd()
        if os.path.basename(current_working_dir) == "attachments":
            target_dir = os.path.abspath(f"images/{os_id}")
        else:
            target_dir = os.path.abspath(f"attachments/images/{os_id}")
            
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)
    except: pass

    db.delete(db_os)
    db.commit()
    return {"ok": True}