# /attachments/app/routes/plants.py
from fastapi import APIRouter, HTTPException
from typing import List, Dict
from uuid import uuid4
from app.core.storage import load_json, save_json
from app.core.schemas import PlantCreate, PlantUpdate, PlantOut, AssignmentsPayload
from app.core.sync import sync_assignments_from_users

router = APIRouter(prefix="/api/plants", tags=["plants"])
_PLANTS_FILE = "plants.json"
_ASSIGN_FILE = "assignments.json"
_USERS_FILE  = "users.json"

def _all_plants() -> List[dict]:
    return load_json(_PLANTS_FILE, [])

def _save_plants(plants: List[dict]):
    save_json(_PLANTS_FILE, plants)

def _all_assignments() -> Dict[str, dict]:
    return load_json(_ASSIGN_FILE, {})

def _save_assignments(assignments: Dict[str, dict]):
    save_json(_ASSIGN_FILE, assignments)

def _all_users() -> List[dict]:
    return load_json(_USERS_FILE, [])

def _save_users(users: List[dict]):
    save_json(_USERS_FILE, users)

def _sync_user_plant_links(plant_id: str, ap: AssignmentsPayload):
    users = _all_users()
    for u in users:
        ids = set(u.get("plantIds", []))
        in_assign = (
            (u["id"] == (ap.coordinatorId or "")) or
            (u["id"] in ap.supervisorIds) or
            (u["id"] in ap.technicianIds) or
            (u["id"] in ap.assistantIds)
        )
        old_ids = ids.copy()
        if in_assign: ids.add(plant_id)
        else: ids.discard(plant_id)
        
        # ✅ LOG MELHORADO
        if ids != old_ids:
            action = "adicionado" if plant_id in ids else "removido"
            print(f"✅ Plant {plant_id} {action} de plantIds de {u.get('name')} (id: {u['id']})")
        
        u["plantIds"] = list(ids)
    _save_users(users)


@router.get("", response_model=List[PlantOut])
def list_plants():
    # ✅ Sincroniza antes de listar
    #sync_assignments_from_users()
    
    plants = _all_plants()
    assignments = _all_assignments()
    
    print(f"DEBUG - plants count: {len(plants)}")
    print(f"DEBUG - assignments: {assignments}")
    
    # ✅ ENRIQUECER CADA PLANTA COM ATRIBUIÇÕES
    for plant in plants:
        plant_id = plant.get("id")
        plant_assigns = assignments.get(plant_id, {})
        
        print(f"DEBUG - plant_id: {plant_id}")
        print(f"DEBUG - plant_assigns: {plant_assigns}")
        
        plant["coordinatorId"] = plant_assigns.get("coordinatorId", "")
        plant["supervisorIds"] = plant_assigns.get("supervisorIds", [])
        plant["technicianIds"] = plant_assigns.get("technicianIds", [])
        plant["assistantIds"] = plant_assigns.get("assistantIds", [])
    
    return plants




@router.post("", response_model=PlantOut, status_code=201)
def create_plant(payload: PlantCreate):
    plants = _all_plants()
    plant = payload.dict()
    plant["id"] = str(uuid4())
    plants.append(plant)
    _save_plants(plants)
    
    # ✅ INICIALIZE assignments PRIMEIRO
    assignments = _all_assignments()
    
    coordinatorId = getattr(payload, 'coordinatorId', None) or ""
    supervisorIds = getattr(payload, 'supervisorIds', None) or []
    technicianIds = getattr(payload, 'technicianIds', None) or []
    assistantIds = getattr(payload, 'assistantIds', None) or []

    ap = AssignmentsPayload(
        coordinatorId=coordinatorId,
        supervisorIds=supervisorIds,
        technicianIds=technicianIds,
        assistantIds=assistantIds,
    )
    assignments[plant["id"]] = ap.dict()
    _save_assignments(assignments)
    _sync_user_plant_links(plant["id"], ap)

    # ✅ UM ÚNICO RETURN
    return {
        **plant,
        "coordinatorId": coordinatorId,
        "supervisorIds": supervisorIds,
        "technicianIds": technicianIds,
        "assistantIds": assistantIds,
    }



@router.get("/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: str):
    plants = _all_plants()
    plant = next((p for p in plants if p["id"] == plant_id), None)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # ✅ CARREGA ATRIBUIÇÕES DE assignments.json
    assignments = _all_assignments().get(plant_id, {})
    
    return {
        **plant,
        "coordinatorId": assignments.get("coordinatorId", ""),
        "supervisorIds": assignments.get("supervisorIds", []),
        "technicianIds": assignments.get("technicianIds", []),
        "assistantIds": assignments.get("assistantIds", []),
    }



@router.put("/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, payload: PlantUpdate):
    plants = _all_plants()
    for i, p in enumerate(plants):
        if p["id"] == plant_id:
            # ✅ ATUALIZA A PLANTA (excluindo atribuições)
            plants[i] = {**p, **payload.dict(exclude={'coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds'})}
            _save_plants(plants)
            
            # ✅ LIDA COM ATRIBUIÇÕES DE FORMA SEGURA
            coordinatorId = getattr(payload, 'coordinatorId', None) or ""
            supervisorIds = getattr(payload, 'supervisorIds', None) or []
            technicianIds = getattr(payload, 'technicianIds', None) or []
            assistantIds = getattr(payload, 'assistantIds', None) or []
            
            ap = AssignmentsPayload(
                coordinatorId=coordinatorId,
                supervisorIds=supervisorIds,
                technicianIds=technicianIds,
                assistantIds=assistantIds,
            )
            
            # ✅ SALVA ATRIBUIÇÕES EM assignments.json
            assignments = _all_assignments()
            assignments[plant_id] = ap.dict()
            _save_assignments(assignments)
            
            # ✅ SINCRONIZA OS USUÁRIOS
            _sync_user_plant_links(plant_id, ap)
            
            # ✅ RETORNA COM ATRIBUIÇÕES
            return {
                **plants[i],
                "coordinatorId": coordinatorId,
                "supervisorIds": supervisorIds,
                "technicianIds": technicianIds,
                "assistantIds": assistantIds,
            }
    raise HTTPException(status_code=404, detail="Plant not found")



@router.delete("/{plant_id}")
def delete_plant(plant_id: str):
    plants = _all_plants()
    new_plants = [p for p in plants if p["id"] != plant_id]
    if len(new_plants) == len(plants):
        raise HTTPException(status_code=404, detail="Plant not found")
    _save_plants(new_plants)
    assignments = _all_assignments()
    if plant_id in assignments:
        # ✅ COM ARGUMENTOS PADRÃO
        _sync_user_plant_links(
            plant_id, 
            AssignmentsPayload(
                coordinatorId="",
                supervisorIds=[],
                technicianIds=[],
                assistantIds=[]
            )
        )
        del assignments[plant_id]
        _save_assignments(assignments)
    return {"detail": "deleted"}


@router.get("/{plant_id}/assignments", response_model=AssignmentsPayload)
def get_assignments(plant_id: str):
    if not any(p["id"] == plant_id for p in _all_plants()):
        raise HTTPException(status_code=404, detail="Plant not found")
    a = _all_assignments().get(plant_id, {})
    return AssignmentsPayload(
        coordinatorId=a.get("coordinatorId", ""),  # ← String vazia, não None
        supervisorIds=a.get("supervisorIds", []),
        technicianIds=a.get("technicianIds", []),
        assistantIds=a.get("assistantIds", []),
    )

@router.put("/{plant_id}/assignments", response_model=AssignmentsPayload)
def put_assignments(plant_id: str, payload: AssignmentsPayload):
    if not any(p["id"] == plant_id for p in _all_plants()):
        raise HTTPException(status_code=404, detail="Plant not found")
    assignments = _all_assignments()
    assignments[plant_id] = payload.dict()
    _save_assignments(assignments)
    _sync_user_plant_links(plant_id, payload)
    return payload