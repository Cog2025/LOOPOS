# File: attachments/os_api.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import models
from app.core.auth_middleware import get_current_user, verificar_permissao
from datetime import datetime, timezone
from uuid import uuid4
import base64
import os
import shutil
import re
import logging
from pathlib import Path

# --- CONFIGURAÇÃO DE DIRETÓRIOS ---
# Usa os.getcwd() para garantir que pegamos a pasta onde o script 'run.py' foi executado
BASE_DIR = Path(os.getcwd()) 
ATTACHMENTS_DIR = BASE_DIR / "images"
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

logging.debug(f"📸 [INIT API] Diretório base de imagens: {ATTACHMENTS_DIR}")

# --- HELPER: Limpar nome de pasta (Segurança) ---
def sanitize_foldername(name: str) -> str:
    """Remove caracteres inválidos para pastas do Windows/Linux"""
    # Remove caracteres especiais, mantém letras, números, espaço, traço e underline
    cleaned = re.sub(r'[^\w\s-]', '', name).strip()
    # Limita tamanho para evitar erros de path longo
    return cleaned[:60] or "Geral" # Aumentei um pouco para caber nomes maiores

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
    
    maintenancePlanId: Optional[str] = None
    classification1: Optional[str] = None
    classification2: Optional[str] = None
    estimatedDuration: Optional[int] = 0
    plannedDowntime: Optional[int] = 0

router = APIRouter()

# --- FUNÇÕES AUXILIARES ---

def save_base64_image(base64_str: str, filename: str, os_id: str) -> str:
    """
    Decodifica Base64 e salva dentro da pasta específica da OS (ex: images/OS0002/arquivo.jpg)
    Nota: Para uploads via Base64 (Offline), ainda salvamos na raiz da OS por enquanto, 
    pois o payload offline atual não envia a legenda separada para processarmos a subpasta aqui.
    """
    try:
        if "base64," in base64_str:
            base64_str = base64_str.split("base64,")[1]
        
        image_data = base64.b64decode(base64_str)
        
        # Cria pasta específica da OS
        os_folder = ATTACHMENTS_DIR / os_id
        os_folder.mkdir(parents=True, exist_ok=True)
        
        safe_filename = f"{uuid4()}_{filename.replace(' ', '_')}"
        file_path = os_folder / safe_filename
        
        logging.debug(f"💾 [DEBUG SAVE] Salvando em: {file_path}")
        
        with open(file_path, "wb") as f:
            f.write(image_data)
            
        # Retorna URL pública correta
        return f"/attachments/images/{os_id}/{safe_filename}"

    except Exception as e:
        logging.error(f"❌ [ERRO] Falha ao salvar base64: {e}")
        return ""

def process_attachments(os_id: str, attachments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    processed = []
    for att in attachments:
        url = att.get("url", "")
        # Se for Base64 (vindo do App Offline), salva no disco
        if url.startswith("data:"):
            filename = att.get("fileName", f"upload_{int(datetime.now().timestamp())}.jpg")
            new_url = save_base64_image(url, filename, os_id)
            if new_url:
                att["url"] = new_url
                processed.append(att)
        else:
            processed.append(att)
    return processed

def cleanup_deleted_files(os_id: str, old_list: List[Dict], new_list: List[Dict]):
    old_urls = {a.get("url") for a in old_list if a.get("url") and not a.get("url").startswith("data:")}
    new_urls = {a.get("url") for a in new_list if a.get("url")}
    deleted_urls = old_urls - new_urls
    
    for url in deleted_urls:
        try:
            # A URL é /attachments/images/OS0002/Subtarefa_1/arquivo.jpg
            # Precisamos remover o prefixo /attachments/images/ para ter o caminho relativo físico
            relative_path = url.replace("/attachments/images/", "").strip("/")
            
            # Reconstrói o caminho completo físico
            file_path = ATTACHMENTS_DIR / relative_path
            
            if file_path.exists():
                os.remove(file_path)
                logging.info(f"🗑️ Arquivo deletado: {file_path}")
                
                # Opcional: Tentar remover a subpasta (Subtarefa_X) se ficar vazia
                parent_dir = file_path.parent
                if parent_dir != ATTACHMENTS_DIR and not any(parent_dir.iterdir()):
                    try:
                        parent_dir.rmdir()
                        logging.info(f"📂 Pasta vazia removida: {parent_dir}")
                    except: pass

        except Exception as e:
            logging.error(f"⚠️ Erro ao deletar arquivo {url}: {e}")

# --- ROTAS DA API ---

@router.get("/api/os")
def list_os(
    x_user_id: Optional[str] = Header(None), 
    _ping: Optional[str] = Query(None), 
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=2000),
    legacy: bool = Query(True),
    db: Session = Depends(get_db),
    current_user_id: str = Depends(get_current_user)
):
    if _ping: return [] 
    query = db.query(models.OS)
    
    # ISOLAMENTO MULTI-TENANT (Modo Camaleão)
    user = db.query(models.User).filter(models.User.id == current_user_id).first()
    if user and user.role == "Cliente":
        # Se não tiver usinas vinculadas, retorna nada
        if not user.plantIds:
            if legacy: return []
            return {"items": [], "total": 0, "page": page, "page_size": page_size}
            
        # Filtra para trazer APENAS OSs das usinas do Cliente
        query = query.filter(models.OS.plantId.in_(user.plantIds))
    
    if legacy:
        return query.all()
    
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@router.get("/api/os/{os_id}")
def get_os(os_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(status_code=404, detail="OS not found")
    return db_os

@router.post("/api/os")
def create_os(os_data: OSModel, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    verificar_permissao("os.criar", user_id, db)
    if os_data.imageAttachments:
        os_data.imageAttachments = process_attachments(os_data.id, os_data.imageAttachments)
    db_os = models.OS(**os_data.dict())
    db.add(db_os)
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/api/os/batch")
def create_os_batch(os_list: List[OSModel], db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    verificar_permissao("os.criar", user_id, db)
    created = []
    for item in os_list:
        if item.imageAttachments:
            item.imageAttachments = process_attachments(item.id, item.imageAttachments)
        db_os = models.OS(**item.dict())
        db.add(db_os)
        created.append(db_os)
    db.commit()
    return created

@router.put("/api/os/{os_id}")
def update_os(os_id: str, payload: OSModel, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    verificar_permissao("os.editar", user_id, db)
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS not found")
    
    if payload.imageAttachments is not None:
        old_attachments = db_os.imageAttachments or []
        # Processa salvando na pasta correta (OS_ID)
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
def delete_os_batch(ids: List[str] = Body(...), db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    verificar_permissao("os.excluir", user_id, db)
    # Limpa arquivos físicos antes de deletar do banco
    oss = db.query(models.OS).filter(models.OS.id.in_(ids)).all()
    for os_obj in oss:
        if os_obj.imageAttachments:
            cleanup_deleted_files(os_obj.id, os_obj.imageAttachments, [])
            # Tenta remover a pasta da OS também se estiver vazia
            try:
                shutil.rmtree(ATTACHMENTS_DIR / os_obj.id, ignore_errors=True)
            except: pass

    db.query(models.OS).filter(models.OS.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"deleted_count": len(ids)}

@router.delete("/api/os/{os_id}")
def delete_os(os_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    verificar_permissao("os.excluir", user_id, db)
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: return {"ok": True}
    
    if db_os.imageAttachments:
        cleanup_deleted_files(os_id, db_os.imageAttachments, [])
        # Remove a pasta da OS
        try:
            shutil.rmtree(ATTACHMENTS_DIR / os_id, ignore_errors=True)
        except: pass
        
    db.delete(db_os)
    db.commit()
    return {"ok": True}

@router.post("/api/os/{os_id}/attachments")
def upload_attachments(
    os_id: str,
    files: List[UploadFile] = File(...),
    caption: str = Form("Foto Geral"),
    x_user_id: str = Header(None),
    db: Session = Depends(get_db)
):
    logging.debug(f"🚀 [DEBUG UPLOAD] Recebendo {len(files)} arquivos para OS: {os_id}, Legenda: {caption}")
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS not found")

    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    uploader_name = user.name if user else "Desconhecido"

    # --- LÓGICA DE PASTAS FÍSICAS (CORRIGIDA) ---
    # 1. Define o nome da subpasta. Padrão = "Geral"
    subfolder_name = "Geral"
    
    # 2. Se a legenda contiver "Item X", renomeia para "Subtarefa X"
    # Ex: "Item 1 - Verificar cabos" -> "Subtarefa 1 - Verificar cabos"
    if "Item" in caption:
        # Substitui "Item" por "Subtarefa" na string base
        replaced_caption = caption.replace("Item", "Subtarefa")
        # Limpa caracteres inválidos para pasta
        subfolder_name = sanitize_foldername(replaced_caption)
    elif caption and caption != "Foto Geral":
        # Se for outra legenda personalizada, usa ela limpa
        subfolder_name = sanitize_foldername(caption)
    
    # 3. Cria estrutura de pastas: images/OS1234/Subtarefa_1_Verificar...
    target_folder = ATTACHMENTS_DIR / os_id / subfolder_name
    target_folder.mkdir(parents=True, exist_ok=True)

    new_attachments = []
    
    for file in files:
        safe_filename = f"{uuid4()}_{file.filename.replace(' ', '_')}"
        file_path = target_folder / safe_filename
        
        logging.debug(f"💾 [DEBUG UPLOAD] Salvando físico em: {file_path}")
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_attachments.append({
            "id": f"img-{int(datetime.now().timestamp()*1000)}",
            # A URL pública inclui a subpasta para que o frontend consiga baixar depois
            "url": f"/attachments/images/{os_id}/{subfolder_name}/{safe_filename}",
            "fileName": file.filename,
            "caption": caption, # Mantém a legenda original ("Item 1") para exibição no PDF
            "uploadedBy": uploader_name,
            "uploadedAt": datetime.now().isoformat()
        })

    current_list = list(db_os.imageAttachments or [])
    updated_list = new_attachments + current_list
    db_os.imageAttachments = updated_list
    db_os.updatedAt = datetime.now().isoformat()
    
    db.commit()
    db.refresh(db_os)
    return db_os

@router.post("/api/os/{os_id}/start")
def start_execution(os_id: str, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    verificar_permissao("os.executar", x_user_id, db)
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os: raise HTTPException(404, "OS not found")
    
    if db_os.currentExecutorId and db_os.currentExecutorId != x_user_id:
        raise HTTPException(400, "OS bloqueada por outro usuário")
        
    db_os.currentExecutorId = x_user_id
    db_os.executionStart = datetime.now(timezone.utc).isoformat()
    db_os.status = "Em Progresso"
    db_os.updatedAt = datetime.now().isoformat()
    
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
    # Se finished for true, é revisão. Se for false, é pausa/execução
    if payload.get("finished"):
        verificar_permissao("os.revisar", x_user_id, db)
    else:
        verificar_permissao("os.executar", x_user_id, db)
        
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
    completed_now = [] 
    
    old_subtasks = db_os.subtasksStatus or []
    if not isinstance(old_subtasks, list): old_subtasks = []
    
    old_map = {}
    for st in old_subtasks:
        if isinstance(st, dict):
            old_map[st.get('id')] = st.get('done', False)
            
    for st in new_subtasks:
        if isinstance(st, dict):
            st_id = st.get('id')
            is_done = st.get('done', False)
            was_done = old_map.get(st_id, False)
            if is_done and not was_done:
                completed_now.append(st.get('text', f"Item {st_id}"))
    
    session_log = {
        "sessionId": str(uuid4()),
        "userId": x_user_id,
        "userName": user.name if user else "Desconhecido",
        "startTime": start_iso or now_dt.isoformat(),
        "endTime": now_dt.isoformat(),
        "durationSeconds": duration,
        "completedSubtasks": completed_now,
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