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
from fastapi.responses import FileResponse # ✅ Necessário para servir o React
from typing import List
from pathlib import Path
from datetime import datetime
import os
import uuid

print("🔄 [DEBUG] Imports concluídos. Tentando criar tabelas...")

# Cria tabelas
try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ [DEBUG] Tabelas criadas/verificadas com sucesso!")
except Exception as e:
    print(f"❌ [DEBUG] Erro fatal ao criar tabelas: {e}")

# Routers
from app.routes.users import router as users_router
from app.routes.plants import router as plants_router
from os_api import router as os_router 

app = FastAPI(title="LoopOS Attachments API", version="1.0.0")

# Em produção na rede local, liberar tudo facilita.
ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*", "X-User-Id", "X-Role", "Content-Type"],
    expose_headers=["*"],
    allow_credentials=False,
    max_age=600,
)

# --- 1. ROTAS DA API (Prioridade Alta) ---
app.include_router(os_router)
app.include_router(users_router)
app.include_router(plants_router)

# Configuração de diretórios
BASE_ATTACHMENTS = Path(os.getenv(
    "NEXTCLOUD_ATTACHMENTS_DIR",
    r"C:\Users\leona\Nextcloud\06. OPERAÇÃO\03. Tempo Real\LoopOS\LOOPOS\attachments"
))
UPLOAD_ROOT = BASE_ATTACHMENTS / "images"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)

# Serve as imagens enviadas pelos usuários
app.mount("/files", StaticFiles(directory=UPLOAD_ROOT), name="files")


# --- ROTAS DE LOGIN ---
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    
    if not user or user.password != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.can_login:
        raise HTTPException(status_code=400, detail="Usuário inativo")

    access_token = create_access_token(
        data={"sub": user.id, "role": user.role, "name": user.name}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user 
    }

@app.get("/api/health")
def health():
    return {"ok": True}

# --- ROTAS DE ANEXOS (Com persistência SQL) ---
@app.post("/api/os/{os_id}/attachments")
async def upload_attachments(
    os_id: str,
    files: List[UploadFile] = File(...),
    captions: List[str] = Form([]),
    db: Session = Depends(get_db)
):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(status_code=404, detail="OS not found")

    dest = UPLOAD_ROOT / os_id
    dest.mkdir(parents=True, exist_ok=True)
    saved_attachments = []

    for i, uf in enumerate(files):
        ext = Path(uf.filename).suffix or ".bin"
        att_id = f"img-{uuid.uuid4().hex}"
        fname = f"{att_id}{ext}"
        fpath = dest / fname

        with open(fpath, "wb") as out:
            while True:
                chunk = await uf.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)

        caption = captions[i] if i < len(captions) else ""
        
        new_att = {
            "id": att_id,
            "url": f"/files/{os_id}/{fname}",
            "caption": caption,
            "uploadedAt": datetime.utcnow().isoformat() + "Z",
        }
        saved_attachments.append(new_att)

    current_list = list(db_os.imageAttachments) if db_os.imageAttachments else []
    db_os.imageAttachments = current_list + saved_attachments
    
    db.commit()
    db.refresh(db_os)

    return saved_attachments

@app.delete("/api/os/{os_id}/attachments/{att_id}")
def delete_attachment(os_id: str, att_id: str, db: Session = Depends(get_db)):
    db_os = db.query(models.OS).filter(models.OS.id == os_id).first()
    if not db_os:
        raise HTTPException(status_code=404, detail="OS not found")
    
    dirp = UPLOAD_ROOT / os_id
    if dirp.exists():
        for p in dirp.glob(f"{att_id}.*"):
            try:
                p.unlink()
            except:
                pass
    
    if db_os.imageAttachments:
        current_list = list(db_os.imageAttachments)
        new_list = [a for a in current_list if a.get("id") != att_id]
        
        if len(new_list) != len(current_list):
            db_os.imageAttachments = new_list
            db.commit()
            db.refresh(db_os)
            
    return {"ok": True}


# --- ROTAS DE NOTIFICAÇÕES ---
@app.get("/api/notifications", response_model=List[NotificationOut])
def list_notifications(
    x_user_id: str = Header(None),
    db: Session = Depends(get_db)
):
    if not x_user_id:
        return []
    return db.query(models.Notification).filter(models.Notification.userId == x_user_id).all()

@app.post("/api/notifications", response_model=NotificationOut)
def create_notification(payload: NotificationCreate, db: Session = Depends(get_db)):
    new_n = models.Notification(
        id=f"notif-{uuid.uuid4().hex}",
        **payload.dict()
    )
    db.add(new_n)
    db.commit()
    db.refresh(new_n)
    return new_n

@app.put("/api/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, db: Session = Depends(get_db)):
    n = db.query(models.Notification).filter(models.Notification.id == notif_id).first()
    if n:
        n.read = True
        db.commit()
    return {"ok": True}


# --- 2. SERVIR O FRONTEND (Última Prioridade) ---
# Caminho para a pasta 'dist' gerada pelo 'npm run build'
DIST_DIR = Path(__file__).resolve().parents[2] / "dist"

if DIST_DIR.exists():
    print(f"✅ [DEBUG] Pasta dist encontrada em: {DIST_DIR}")
    
    # Serve os assets (CSS, JS, imagens do site)
    app.mount("/assets", StaticFiles(directory=DIST_DIR / "assets"), name="assets")

    # Rota "Catch-All": Pega qualquer URL e devolve o index.html
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(DIST_DIR / "index.html")
else:
    print(f"⚠️ [AVISO] Pasta 'dist' não encontrada em {DIST_DIR}.")
    print("   O frontend não será servido. Execute 'npm run build' na pasta raiz.")