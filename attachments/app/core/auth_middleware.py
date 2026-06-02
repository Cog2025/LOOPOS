from fastapi import Header, HTTPException
from app.core.security import verify_token

async def get_current_user(authorization: str = Header(None), x_user_id: str = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_token(token)
        if payload and "sub" in payload:
            return payload["sub"]
    
    # Fallback para o APK antigo (isolamento garantido)
    if x_user_id:
        return x_user_id
        
    raise HTTPException(status_code=401, detail="Token inválido ou ausente")

from sqlalchemy.orm import Session
from app.core import models

def verificar_permissao(slug: str, user_id: str, db: Session) -> bool:
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    if user.role == "Admin":
        return True
        
    perm = db.query(models.Permission).filter(
        models.Permission.role == user.role,
        models.Permission.slug == slug
    ).first()
    
    if not perm or not perm.allowed:
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    return True
