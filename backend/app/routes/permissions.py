from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core import models
from app.core.auth_middleware import get_current_user
from pydantic import BaseModel
from typing import List

class PermissionUpdateItem(BaseModel):
    slug: str
    allowed: bool

class PermissionUpdatePayload(BaseModel):
    permissions: List[PermissionUpdateItem]

router = APIRouter(tags=["permissions"])

@router.get("/{role}")
def get_permissions(role: str, db: Session = Depends(get_db)):
    perms = db.query(models.Permission).filter(models.Permission.role == role).all()
    return [{"slug": p.slug, "allowed": p.allowed} for p in perms]

@router.put("/{role}")
def update_permissions(role: str, payload: PermissionUpdatePayload, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    # Busca todas as permissões desta role
    for item in payload.permissions:
        perm = db.query(models.Permission).filter(
            models.Permission.role == role,
            models.Permission.slug == item.slug
        ).first()
        if perm:
            perm.allowed = item.allowed
        else:
            new_perm = models.Permission(role=role, slug=item.slug, allowed=item.allowed)
            db.add(new_perm)
            
    db.commit()
    return {"msg": "Permissões atualizadas com sucesso"}
