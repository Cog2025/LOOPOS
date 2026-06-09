# /attachments/app/routes/users.py
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List, Optional # Adicionado Optional
from sqlalchemy.orm import Session
from uuid import uuid4
import json
from app.core.database import get_db
from app.core import models
from app.core.schemas import UserCreate, UserUpdate, UserOut
from app.core.security import hash_password
from app.core.auth_middleware import get_current_user

router = APIRouter(tags=["users"])

@router.get("", response_model=List[UserOut])
def list_users(search: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    if not empresa_id:
        if getattr(current_user, 'is_superadmin', False):
            # Visão Global
            query = db.query(models.User)
        else:
            return []
    else:
        query = db.query(models.User).filter(models.User.company_id == empresa_id)
    
    # ISOLAMENTO: Cliente não enxerga a rede, apenas a si mesmo
    if current_user and current_user.role == 'Cliente':
        query = query.filter(models.User.id == current_user.id)
    
    if search:
        query = query.filter(models.User.name.ilike(f"%{search}%"))
        
    return query.all()
    
@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    if not empresa_id:
        raise HTTPException(status_code=400, detail="É necessário selecionar uma empresa para criar usuários.")
        
    # Verifica username duplicado (globalmente para evitar conflitos de login)
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="username already exists")
    
    # Cria objeto
    # O **payload.dict() converte o Pydantic para dicionário
    user_data = payload.dict()
    user_data["password"] = hash_password(user_data["password"])
    db_user = models.User(
        id=str(uuid4()),
        company_id=empresa_id,
        **user_data
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    import json
    
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(404, "User not found")
    
    # 1. Atualiza dados do usuário
    update_data = payload.dict(exclude_unset=True)
    if "password" in update_data:
        if not update_data["password"]:
            del update_data["password"]
        else:
            update_data["password"] = hash_password(update_data["password"])

    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    try:
        db.commit()
        db.refresh(db_user)

        # 2. Hook Blindado de Sincronização (Cliente <-> Usina)
        if hasattr(db_user, 'plantIds') and db_user.role == 'Cliente':
            user_plants = db_user.plantIds or []
            if isinstance(user_plants, str):
                try: user_plants = json.loads(user_plants)
                except: user_plants = []

            # A) Desvinculação implacável
            plants_owned = db.query(models.Plant).filter(models.Plant.client == db_user.name).all()
            for p in plants_owned:
                if p.id not in user_plants:
                    p.client = None
                    db.add(p)
            
            # B) Reivindicação
            for pid in user_plants:
                p = db.query(models.Plant).filter(models.Plant.id == pid).first()
                if p and p.client != db_user.name:
                    p.client = db_user.name
                    db.add(p)
            
            db.commit()
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        with open("/app/error_debug.txt", "w") as f:
            f.write(error_msg)
        raise HTTPException(status_code=400, detail=f"Erro ao salvar: {error_msg}")

    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"detail": "deleted"}

# --- GERENCIAMENTO DE CARGOS POR INQUILINO ---
from pydantic import BaseModel

class RoleCreate(BaseModel):
    nome: str

def require_admin(current_user: models.User):
    if not current_user or (not current_user.is_superadmin and current_user.role != 'admin'):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas Admins.")
    return current_user

@router.get("/cargos")
def list_cargos(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    if not empresa_id:
        if getattr(current_user, 'is_superadmin', False):
            query = db.query(models.RolePermission)
        else:
            return []
    else:
        query = db.query(models.RolePermission).filter(models.RolePermission.company_id == empresa_id)
    
    cargos = query.all()
    return [{"id": c.id, "nome": c.role_name} for c in cargos]

@router.post("/cargos")
def create_cargo(payload: RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    nome_lower = payload.nome.lower()
    
    # Validações
    if nome_lower == 'admin':
        raise HTTPException(status_code=400, detail="Não é possível recriar o cargo Admin")
        
    existe = db.query(models.RolePermission).filter(
        models.RolePermission.role_name == payload.nome,
        models.RolePermission.company_id == empresa_id
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Já existe um cargo com esse nome neste inquilino")
        
    novo_cargo = models.RolePermission(
        id=str(uuid4()),
        role_name=payload.nome,
        company_id=empresa_id,
        permissions=[]
    )
    db.add(novo_cargo)
    db.commit()
    return {"id": novo_cargo.id, "nome": novo_cargo.role_name}

@router.put("/cargos/{cargo_id}")
def update_cargo(cargo_id: str, payload: RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    cargo = db.query(models.RolePermission).filter(
        models.RolePermission.id == cargo_id,
        models.RolePermission.company_id == empresa_id
    ).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
        
    if cargo.role_name.lower() == 'admin':
        raise HTTPException(status_code=400, detail="Não é possível renomear o cargo Admin base")
        
    cargo.role_name = payload.nome
    db.commit()
    return {"id": cargo.id, "nome": cargo.role_name}

@router.delete("/cargos/{cargo_id}")
def delete_cargo(cargo_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    cargo = db.query(models.RolePermission).filter(
        models.RolePermission.id == cargo_id,
        models.RolePermission.company_id == empresa_id
    ).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado")
        
    if cargo.role_name.lower() == 'admin':
        raise HTTPException(status_code=400, detail="Não é possível excluir o cargo Admin base")
        
    db.delete(cargo)
    db.commit()
    return {"status": "ok"}