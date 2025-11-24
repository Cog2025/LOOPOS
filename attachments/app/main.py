# /attachments/app/main.py
# App FastAPI principal — adiciona rotas de usuários e usinas.
# Mantém suas rotas existentes (OS, anexos etc) e inclui os novos routers.

from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.core.storage import load_json
from app.core.security import create_access_token
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from pathlib import Path
from datetime import datetime
import os
import uuid

# Routers do pacote (ajuste conforme sua estrutura: app/routes/*.py)
from app.core.schemas import UserCreate, UserOut
from app.routes.users import router as users_router
from app.routes.plants import router as plants_router

# Cria o app
app = FastAPI(title="LoopOS Attachments API", version="1.0.0")

# CORS amplo para desenvolvimento (restrinja em produção)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.18.69:3000",  # sua rede local
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*", "X-User-Id", "X-Role", "Content-Type"],
    expose_headers=["*"],
    allow_credentials=False,
    max_age=600,
)

# Rotas de OS (mantém seu módulo existente na raiz de /attachments)
from os_api import router as os_router  # os_api.py na raiz de /attachments
app.include_router(os_router)

# Novas rotas
app.include_router(users_router)
app.include_router(plants_router)

# Arquivos estáticos (anexos)
UPLOAD_ROOT = Path(os.getenv(
    "NEXTCLOUD_ATTACHMENTS_DIR",
    r"C:\Users\leona\Nextcloud\06. OPERAÇÃO\03. Tempo Real\LoopOS\LOOPOS\attachments"
))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/files", StaticFiles(directory=UPLOAD_ROOT), name="files")


@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Carrega usuários do JSON (Lado do servidor, seguro)
    users = load_json("users.json", [])
    
    # 2. Procura o usuário
    user = next((u for u in users if u["username"].lower() == form_data.username.lower()), None)
    
    # 3. Valida senha (no servidor!)
    if not user or user["password"] != form_data.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("can_login", True):
        raise HTTPException(status_code=400, detail="Usuário inativo")

    # 4. Gera o Token (Crachá)
    # Guardamos o ID e a Role no token para o frontend usar depois
    access_token = create_access_token(
        data={"sub": user["id"], "role": user["role"], "name": user["name"]}
    )
    
    # 5. Retorna o token e os dados do usuário (SEM A SENHA)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "name": user["name"],
            "username": user["username"],
            "email": user.get("email"),
            "role": user["role"],
            "plantIds": user.get("plantIds", [])
        }
    }

@app.get("/api/health")
def health():
    return {"ok": True}


# Upload de anexos (gravando em /files/{os_id}/<arquivo>)
@app.post("/api/os/{os_id}/attachments")
async def upload_attachments(
    os_id: str,
    files: List[UploadFile] = File(...),
    captions: List[str] = Form([])
):
    dest = UPLOAD_ROOT / os_id
    dest.mkdir(parents=True, exist_ok=True)
    saved = []

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
        saved.append({
            "id": att_id,
            "url": f"/files/{os_id}/{fname}",
            "caption": caption,
            "uploadedAt": datetime.utcnow().isoformat() + "Z",
        })

    return saved


# Remoção de anexo por ID (apaga qualquer extensão)
@app.delete("/api/os/{os_id}/attachments/{att_id}")
def delete_attachment(os_id: str, att_id: str):
    dirp = UPLOAD_ROOT / os_id
    if dirp.exists():
        for p in dirp.glob(f"{att_id}.*"):
            try:
                p.unlink()
            except:
                pass
    return {"ok": True}