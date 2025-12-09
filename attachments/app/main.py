# /attachments/app/main.py
print("🔄 [DEBUG] Iniciando imports do main.py...")
from app.core.database import engine, get_db
from app.core import models
from app.core.schemas import NotificationCreate, NotificationOut
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.security import create_access_token
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
from pathlib import Path
from datetime import datetime
import os
import uuid

# Routers
from app.routes.users import router as users_router
from app.routes.plants import router as plants_router
from app.routes.maintenance import router as maintenance_router
from os_api import router as os_router 

print("🔄 [DEBUG] Imports concluídos. Tentando criar tabelas...")

# Cria tabelas
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
# 1. ROTAS DA API (DEVEM VIR PRIMEIRO!)
# ==============================================================================
app.include_router(os_router)
app.include_router(users_router)
app.include_router(plants_router)
app.include_router(maintenance_router) # ✅ Garante que manutenção está aqui

# Configuração de diretórios de uploads
BASE_ATTACHMENTS = Path(os.getenv("NEXTCLOUD_ATTACHMENTS_DIR", r"C:\Users\leona\Nextcloud\06. OPERAÇÃO\03. Tempo Real\LoopOS\LOOPOS\attachments"))
UPLOAD_ROOT = BASE_ATTACHMENTS / "images"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_ROOT), name="files")

# --- Rotas de Autenticação e Notificações (Mantidas) ---
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or user.password != form_data.password:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    if not user.can_login:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return {"access_token": create_access_token({"sub": user.id, "role": user.role}), "token_type": "bearer", "user": user}

@app.get("/api/notifications", response_model=List[NotificationOut])
def list_notifications(x_user_id: str = Header(None), db: Session = Depends(get_db)):
    if not x_user_id: return []
    return db.query(models.Notification).filter(models.Notification.userId == x_user_id).all()

# ==============================================================================
# 2. SERVIR O FRONTEND (DEVE VIR POR ÚLTIMO!)
# ==============================================================================
DIST_DIR = Path(__file__).resolve().parents[2] / "dist"

if DIST_DIR.exists():
    print(f"✅ [DEBUG] Pasta dist encontrada em: {DIST_DIR}")
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")
    
    # Rota "Pega-Tudo" para o React (SPA)
    # ATENÇÃO: Só captura o que NÃO começou com /api ou /files
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Se tentar acessar arquivo que não existe, manda o index.html
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    print(f"⚠️ [AVISO] Pasta 'dist' não encontrada.")