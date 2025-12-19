# File: attachments/app/routes/maintenance.py
from fastapi import APIRouter, HTTPException, Depends, Body, Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from uuid import uuid4
from app.core.database import get_db
from app.core import models
from app.core.schemas import TaskTemplateCreate, TaskTemplateOut

router = APIRouter(tags=["maintenance"])

# --- HELPER DE SEGURANÇA ---
def verify_write_permission(user_id: str, db: Session):
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário não identificado.")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado.")
    
    # 🚫 BLOQUEIO TOTAL PARA CLIENTES
    if user.role == "Cliente":
        raise HTTPException(
            status_code=403, 
            detail="Acesso Negado: Clientes têm permissão apenas para visualização e download."
        )
    return user

# --- ROTAS DA BIBLIOTECA PADRÃO (TaskTemplates) ---

@router.get("/templates", response_model=List[TaskTemplateOut])
def list_templates(asset_category: Optional[str] = None, db: Session = Depends(get_db)):
    # Leitura permitida para todos
    query = db.query(models.TaskTemplate)
    if asset_category:
        query = query.filter(models.TaskTemplate.asset_category == asset_category)
    return query.all()

@router.post("/templates", response_model=TaskTemplateOut)
def create_template(
    payload: TaskTemplateCreate, 
    x_user_id: str = Header(...), 
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)
    
    new_tmpl = models.TaskTemplate(id=str(uuid4()), **payload.dict())
    db.add(new_tmpl)
    db.commit()
    db.refresh(new_tmpl)
    return new_tmpl

@router.put("/templates/{template_id}")
def update_template(
    template_id: str, 
    payload: dict = Body(...), 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    tmpl = db.query(models.TaskTemplate).filter(models.TaskTemplate.id == template_id).first()
    if not tmpl: raise HTTPException(404, "Template not found")
    
    for k, v in payload.items():
        if hasattr(tmpl, k): setattr(tmpl, k, v)
        
    db.commit()
    db.refresh(tmpl)
    return tmpl

@router.delete("/templates/{template_id}")
def delete_template(
    template_id: str, 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    tmpl = db.query(models.TaskTemplate).filter(models.TaskTemplate.id == template_id).first()
    if not tmpl: raise HTTPException(404, "Template not found")
    db.delete(tmpl)
    db.commit()
    return {"ok": True}

# --- ROTAS DOS PLANOS DAS USINAS (PlantMaintenancePlan) ---
# ✅ CORREÇÃO: Mudado de "/plans" para "/plant-plans" para bater com o Frontend

@router.get("/plant-plans/{plant_id}")
def get_plant_plan(plant_id: str, db: Session = Depends(get_db)):
    # Busca tarefas ativas (True ou 1)
    return db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == plant_id,
        or_(
            models.PlantMaintenancePlan.active.is_(True),
            models.PlantMaintenancePlan.active == 1
        )
    ).all()

@router.post("/plant-plans/{plant_id}/init")
def initialize_plan_from_library(
    plant_id: str, 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    # Limpa anterior
    db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.plantId == plant_id).delete()
    
    templates = db.query(models.TaskTemplate).all()
    count = 0
    for t in templates:
        new_task = models.PlantMaintenancePlan(
            id=str(uuid4()),
            plantId=plant_id,
            asset_category=t.asset_category,
            title=t.title,
            task_type=t.task_type,
            criticality=t.criticality,
            classification1=t.classification1,
            classification2=t.classification2,
            estimated_duration_minutes=t.estimated_duration_minutes,
            frequency_days=t.frequency_days,
            subtasks=t.subtasks,
            active=True
        )
        db.add(new_task)
        count += 1
    
    # Atualiza lista de ativos da usina
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if plant:
        assets = set([t.asset_category for t in templates])
        plant.assets = sorted(list(assets))
        db.add(plant)

    db.commit()
    return {"created": count}

# Atenção: Frontend chama PUT /plant-plans/{id}
@router.put("/plant-plans/{task_id}")
def update_plant_task(
    task_id: str, 
    payload: dict = Body(...), 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    task = db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.id == task_id).first()
    if not task: raise HTTPException(404, "Task not found")
    
    for k, v in payload.items():
        if hasattr(task, k): setattr(task, k, v)
        
    db.commit()
    return task

@router.post("/plant-plans/{plant_id}")
def add_plant_task(
    plant_id: str, 
    payload: dict = Body(...), 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    category = payload.get("asset_category", "Geral")
    
    new_task = models.PlantMaintenancePlan(
        id=str(uuid4()),
        plantId=plant_id,
        asset_category=category,
        title=payload.get("title", "Nova Tarefa"),
        task_type=payload.get("task_type", "Preventiva"),
        criticality=payload.get("criticality", "Médio"),
        frequency_days=payload.get("frequency_days", 30),
        estimated_duration_minutes=payload.get("estimated_duration_minutes", 0),
        classification1=payload.get("classification1", ""),
        classification2=payload.get("classification2", ""),
        subtasks=payload.get("subtasks", []),
        active=True
    )
    db.add(new_task)
    
    # Atualiza ativos da usina se for um ativo novo
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if plant:
        current = set(plant.assets or [])
        if category not in current:
            current.add(category)
            plant.assets = sorted(list(current))
            db.add(plant)
            
    db.commit()
    db.refresh(new_task)
    return new_task

@router.delete("/plant-plans/{task_id}")
def delete_plant_task(
    task_id: str, 
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    verify_write_permission(x_user_id, db)

    task = db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.id == task_id).first()
    if not task: raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()
    return {"ok": True}