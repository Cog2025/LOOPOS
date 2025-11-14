# /attachments/app/routes/users.py
from fastapi import APIRouter, HTTPException, Query, Request
from typing import List
from uuid import uuid4
from app.core.storage import load_json, save_json
from app.core.schemas import UserCreate, UserUpdate, UserOut
from app.core.rbac import can_view_user, can_edit_user

router = APIRouter(prefix="/api/users", tags=["users"])
_USERS_FILE = "users.json"

def _all_users() -> list[dict]:
    # Com o load_json acima, arquivo vazio/corrompido vira []
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
    # fallback por role simples
    return {"id":"anon","role": (rrole or "Auxiliar"), "plantIds": []}

@router.get("", response_model=List[UserOut])
def list_users(request: Request):
    users = _all_users()
    actor = _actor_from_headers(request, users)
    return [u for u in users if can_view_user(actor, u)]
    
@router.post("", response_model=UserOut, status_code=201)
def create_user(request: Request, payload: UserCreate):
    users = _all_users()
    actor = _actor_from_headers(request, users)
    # só pode criar se teria permissão de editar esse papel
    dummy = {**payload.dict(), "id":"new", "plantIds": payload.dict().get("plantIds", [])}
    if not can_edit_user(actor, dummy):
        raise HTTPException(403, "forbidden")

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate):
    users = _all_users()
    if _exists_username(users, payload.username, skip_id=user_id):
        raise HTTPException(status_code=409, detail="username already exists")
    for i, u in enumerate(users):
        if u["id"] == user_id:
            users[i] = {**u, **payload.dict()}
            _save_users(users)
            return users[i]
    raise HTTPException(status_code=404, detail="User not found")

@router.delete("/{user_id}")
def delete_user(user_id: str):
    users = _all_users()
    new_users = [u for u in users if u["id"] != user_id]
    if len(new_users) == len(users):
        raise HTTPException(status_code=404, detail="User not found")
    _save_users(new_users)
    return {"detail": "deleted"}