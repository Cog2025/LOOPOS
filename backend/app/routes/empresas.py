from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.core.database import get_db
from app.core import models
from app.core.auth_middleware import get_current_user
from app.core.security import create_access_token

router = APIRouter()

from typing import List, Optional

class EmpresaOut(BaseModel):
    id: str
    name: str
    cnpj: Optional[str] = None
    status: Optional[str] = 'Ativo'
    modulos_ativos: List[str] = []
    
    class Config:
        from_attributes = True

class EmpresaCreate(BaseModel):
    name: str
    cnpj: Optional[str] = None
    status: Optional[str] = 'Ativo'
    modulos_ativos: List[str] = []

class TrocarEmpresaReq(BaseModel):
    empresa_alvo: str

def require_superadmin(user: models.User):
    if not user or not user.is_superadmin:
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas SuperAdmins.")
    return user

@router.get("/", response_model=List[EmpresaOut])
def list_empresas(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_superadmin(current_user)
    return db.query(models.Company).all()

@router.post("/", response_model=EmpresaOut)
def create_empresa(payload: EmpresaCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_superadmin(current_user)
    import uuid
    new_company = models.Company(
        id=str(uuid.uuid4()), 
        name=payload.name,
        cnpj=payload.cnpj,
        status=payload.status,
        modulos_ativos=payload.modulos_ativos
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    # Injetando cargos padrões para a nova empresa
    roles = ['Operador', 'Coordenador', 'Supervisor', 'Técnico', 'Cliente', 'Admin']
    for r in roles:
        novo_cargo = models.RolePermission(
            id=str(uuid.uuid4()),
            role_name=r,
            company_id=new_company.id,
            permissions=[]
        )
        db.add(novo_cargo)
    db.commit()

    return new_company

@router.put("/{empresa_id}", response_model=EmpresaOut)
def update_empresa(empresa_id: str, payload: EmpresaCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_superadmin(current_user)
    empresa = db.query(models.Company).filter(models.Company.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    empresa.name = payload.name
    empresa.cnpj = payload.cnpj
    empresa.status = payload.status
    empresa.modulos_ativos = payload.modulos_ativos
    db.commit()
    db.refresh(empresa)
    return empresa

@router.delete("/{empresa_id}")
def delete_empresa(empresa_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    require_superadmin(current_user)
    empresa = db.query(models.Company).filter(models.Company.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    db.delete(empresa)
    db.commit()
    return {"msg": "Empresa excluída com sucesso"}

@router.post("/trocar")
def trocar_empresa(req: TrocarEmpresaReq, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    user = require_superadmin(current_user)
    
    empresa = db.query(models.Company).filter(models.Company.id == req.empresa_alvo).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa alvo não encontrada")
        
    # GERA O NOVO TOKEN INJETANDO O CONTEXTO ATUALIZADO NO PAYLOAD
    token_payload = {
        "sub": user.id,
        "role": user.role,
        "company_id": empresa.id
    }
    novo_token = create_access_token(token_payload)
    
    from sqlalchemy import or_
    role_perm = db.query(models.RolePermission).filter(
        models.RolePermission.role_name == user.role,
        or_(
            models.RolePermission.company_id == empresa.id,
            models.RolePermission.company_id.is_(None)
        )
    ).order_by(models.RolePermission.company_id.desc()).first()
    role_permissions = role_perm.permissions if role_perm else []
    
    # Atualizamos o objeto temporário em memória para enviar ao front, mas SEM fazer db.commit()
    user_out = user.__dict__.copy()
    user_out.pop('_sa_instance_state', None)
    user_out['company_id'] = empresa.id
    user_out['permissions'] = role_permissions
    
    return {
        "access_token": novo_token,
        "token_type": "bearer",
        "user": user_out,
        "empresa": {"id": empresa.id, "name": empresa.name}
    }
