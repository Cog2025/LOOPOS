# File: attachments/app/routes/maintenance.py
from fastapi import APIRouter, HTTPException, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import uuid4
from app.core.database import get_db
from app.core import models
from app.core.schemas import TaskTemplateCreate, TaskTemplateOut

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])

# ... (ROTAS DE TEMPLATES MANTIDAS IGUAIS) ...
@router.get("/templates", response_model=List[TaskTemplateOut])
def list_templates(asset_category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.TaskTemplate)
    if asset_category:
        query = query.filter(models.TaskTemplate.asset_category == asset_category)
    return query.all()

@router.post("/templates", response_model=TaskTemplateOut)
def create_template(payload: TaskTemplateCreate, db: Session = Depends(get_db)):
    new_tmpl = models.TaskTemplate(id=str(uuid4()), **payload.dict())
    db.add(new_tmpl)
    db.commit()
    db.refresh(new_tmpl)
    return new_tmpl

@router.put("/templates/{template_id}")
def update_template(template_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    tmpl = db.query(models.TaskTemplate).filter(models.TaskTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template não encontrado")
    for key, value in payload.items():
        if hasattr(tmpl, key):
            setattr(tmpl, key, value)
    db.commit()
    db.refresh(tmpl)
    return tmpl

@router.delete("/templates/{template_id}")
def delete_template(template_id: str, db: Session = Depends(get_db)):
    tmpl = db.query(models.TaskTemplate).filter(models.TaskTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(404, "Template não encontrado")
    db.delete(tmpl)
    db.commit()
    return {"ok": True}

# --- PLANOS DA USINA (LÓGICA CUSTOMIZADA) ---

@router.get("/plant-plans/{plant_id}")
def list_plant_plans(plant_id: str, db: Session = Depends(get_db)):
    plans = db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == plant_id,
        models.PlantMaintenancePlan.active == True
    ).all()
    return plans

@router.post("/plans/{plant_id}/initialize")
def initialize_plant_plan(plant_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    # Mode pode ser: STANDARD (reset), CUSTOM (preserva), CUSTOM_LIST (usa lista enviada)
    mode = payload.get("mode", "STANDARD") 
    custom_tasks_payload = payload.get("custom_tasks", [])

    # 1. Recupera Usina e seus Ativos atuais (Jardinagem, etc.)
    plant = db.query(models.Plant).filter(models.Plant.id == plant_id).first()
    if not plant:
        raise HTTPException(404, "Usina não encontrada")
    
    current_plant_assets = set(plant.assets or [])
    
    # 2. Lógica de Limpeza
    if mode == "STANDARD":
        # Apaga tudo (Reset total)
        db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.plantId == plant_id).delete()
    
    # Nota: No modo CUSTOM_LIST, não deletamos cegamente tudo antes de inserir, 
    # mas o ideal seria sincronizar. Para simplificar e garantir segurança, vamos assumir
    # que o usuário quer ADICIONAR/ATUALIZAR a lista enviada.
    # Se quiser substituir o plano todo pela lista nova, descomente a linha abaixo:
    # if mode == "CUSTOM_LIST": db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.plantId == plant_id).delete()

    # 3. Define a Fonte das Tarefas
    source_tasks = []
    if mode == "CUSTOM_LIST" and custom_tasks_payload:
        source_tasks = custom_tasks_payload # Usa a lista editada no Wizard
    else:
        source_tasks = db.query(models.TaskTemplate).all() # Usa o padrão do banco

    # 4. Processa e Cria Tarefas
    count = 0
    new_assets = set()
    
    for t in source_tasks:
        # Normaliza dados (pode vir de dict ou objeto SQL)
        is_dict = isinstance(t, dict)
        
        # Pega valores com fallback seguro
        category = (t.get("asset_category") if is_dict else t.asset_category) or "Geral"
        title = (t.get("title") if is_dict else t.title) or "Nova Tarefa"
        
        # Cria nova tarefa vinculada à usina
        new_plan = models.PlantMaintenancePlan(
            id=str(uuid4()),
            plantId=plant_id,
            asset_category=category.strip(),
            title=title.strip(),
            task_type=(t.get("task_type") if is_dict else t.task_type),
            criticality=(t.get("criticality") if is_dict else t.criticality),
            classification1=(t.get("classification1") if is_dict else t.classification1),
            classification2=(t.get("classification2") if is_dict else t.classification2),
            estimated_duration_minutes=(t.get("estimated_duration_minutes") if is_dict else t.estimated_duration_minutes),
            frequency_days=(t.get("frequency_days") if is_dict else t.frequency_days),
            subtasks=(t.get("subtasks") if is_dict else t.subtasks) or [],
            active=True
        )
        db.add(new_plan)
        new_assets.add(category.strip())
        count += 1
    
    # 5. Atualiza Ativos da Usina (Merge Seguro)
    # Une o que já existia (Jardinagem) com o que veio na nova lista (Inversores, etc)
    final_assets = current_plant_assets.union(new_assets)
    plant.assets = sorted(list(final_assets))
    db.add(plant)

    db.commit()
    return {"message": f"{count} tarefas processadas com sucesso."}

@router.put("/plans/{task_id}")
def update_plant_task(task_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
    task = db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    
    fields = ['title', 'subtasks', 'frequency_days', 'criticality', 'active', 'task_type', 
              'estimated_duration_minutes', 'classification1', 'classification2']
    for key in fields:
        if key in payload:
            setattr(task, key, payload[key])
            
    db.commit()
    db.refresh(task)
    return task

@router.post("/plans/{plant_id}/task")
def add_custom_task(plant_id: str, payload: dict = Body(...), db: Session = Depends(get_db)):
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

@router.delete("/plans/{task_id}")
def delete_plant_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(models.PlantMaintenancePlan).filter(models.PlantMaintenancePlan.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    db.delete(task)
    db.commit()
    return {"ok": True}