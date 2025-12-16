# Arquivo: attachments/app/main.py
print("🔄 [DEBUG] Iniciando imports do main.py...")
from app.core.database import engine, get_db
from app.core import models
from app.core.schemas import NotificationCreate, NotificationOut
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.security import create_access_token
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
# 🔥 CORREÇÃO DO IMPORT: Como você roda de dentro da pasta attachments, o import é direto
from os_api import router as os_router 

print("🔄 [DEBUG] Imports concluídos. Tentando criar tabelas...")

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

# 1. ROTAS DA API
app.include_router(os_router)
app.include_router(users_router)
app.include_router(plants_router)
app.include_router(maintenance_router)

# 2. SERVIR IMAGENS (PARA O TUNNEL E MINIATURAS FUNCIONAREM)
# Caminho absoluto para .../LOOPOS/attachments
# (Sobe 2 níveis a partir de app/main.py para chegar na raiz de attachments)
CURRENT_DIR = Path(__file__).resolve().parent.parent 
ATTACHMENTS_DIR = CURRENT_DIR # .../LOOPOS/attachments

if ATTACHMENTS_DIR.exists():
    # Monta a rota /attachments para que links como /attachments/images/... funcionem
    app.mount("/attachments", StaticFiles(directory=ATTACHMENTS_DIR), name="attachments")
    print(f"📂 [DEBUG] Servindo anexos de: {ATTACHMENTS_DIR}")
else:
    print(f"⚠️ [AVISO] Pasta de anexos não encontrada em: {ATTACHMENTS_DIR}")

# --- ROTAS DE AUTENTICAÇÃO ---
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or user.password != form_data.password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.can_login:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return {"access_token": create_access_token({"sub": user.id, "role": user.role}), "token_type": "bearer", "user": user}

# --- ROTAS DE NOTIFICAÇÕES ---

@app.get("/api/notifications", response_model=List[NotificationOut])
def list_notifications(x_user_id: str = Header(None), db: Session = Depends(get_db)):
    if not x_user_id: return []
    # Retorna as notificações do usuário, ordenadas das mais recentes para as antigas (opcional, mas recomendado)
    return db.query(models.Notification).filter(models.Notification.userId == x_user_id).all()

@app.post("/api/notifications", status_code=201)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    # Evita duplicidade se o ID já existir
    if db.query(models.Notification).filter(models.Notification.id == payload.id).first():
        return {"msg": "Already exists"}
    
    new_notif = models.Notification(**payload.dict())
    db.add(new_notif)
    db.commit()
    return new_notif

# ✅ NOVA ROTA: CORREÇÃO DO ERRO 405 (Marcar como lida)
@app.put("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.read = True
    db.commit()
    
    return {"ok": True}

# 3. SERVIR O SITE REACT (MODO PRODUÇÃO)
# Caminho absoluto para .../LOOPOS/dist
# (Sobe 3 níveis a partir de app/main.py para sair de attachments e ir para dist)
DIST_DIR = CURRENT_DIR.parent / "dist"

if DIST_DIR.exists():
    print(f"✅ [DEBUG] Servindo Frontend de: {DIST_DIR}")
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    # Rota "Pega-Tudo" para o React
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Se for requisição de API ou Attachments que não casou antes, deixa passar (404 da API)
        if full_path.startswith("api") or full_path.startswith("attachments"):
            raise HTTPException(status_code=404, detail="Not Found")
            
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        
        # Para SPA (Single Page Application), retorna index.html se não achar o arquivo
        return FileResponse(DIST_DIR / "index.html")
else:
    print(f"⚠️ [ERRO] Pasta 'dist' não encontrada em {DIST_DIR}. Rode 'npm run build' na raiz.")