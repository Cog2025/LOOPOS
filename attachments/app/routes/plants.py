# /attachments/app/routes/plants.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from uuid import uuid4
import unicodedata
from app.core.database import get_db
from app.core import models
from app.core.schemas import PlantCreate, PlantUpdate, PlantOut, AssignmentsPayload

router = APIRouter(tags=["plants"])

def normalize_str(s: str) -> str:
    if not s: return ""
    return unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII').upper().strip()

def _get_assignments_from_users(db: Session, plant_id: str) -> dict:
    # SQL: Busca todos os usuários
    users = db.query(models.User).all()
    
    result = {
        "coordinatorId": "",
        "supervisorIds": [],
        "technicianIds": [],
        "assistantIds": []
    }
    
    for u in users:
        # No SQL, plantIds já vem como lista graças ao tipo JSON do SQLAlchemy
        user_plants = u.plantIds or []
        
        if plant_id in user_plants:
            role = normalize_str(u.role)
            uid = u.id
            
            if role in ["COORDINATOR", "COORDENADOR"]:
                result["coordinatorId"] = uid
            elif role in ["SUPERVISOR"]:
                result["supervisorIds"].append(uid)
            elif role in ["TECHNICIAN", "TECNICO", "TECNICO"]: 
                result["technicianIds"].append(uid)
            elif role in ["ASSISTANT", "AUXILIAR"]:
                result["assistantIds"].append(uid)
    
    return result

def _update_users_from_assignments_payload(db: Session, plant_id: str, ap: AssignmentsPayload):
    users = db.query(models.User).all()
    changed = False

    # Coleta todos os IDs que DEVEM estar nesta planta
    ids_to_add = set()
    if ap.coordinatorId: ids_to_add.add(ap.coordinatorId)
    for uid in ap.supervisorIds: ids_to_add.add(uid)
    for uid in ap.technicianIds: ids_to_add.add(uid)
    for uid in ap.assistantIds: ids_to_add.add(uid)

    print(f"📝 [SQL] Atualizando usuários para planta {plant_id}")

    for u in users:
        uid = u.id
        # Copia a lista para um set para manipulação
        user_plants = set(u.plantIds or [])
        original_plants = user_plants.copy()

        if uid in ids_to_add:
            user_plants.add(plant_id)
        else:
            if plant_id in user_plants:
                user_plants.discard(plant_id)

        if user_plants != original_plants:
            # Importante: No SQLAlchemy, para atualizar JSON, é bom reatribuir a lista
            u.plantIds = list(user_plants)
            # Marcamos o objeto como "sujo" para garantir o update, embora o SQLAlchemy geralmente detecte
            db.add(u)
            changed = True
            print(f"   🔄 SQL Alterado user {u.name}")

    if changed:
        db.commit()

# --- ROTAS ---

@router.get("", response_model=List[PlantOut])
def list_plants(db: Session = Depends(get_db)):
    plants = db.query(models.Plant).all()
    # Convertemos para dicionário para poder injetar os assignments calculados
    results = []
    for p in plants:
        # Pydantic from_attributes converte o model SQL para dict se usarmos __dict__ ou similar,
        # mas aqui precisamos injetar campos extras.
        # Vamos criar um dict base e adicionar os assignments.
        p_dict = {c.name: getattr(p, c.name) for c in p.__table__.columns}
        assigns = _get_assignments_from_users(db, p.id)
        results.append({**p_dict, **assigns})
        
    return results

@router.post("", response_model=PlantOut, status_code=201)
def create_plant(payload: PlantCreate, db: Session = Depends(get_db)):
    # Separa dados da planta dos assignments
    plant_data = payload.dict(exclude={'coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds'})
    
    new_plant = models.Plant(
        id=str(uuid4()),
        **plant_data
    )
    db.add(new_plant)
    db.commit()
    db.refresh(new_plant)
    
    # Assignments
    ap = AssignmentsPayload(
        coordinatorId=payload.coordinatorId,
        supervisorIds=payload.supervisorIds,
        technicianIds=payload.technicianIds,
        assistantIds=payload.assistantIds,
    )
    _update_users_from_assignments_payload(db, new_plant.id, ap)
    
    # Monta resposta
    p_dict = {c.name: getattr(new_plant, c.name) for c in new_plant.__table__.columns}
    return {**p_dict, **ap.dict()}

@router.get("/{plant_id}", response_model=PlantOut)
def get_plant(plant_id: str, db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    p_dict = {c.name: getattr(plant, c.name) for c in plant.__table__.columns}
    assigns = _get_assignments_from_users(db, plant_id)
    return {**p_dict, **assigns}

@router.put("/{plant_id}", response_model=PlantOut)
def update_plant(plant_id: str, payload: PlantUpdate, db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Atualiza dados da planta
    update_data = payload.dict(exclude={'coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds'}, exclude_unset=True)
    for key, value in update_data.items():
        setattr(plant, key, value)
    
    db.commit()
    db.refresh(plant)
    
    # Atualiza usuários (Assignments)
    ap = AssignmentsPayload(
        coordinatorId=payload.coordinatorId,
        supervisorIds=payload.supervisorIds,
        technicianIds=payload.technicianIds,
        assistantIds=payload.assistantIds,
    )
    _update_users_from_assignments_payload(db, plant_id, ap)
    
    p_dict = {c.name: getattr(plant, c.name) for c in plant.__table__.columns}
    assigns = _get_assignments_from_users(db, plant_id)
    return {**p_dict, **assigns}

@router.delete("/{plant_id}")
def delete_plant(plant_id: str, db: Session = Depends(get_db)):
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    db.delete(plant)
    
    # Limpa referências nos usuários
    _update_users_from_assignments_payload(db, plant_id, AssignmentsPayload())
    
    db.commit()
    return {"detail": "deleted"}

@router.get("/{plant_id}/assignments", response_model=AssignmentsPayload)
def get_assignments(plant_id: str, db: Session = Depends(get_db)):
    # Verifica se planta existe
    if not db.query(models.Plant).filter(models.Plant.id == plant_id).first():
        raise HTTPException(status_code=404, detail="Plant not found")
    return _get_assignments_from_users(db, plant_id)

@router.put("/{plant_id}/assignments", response_model=AssignmentsPayload)
def put_assignments(plant_id: str, payload: AssignmentsPayload, db: Session = Depends(get_db)):
    if not db.query(models.Plant).filter(models.Plant.id == plant_id).first():
        raise HTTPException(status_code=404, detail="Plant not found")
    _update_users_from_assignments_payload(db, plant_id, payload)
    return payload