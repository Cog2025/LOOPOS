# /attachments/app/routes/plants.py
from fastapi import APIRouter, HTTPException
from typing import List
from uuid import uuid4
import unicodedata
from app.core.storage import load_json, save_json
from app.core.schemas import PlantCreate, PlantUpdate, PlantOut, AssignmentsPayload

router = APIRouter(prefix="/api/plants", tags=["plants"])
_PLANTS_FILE = "plants.json"
_USERS_FILE  = "users.json"

def normalize_str(s: str) -> str:
    if not s: return ""
    return unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII').upper().strip()

def _all_plants() -> List[dict]: return load_json(_PLANTS_FILE, [])
def _save_plants(plants: List[dict]): save_json(_PLANTS_FILE, plants)
def _all_users() -> List[dict]: return load_json(_USERS_FILE, [])
def _save_users(users: List[dict]): save_json(_USERS_FILE, users)

def _get_assignments_from_users(plant_id: str) -> dict:
    users = _all_users()
    
    result = {
        "coordinatorId": "",
        "supervisorIds": [],
        "technicianIds": [],
        "assistantIds": []
    }
    
    # Debug para ver o que ele está lendo do disco
    # print(f"🔍 DEBUG LEITURA: Lendo users.json para planta {plant_id}")

    for u in users:
        user_plants = u.get("plantIds", [])
        if plant_id in user_plants:
            role = normalize_str(u.get("role", ""))
            uid = u["id"]
            
            # print(f"   ✅ Encontrado no disco: {u.get('name')} ({role})")

            if role in ["COORDINATOR", "COORDENADOR"]:
                result["coordinatorId"] = uid
            elif role in ["SUPERVISOR"]:
                result["supervisorIds"].append(uid)
            elif role in ["TECHNICIAN", "TECNICO", "TECNICO"]: 
                result["technicianIds"].append(uid)
            elif role in ["ASSISTANT", "AUXILIAR"]:
                result["assistantIds"].append(uid)
    
    return result

def _update_users_from_assignments_payload(plant_id: str, ap: AssignmentsPayload):
    users = _all_users()
    changed = False

    # Coleta todos os IDs que DEVEM estar nesta planta
    # Não importa a role, se o ID veio no payload, ele tem que estar na planta.
    ids_to_add = set()
    if ap.coordinatorId: ids_to_add.add(ap.coordinatorId)
    for uid in ap.supervisorIds: ids_to_add.add(uid)
    for uid in ap.technicianIds: ids_to_add.add(uid)
    for uid in ap.assistantIds: ids_to_add.add(uid)

    print(f"📝 DEBUG ESCRITA: Atualizando planta {plant_id}")
    print(f"   🎯 IDs que devem ter a planta: {ids_to_add}")

    for u in users:
        uid = u["id"]
        user_plants = set(u.get("plantIds", []))
        original_plants = user_plants.copy()

        if uid in ids_to_add:
            # Usuário deve ter a planta
            user_plants.add(plant_id)
        else:
            # Usuário NÃO deve ter a planta.
            # MAS CUIDADO: Só removemos se ele é de um cargo operacional.
            # Se for Admin/Operador (que vê tudo), geralmente não mexemos, 
            # mas pela lógica do seu sistema, se ele estava assignado e saiu, removemos.
            # Para segurança, vamos remover apenas se ele TIVER a planta.
            if plant_id in user_plants:
                # Verifica role para não remover planta de um Admin por engano (se for o caso)
                # Mas no seu caso, plantIds define alocação explícita, então removemos.
                user_plants.discard(plant_id)

        # Se mudou, marca para salvar
        if user_plants != original_plants:
            u["plantIds"] = list(user_plants)
            changed = True
            print(f"   🔄 Alterado user {u['name']}: {original_plants} -> {user_plants}")

    if changed:
        _save_users(users)
        print("   💾 users.json salvo com sucesso.")
    else:
        print("   ℹ️ Nenhuma alteração necessária no users.json.")

# --- ROTAS ---

@router.get("", response_model=List[PlantOut])
def list_plants():
    plants = _all_plants()
    for plant in plants:
        plant.update(_get_assignments_from_users(plant["id"]))
    return plants

@router.post("", response_model=PlantOut, status_code=201)
def create_plant(payload: PlantCreate):
    plants = _all_plants()
    plant = payload.dict(exclude={'coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds'})
    plant["id"] = str(uuid4())
    plants.append(plant)
    _save_plants(plants)
    
    ap = AssignmentsPayload(
        coordinatorId=getattr(payload, 'coordinatorId', "") or "",
        supervisorIds=getattr(payload, 'supervisorIds', []) or [],
        technicianIds=getattr(payload, 'technicianIds', []) or [],
        assistantIds=getattr(payload, 'assistantIds', []) or [],
    )
    _update_users_from_assignments_payload(plant["id"], ap)
    return {**plant, **ap.dict()}

@router.get("/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: str):
    plants = _all_plants()
    plant = next((p for p in plants if p["id"] == plant_id), None)
    if not plant: raise HTTPException(404, "Plant not found")
    return {**plant, **_get_assignments_from_users(plant_id)}

@router.put("/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, payload: PlantUpdate):
    print(f"📥 PUT RECEBIDO para planta {plant_id}")
    
    plants = _all_plants()
    updated_plant = None
    for i, p in enumerate(plants):
        if p["id"] == plant_id:
            data = payload.dict(exclude={'coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds'})
            plants[i] = {**p, **data}
            updated_plant = plants[i]
            break
    if not updated_plant: raise HTTPException(404, "Plant not found")
    _save_plants(plants)
    
    # Extrai assignments do payload
    ap = AssignmentsPayload(
        coordinatorId=getattr(payload, 'coordinatorId', "") or "",
        supervisorIds=getattr(payload, 'supervisorIds', []) or [],
        technicianIds=getattr(payload, 'technicianIds', []) or [],
        assistantIds=getattr(payload, 'assistantIds', []) or [],
    )
    
    # Atualiza usuários
    _update_users_from_assignments_payload(plant_id, ap)
    
    # Retorna estado atualizado lendo do disco recém salvo
    final_state = _get_assignments_from_users(plant_id)
    print(f"📤 PUT RETORNANDO: {final_state}")
    
    return {**updated_plant, **final_state}

@router.delete("/{plant_id}")
def delete_plant(plant_id: str):
    plants = _all_plants()
    new_plants = [p for p in plants if p["id"] != plant_id]
    if len(new_plants) == len(plants): raise HTTPException(404, "Plant not found")
    _save_plants(new_plants)
    
    # Limpa users
    _update_users_from_assignments_payload(plant_id, AssignmentsPayload())
    
    return {"detail": "deleted"}

@router.get("/{plant_id}/assignments", response_model=AssignmentsPayload)
def get_assignments(plant_id: str):
    if not any(p["id"] == plant_id for p in _all_plants()): raise HTTPException(404, "Plant not found")
    return _get_assignments_from_users(plant_id)

@router.put("/{plant_id}/assignments", response_model=AssignmentsPayload)
def put_assignments(plant_id: str, payload: AssignmentsPayload):
    if not any(p["id"] == plant_id for p in _all_plants()): raise HTTPException(404, "Plant not found")
    _update_users_from_assignments_payload(plant_id, payload)
    return payload