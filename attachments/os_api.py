# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header
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

# Helper para pegar o diretório correto das imagens
def get_images_dir(os_id: str):
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(CURRENT_DIR, "images", os_id)

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
                safe_name = "".join([c for c in original_name if c.isalnum() or c in (' ', '.', '_', '-')]).strip()
                filename = safe_name or f"image_{len(processed)}.{file_ext}"
                
                file_path = os.path.join(target_dir, filename)
                
                with open(file_path, "wb") as f:
                    f.write(base64.b64decode(encoded))
                
                att["url"] = f"/attachments/images/{os_id}/{filename}"
                print(f"✅ [UPLOAD] Salvo em: {file_path}")
                
            except Exception as e:
                print(f"❌ [ERRO] Falha ao salvar arquivo: {e}")
        
        processed.append(att)
    return processed

# ✅ NOVA FUNÇÃO: DELETAR ARQUIVOS REMOVIDOS
def cleanup_deleted_files(os_id: str, old_attachments: List[Dict], new_attachments: List[Dict]):
    try:
        target_dir = get_images_dir(os_id)
        if not os.path.exists(target_dir):
            return

        # Cria lista dos nomes de arquivos que DEVEM ficar
        # Extrai o nome do arquivo da URL (ex: /attachments/images/OS003/foto.jpg -> foto.jpg)
        kept_files = set()
        for att in new_attachments:
            url = att.get("url", "")
            if f"/attachments/images/{os_id}/" in url:
                filename = url.split('/')[-1]
                kept_files.add(filename)

        # Verifica arquivos físicos na pasta
        physical_files = os.listdir(target_dir)
        
        for filename in physical_files:
            if filename not in kept_files:
                file_path = os.path.join(target_dir, filename)
                try:
                    os.remove(file_path)
                    print(f"🗑️ [CLEANUP] Arquivo deletado: {filename}")
                except Exception as e:
                    print(f"⚠️ Erro ao deletar {filename}: {e}")

    except Exception as e:
        print(f"❌ Erro na limpeza de arquivos: {e}")

# --- ROTAS ---

@router.get("", response_model=List[OSModel])
def list_os(x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Lista OSs.
    CORREÇÃO DE SEGURANÇA: Se x_user_id for fornecido, aplica filtro de visibilidade:
    - Admin/Operador: Vê tudo.
    - Outros (Clientes, Técnicos): Vê apenas OSs de usinas vinculadas (plantIds).
    """
    query = db.query(models.OS)
    
    if x_user_id:
        user = db.query(models.User).filter(models.User.id == x_user_id).first()
        if user:
            # Se for Admin ou Operador, vê tudo.
            if user.role not in ["Admin", "Operador"]:
                # Filtra OSs cujas plantId estejam na lista de plantIds do usuário
                user_plant_ids = user.plantIds or []
                
                if not user_plant_ids:
                    return [] # Se não tem usina vinculada, não vê nada
                
                # Aplica o filtro IN
                query = query.filter(models.OS.plantId.in_(user_plant_ids))
    
    return query.all()

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
    
    # 1. Processar Imagens (Salvar Novas)
    if payload.imageAttachments is not None:
        old_attachments = db_os.imageAttachments or []
        final_attachments = process_attachments(os_id, payload.imageAttachments)
        cleanup_deleted_files(os_id, old_attachments, final_attachments)
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
    
    try:
        target_dir = get_images_dir(os_id)
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir)
            print(f"🗑️ [DELETADO] Pasta da OS: {target_dir}")
    except: pass

    db.delete(db_os)
    db.commit()
    return {"ok": True}