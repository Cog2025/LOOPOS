from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.security import verify_token
from app.core.database import get_db
from app.core import models
from app.core.context import current_user_context

def get_current_user(authorization: str = Header(None), x_user_id: str = Header(None), db: Session = Depends(get_db)):
    user_id = None
    company_id_from_token = None
    
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = verify_token(token)
        print(f"DEBUG AUTH: token={token[:10]}... payload={payload}")
        if payload and "sub" in payload:
            user_id = payload["sub"]
            company_id_from_token = payload.get("company_id")
    
    if not user_id and x_user_id:
        user_id = x_user_id
        
    print(f"DEBUG AUTH: user_id={user_id}")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido ou ausente")
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    print(f"DEBUG AUTH: user_found={user is not None}")
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
        
    # Magia do Stateless Context Switcher
    if company_id_from_token:
        # Usamos __dict__ copy para evitar comitar sem querer
        setattr(user, 'empresa_atual_id', company_id_from_token)
    else:
        setattr(user, 'empresa_atual_id', user.company_id)
        
    current_user_context.set(user)
    return user

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
