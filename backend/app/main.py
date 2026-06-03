# Arquivo: attachments/app/main.py
print("🔄 [DEBUG] Iniciando imports do main.py...")
from app.core.database import engine, get_db
from app.core import models
from app.core.schemas import NotificationCreate, NotificationOut
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.security import create_access_token, verify_password
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path
import os

# Routers
from app.routes.users import router as users_router
from app.routes.plants import router as plants_router
from app.routes.maintenance import router as maintenance_router
from app.routes.permissions import router as permissions_router
# 🔥 Import corrigido para a nova estrutura de pastas
from app.routes.os_api import router as os_router
from app.routes.upload import router as upload_router

from app.core.cloudinary_config import init_cloudinary

print("🔄 [DEBUG] Imports concluídos. Tentando criar tabelas...")

# Inicializa o Cloudinary
init_cloudinary()

try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ [DEBUG] Tabelas criadas/verificadas com sucesso!")
except Exception as e:
    print(f"❌ [DEBUG] Erro fatal ao criar tabelas: {e}")

app = FastAPI(title="LoopOS API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# 1. REGISTRO DE ROTAS DA API
# ==============================================================================

# 🚨 CORREÇÃO: Sem prefixo aqui, pois já está no os_api.py (/api/os)
app.include_router(os_router) 
app.include_router(upload_router)

app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(plants_router, prefix="/api/plants", tags=["plants"])
app.include_router(maintenance_router, prefix="/api/maintenance", tags=["maintenance"])
app.include_router(permissions_router, prefix="/api/permissions", tags=["permissions"])

# --- ROTAS DE AUTENTICAÇÃO ---
@app.post("/api/login", tags=["auth"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.can_login:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return {"access_token": create_access_token({"sub": user.id, "role": user.role}), "token_type": "bearer", "user": user}

# --- ROTAS DE NOTIFICAÇÕES ---
@app.get("/api/notifications", response_model=List[NotificationOut], tags=["notifications"])
def list_notifications(x_user_id: str = Header(None), db: Session = Depends(get_db)):
    if not x_user_id: return []
    return db.query(models.Notification).filter(models.Notification.userId == x_user_id).all()

@app.post("/api/notifications", status_code=201, tags=["notifications"])
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    if db.query(models.Notification).filter(models.Notification.id == payload.id).first():
        return {"msg": "Already exists"}
    
    new_notif = models.Notification(**payload.dict())
    db.add(new_notif)
    db.commit()
    return new_notif

@app.put("/api/notifications/{notification_id}/read", tags=["notifications"])
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    return {"ok": True}

# ==============================================================================
# 2. SERVIR ARQUIVOS ESTÁTICOS E FRONTEND (MANTENHA NO FINAL)
# ==============================================================================

# Caminho para arquivos locais: Estamos em backend/app/main.py -> subimos 2 níveis
CURRENT_DIR = Path(__file__).resolve().parent.parent 
DIST_DIR = CURRENT_DIR.parent / "frontend" / "dist"

# A. Servir Imagens (Uploads)
if CURRENT_DIR.exists():
    app.mount("/attachments", StaticFiles(directory=CURRENT_DIR), name="attachments")
    print(f"📂 [DEBUG] Servindo anexos de: {CURRENT_DIR}")
else:
    print(f"⚠️ [AVISO] Pasta de anexos não encontrada em: {CURRENT_DIR}")

# B. Servir o React App (Frontend)
if DIST_DIR.exists():
    print(f"✅ [DEBUG] Servindo Frontend de: {DIST_DIR}")
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        if full_path.startswith("api") or full_path.startswith("attachments"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = DIST_DIR / full_path
        
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        return FileResponse(DIST_DIR / "index.html")
else:
    print(f"⚠️ [ERRO] Pasta 'dist' não encontrada em {DIST_DIR}. Rode 'npm run build' na raiz.")

    # Adicione isso no main.py para debug
print(f"📍 [DEBUG MAIN] __file__: {Path(__file__)}")
print(f"📍 [DEBUG MAIN] CURRENT_DIR (StaticFiles): {CURRENT_DIR}")
print(f"📍 [DEBUG MAIN] Existe a pasta CURRENT_DIR? {CURRENT_DIR.exists()}")
print(f"📍 [DEBUG MAIN] Existe a pasta images dentro dela? {(CURRENT_DIR / 'images').exists()}")