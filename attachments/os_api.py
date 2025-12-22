# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header
from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import models
from datetime import datetime, timezone
from uuid import uuid4
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
    assistantId: Optional[str] = None
    startDate: str
    endDate: Optional[str] = None
    activity: str
    
    assets: List[str] = []
    logs: List[Dict[str, Any]] = []
    imageAttachments: List[Dict[str, Any]] = []
    subtasksStatus: List[Dict[str, Any]] = [] 
    executionHistory: List[Dict[str, Any]] = []

    attachmentsEnabled: bool = True
    createdAt: str
    updatedAt: str
    
    executionStart: Optional[str] = None
    executionTimeSeconds: int = 0
    isInReview: bool = False
    
    currentExecutorId: Optional[str] = None

    subPlantId: Optional[str] = None
    inverterId: Optional[str] = None
    classification1: Optional[str] = None
    classification2: Optional[str] = None
    estimatedDuration: Optional[int] = 0
    plannedDowntime: Optional[int] = 0

    @field_validator('assets', 'logs', 'imageAttachments', 'subtasksStatus', 'executionHistory', mode='before')
    @classmethod
    def none_to_list(cls, v):
        return v or []

    class Config:
        from_attributes = True

router = APIRouter(tags=["os"])

# ✅ HELPER CORRIGIDO: Caminho absoluto simples
def get_images_dir(os_id: str):
    # Pega o diretório onde este arquivo (os_api.py) está.
    # Ex: C:\Users\...\LOOPOS\attachments
    BASE_DIR = Path(__file__).resolve().parent
    
    # Cria o caminho: ...\attachments\images\OS0001
    target = BASE_DIR / "images" / os_id
    return str(target)

# --- LÓGICA DE SALVAMENTO ---
def process_attachments(os_id: str, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    processed = []
    target_dir = get_images_dir(os_id)
    
    if not os.path.exists(target_dir):
        try:
            os.makedirs(target_dir, exist_ok=True)
        except Exception as e:
            print(f"❌ [ERRO] Falha ao criar pasta {target_dir}: {e}")

    for att in attachments:
        url = att.get("url", "")
        # Se for imagem nova (Base64)
        if url and url.startswith("data:image"):
            try:
                header, encoded = url.split(",", 1)
                file_ext = header.split(";")[0].split("/")[1]
                
                original_name = att.get("fileName") or f"img_{len(processed)}.{file_ext}"
                # Limpa nome do arquivo
                safe_name = "".join([c for c in original_name if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
                filename = safe_name or f"image_{len(processed)}.{file_ext}"
                
                file_path = os.path.join(target_dir, filename)
                
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                # ✅ URL Relativa correta para o frontend
                att["url"] = f"/attachments/images/{os_id}/{filename}"
                print(f"✅ [UPLOAD] Salvo em: {file_path}")
                
            except Exception as e:
                print(f"❌ [ERRO] Falha ao salvar arquivo: {e}")
        
        processed.append(att)
    return processed

def cleanup_deleted_files(os_id: str, old_attachments: List[Dict], new_attachments: List[Dict]):
    try:
        target_dir = get_images_dir(os_id)
        if not os.path.exists(target_dir):
            return

        kept_files = set()
        for att in new_attachments:
            url = att.get("url", "")
            if f"/attachments/images/{os_id}/" in url:
                filename = url.split('/')[-1]
                kept_files.add(filename)

        if os.path.exists(target_dir):
            physical_files = os.listdir(target_dir)
            for filename in physical_files:
                if filename not in kept_files:
                    file_path = os.path.join(target_dir, filename)
                    try:
                        os.remove(file_path)
                    except: pass
    except: pass

# --- PERMISSÕES ---
def verify_creation_permission(user: models.User, plant_id: str):
    ALLOWED_ROLES = ["Admin", "Operador", "Supervisor", "Coordenador"]
    if user.role not in ALLOWED_ROLES:
        raise HTTPException(403, f"Acesso Negado: Perfil '{user.role}' não pode criar OS.")
    return True

# --- ROTAS EXPLÍCITAS /api/os ---

@router.get("/api/os", response_model=List[OSModel])
def list_os(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    query = db.query(models.OS)
    if x_user_id:
        user = db.query(models.User).filter(models.User.id == x_user_id).first()
        if user and user.role not in ["Admin", "Operador"]:
            user_plant_ids = user.plantIds or []
            if not user_plant_ids: return []
            query = query.filter(models.OS.plantId.in_(user_plant_ids))
    return query.all()

@router.get("/api/os/{os_id}", response_model=OSModel)
def get_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS não encontrada")
    return db_os

def _get_next_id(db: Session) -> str:
    last_os = db.query(models.OS).filter(models.OS.id.like("OS%")).order_by(models.OS.id.desc()).first()
    next_num = 1
    if last_os:
        try: next_num = int(last_os.id[2:]) + 1
        except: pass
    return f"OS{str(next_num).zfill(4)}"

@router.post("/api/os", response_model=OSModel)
def create_os(payload: OSModel, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not x_user_id: raise HTTPException(401, "Usuário não identificado.")
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user: raise HTTPException(401, "Usuário não encontrado.")

    verify_creation_permission(user, payload.plantId)

    if not payload.id or db.query(models.OS).filter(models.OS.id == payload.id).first():
        payload.id = _get_next_id(db)
        if " - " not in payload.title:
             payload.title = f"{payload.id} - {payload.activity}"
    
    db_os = models.OS(**payload.dict())
    db.add(db_os)
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/api/os/batch", response_model=List[OSModel])
def create_os_batch(payloads: List[OSModel], x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not x_user_id: raise HTTPException(401, "Usuário não identificado")
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    
    created = []
    next_num = 1 
    last_os = db.query(models.OS).filter(models.OS.id.like("OS%")).order_by(models.OS.id.desc()).first()
    if last_os:
        try: next_num = int(last_os.id[2:]) + 1
        except: pass

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

@router.post("/api/os/{os_id}/start")
def start_execution(os_id: str, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS não encontrada")
    
    if db_os.currentExecutorId and db_os.currentExecutorId != x_user_id:
        raise HTTPException(409, detail=f"Bloqueado: Esta OS está sendo executada por outro usuário.")

    now = datetime.now(timezone.utc).isoformat()
    db_os.currentExecutorId = x_user_id
    db_os.executionStart = now
    db_os.status = "Em Progresso"
    
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/api/os/{os_id}/pause")
def pause_execution(
    os_id: str, 
    payload: dict = Body(...), 
    x_user_id: str = Header(...), 
    db: Session = Depends(get_db)
):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS não encontrada")
    
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    
    client_end = payload.get("clientEndTime")
    now_dt = datetime.fromisoformat(client_end.replace('Z', '+00:00')) if client_end else datetime.now(timezone.utc)
    
    start_iso = db_os.executionStart
    if not start_iso: start_iso = payload.get("clientStartTime")
    
    duration = 0
    if payload.get("durationSeconds") is not None:
        duration = int(payload.get("durationSeconds"))
    elif start_iso:
        try:
            start_dt = datetime.fromisoformat(start_iso.replace('Z', '+00:00'))
            duration = int((now_dt - start_dt).total_seconds())
        except: duration = 0
    
    new_subtasks = payload.get("subtasksStatus", [])
    
    session_log = {
        "sessionId": str(uuid4()),
        "userId": x_user_id,
        "userName": user.name if user else "Desconhecido",
        "startTime": start_iso or now_dt.isoformat(),
        "endTime": now_dt.isoformat(),
        "durationSeconds": duration,
        "completedSubtasks": [], 
        "syncedFromOffline": bool(client_end)
    }
    
    current_history = list(db_os.executionHistory or [])
    current_history.append(session_log)
    db_os.executionHistory = current_history
    
    db_os.executionTimeSeconds = (db_os.executionTimeSeconds or 0) + duration
    db_os.subtasksStatus = new_subtasks
    db_os.currentExecutorId = None
    db_os.executionStart = None
    db_os.updatedAt = now_dt.isoformat()

    if payload.get("finished"):
        db_os.status = "Em Revisão"
        db_os.endDate = now_dt.isoformat()
    
    db.commit()
    db.refresh(db_os)
    return db_os

@router.put("/api/os/{os_id}", response_model=OSModel)
def update_os(os_id: str, payload: OSModel, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS not found")
    
    if payload.imageAttachments is not None:
        old_attachments = db_os.imageAttachments or []
        final_attachments = process_attachments(os_id, payload.imageAttachments)
        cleanup_deleted_files(os_id, old_attachments, final_attachments)
        db_os.imageAttachments = final_attachments

    update_data = payload.dict(exclude={'imageAttachments'}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_os, key, value)
    
    if db_os.isInReview and db_os.status != "Em Revisão":
         db_os.status = "Em Revisão"

    db.commit()
    db.refresh(db_os)
    return db_os

@router.delete("/api/os/batch")
def delete_os_batch(ids: List[str] = Body(...), db: Session = Depends(get_db)):
    db.query(models.OS).filter(models.OS.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": len(ids)}

@router.delete("/api/os/{os_id}")
def delete_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS not found")
    try:
        target_dir = get_images_dir(os_id)
        if os.path.exists(target_dir): shutil.rmtree(target_dir)
    except: pass
    db.delete(db_os)
    db.commit()
    return {"ok": True}