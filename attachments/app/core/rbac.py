# LOOPOS/attachments/app/core/rbac.py
from typing import List, Dict

#Role = str  # usando seus literais em pt-br

def _overlap(a: List[str], b: List[str]) -> bool:
    return bool(set(a or []) & set(b or []))


def can_view_user(actor: Dict, target: Dict) -> bool:
    # ✅ Qualquer um vê a si mesmo
    if actor["id"] == target["id"]:
        return True
    
    ar, tr = actor["role"], target["role"]


    if ar == "Admin": 
        return True
    if ar == "Operador":
        return tr in {"Operador","Técnico","Auxiliar","Supervisor","Coordenador","Admin"}
    if ar == "Coordenador":
        if tr in {"Admin"}: return False
        if tr in {"Supervisor","Técnico","Auxiliar"}:
            return _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
        return True
    if ar == "Supervisor":
        if tr in {"Admin","Coordenador"}: return False
        if tr in {"Técnico","Auxiliar"}:
            actor_plants = actor.get("plantIds",[])
            target_plants = target.get("plantIds",[])
            result = _overlap(actor_plants, target_plants)
            

            return result
        if tr == "Supervisor":
            return _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
        return False
    if ar == "Técnico":
        if tr == "Auxiliar":
            return _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
        return tr == "Técnico" and actor["id"] == target["id"]
    if ar == "Auxiliar":
        return tr == "Técnico" and _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
    return False



def can_edit_user(actor: Dict, target: Dict) -> bool:
    ar, tr = actor["role"], target["role"]
    
    # ✅ Qualquer um edita a si mesmo
    if actor["id"] == target["id"]:
        return True
    
    if ar == "Admin":
        return True
    if ar == "Operador":
        return tr in {"Operador","Técnico","Auxiliar"}
    if ar == "Coordenador":
        if tr in {"Admin"}: return False
        if tr in {"Supervisor","Técnico","Auxiliar"}:
            return _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
        return False
    if ar == "Supervisor":
        if tr in {"Admin","Coordenador"}: return False
        if tr in {"Técnico","Auxiliar"}:
            return _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
        return False
    if ar == "Técnico":
        return tr == "Auxiliar" and _overlap(actor.get("plantIds",[]), target.get("plantIds",[]))
    return False


def can_view_plant(actor: Dict, plant_id: str) -> bool:
    if actor["role"] in {"Admin","Operador"}: 
        return True
    return plant_id in (actor.get("plantIds") or [])


def can_edit_plant(actor: Dict, plant_id: str) -> bool:
    if actor["role"] in {"Admin","Operador"}: 
        return True
    if actor["role"] in {"Coordenador","Supervisor"}:
        return plant_id in (actor.get("plantIds") or [])
    return False