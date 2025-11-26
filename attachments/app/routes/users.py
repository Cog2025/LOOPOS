# /attachments/app/routes/users.py
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import List
from sqlalchemy.orm import Session
from uuid import uuid4
from app.core.database import get_db
from app.core import models
from app.core.schemas import UserCreate, UserUpdate, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()
    
@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    # Verifica username duplicado
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="username already exists")
    
    # Cria objeto
    # O **payload.dict() converte o Pydantic para dicionário
    db_user = models.User(
        id=str(uuid4()),
        **payload.dict()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(404, "User not found")
    
    # Atualiza campos dinamicamente
    update_data = payload.dict(exclude_unset=True)
    
    # Tratamento especial para senha vazia (não atualizar)
    if "password" in update_data and not update_data["password"]:
        del update_data["password"]

    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return {"detail": "deleted"}