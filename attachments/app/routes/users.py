# /attachments/app/routes/users.py
from fastapi import APIRouter, HTTPException, Query, Request
from typing import List, Optional
from uuid import uuid4
from app.core.storage import load_json, save_json
from app.core.schemas import UserCreate, UserUpdate, UserOut
from app.core.rbac import can_view_user, can_edit_user
from app.core.sync import sync_assignments_from_users

router = APIRouter(prefix="/api/users", tags=["users"])
_USERS_FILE = "users.json"

def _all_users() -> list[dict]:
    return load_json(_USERS_FILE, [])

def _save_users(users: list[dict]):
    save_json(_USERS_FILE, users)

def _exists_username(users: List[dict], username: str, *, skip_id: str | None = None) -> bool:
    u_lower = username.lower()
    for u in users:
        if skip_id and u.get("id") == skip_id:
            continue
        if u.get("username","").lower() == u_lower:
            return True
    return False

def _actor_from_headers(req: Request, users: list[dict]) -> dict:
    rid = req.headers.get("x-user-id")
    rrole = req.headers.get("x-role")
    if rid:
        for u in users:
            if u["id"] == rid:
                return u
    return {"id":"anon","role": (rrole or "Auxiliar"), "plantIds": []}

@router.get("", response_model=List[UserOut])
def list_users(request: Request):
    users = _all_users()
    # --- CORREÇÃO: Retorna todos os usuários para permitir o Login ---
    # Antes: return [u for u in users if can_view_user(actor, u)]
    return users
    # ---------------------------------------------------------------
    
@router.post("", response_model=UserOut, status_code=201)
def create_user(request: Request, payload: UserCreate):
    users = _all_users()
    actor = _actor_from_headers(request, users)
    
    dummy = {**payload.dict(), "id":"new", "plantIds": payload.dict().get("plantIds", [])}
    
    # Mantém a segurança na criação/edição
    if not can_edit_user(actor, dummy):
        raise HTTPException(403, "forbidden")
    
    if _exists_username(users, payload.username):
        raise HTTPException(status_code=409, detail="username already exists")
    
    supervisor_id = payload.dict().get("supervisorId", None)
    if not supervisor_id or str(supervisor_id).strip() == "":
        supervisor_id = None
    
    new_user = {
        "id": str(uuid4()),
        "name": payload.name,
        "username": payload.username,
        "email": payload.email,
        "password": payload.password,
        "phone": payload.phone,
        "role": payload.role,
        "can_login": True,
        "plantIds": payload.dict().get("plantIds", []),
        "supervisorId": supervisor_id,
    }
    
    users.append(new_user)
    _save_users(users)
    sync_assignments_from_users()
    return new_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, request: Request):
    users = _all_users()
    actor = _actor_from_headers(request, users)
    
    current_user = next((u for u in users if u["id"] == user_id), None)
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mantém a segurança na edição
    actor_id = actor.get("id")
    if actor_id and actor_id == user_id:
        pass
    elif not can_edit_user(actor, current_user):
        raise HTTPException(status_code=403, detail="forbidden")
    
    update_data = payload.dict(exclude_unset=True)
    
    if "supervisorId" in update_data:
        supervisor_id = update_data.get("supervisorId")
        if not supervisor_id or (isinstance(supervisor_id, str) and supervisor_id.strip() == ""):
            update_data["supervisorId"] = None
    
    if "username" in update_data and update_data["username"] != current_user.get("username"):
        if _exists_username(users, update_data["username"], skip_id=user_id):
            raise HTTPException(status_code=409, detail="username already exists")
    
    for i, u in enumerate(users):
        if u["id"] == user_id:
            updated = {**u, **update_data}
            users[i] = updated
            _save_users(users)
            sync_assignments_from_users()
            return updated
    
    raise HTTPException(status_code=404, detail="User not found")

@router.delete("/{user_id}")
def delete_user(user_id: str):
    users = _all_users()
    new_users = [u for u in users if u["id"] != user_id]
    if len(new_users) == len(users):
        raise HTTPException(status_code=404, detail="User not found")
    _save_users(new_users)
    return {"detail": "deleted"}