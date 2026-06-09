from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import models
from app.core.auth_middleware import get_current_user
from app.core.permissions import PERMS_BASE
from pydantic import BaseModel
import uuid

router = APIRouter(tags=["permissions"])

def require_admin(current_user: models.User):
    if not current_user or (not current_user.is_superadmin and current_user.role != 'admin'):
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas Admins.")
    return current_user

@router.get("/matriz")
def get_permissions_matriz(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    cargos_db = db.query(models.RolePermission).filter(
        models.RolePermission.company_id == empresa_id
    ).all()
    
    cargos_list = [{"id": c.id, "nome": c.role_name} for c in cargos_db]
    
    modulos_dict = {}
    for p in PERMS_BASE:
        mod = p["modulo"]
        if mod not in modulos_dict:
            modulos_dict[mod] = []
        modulos_dict[mod].append({"id": p["slug"], "nome": p["nome"], "slug": p["slug"]})
        
    matriz = {}
    for c in cargos_db:
        matriz[c.id] = c.permissions if c.permissions else []
        
    return {
        "estrutura": {
            "cargos": cargos_list,
            "modulos": modulos_dict
        },
        "matriz": matriz
    }

class TogglePayload(BaseModel):
    permissao_id: str
    ativo: bool

@router.post("/cargo/{cargo_id}/toggle")
def toggle_permission(cargo_id: str, payload: TogglePayload, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    cargo = db.query(models.RolePermission).filter(
        models.RolePermission.id == cargo_id,
        models.RolePermission.company_id == empresa_id
    ).first()
    
    if not cargo:
        raise HTTPException(status_code=404, detail="Cargo não encontrado ou pertence a outro inquilino")
        
    perms = list(cargo.permissions) if cargo.permissions else []
    
    if payload.ativo:
        if payload.permissao_id not in perms:
            perms.append(payload.permissao_id)
    else:
        if payload.permissao_id in perms:
            perms.remove(payload.permissao_id)
            
    cargo.permissions = perms
    db.commit()
    return {"status": "ok", "permissions": perms}

@router.post("/setup-inicial")
def setup_inicial(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_admin(current_user)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    cargos_base = ["admin", "tecnico", "operador", "cliente"]
    
    for nome in cargos_base:
        existe = db.query(models.RolePermission).filter(
            models.RolePermission.role_name == nome,
            models.RolePermission.company_id == empresa_id
        ).first()
        
        if not existe:
            if nome == "admin":
                perms = [p["slug"] for p in PERMS_BASE]
            else:
                perms = []
                
            db.add(models.RolePermission(
                id=str(uuid.uuid4()),
                role_name=nome,
                company_id=empresa_id,
                permissions=perms
            ))
            
    db.commit()
    return {"msg": "Setup inicial concluído para a empresa"}
