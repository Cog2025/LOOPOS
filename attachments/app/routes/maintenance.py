# /attachments/app/routes/maintenance.py
from fastapi import APIRouter, HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from uuid import uuid4
from app.core.database import get_db
from app.core import models
from app.core.schemas import MaintenancePlanCreate, MaintenancePlanUpdate, MaintenancePlanOut

router = APIRouter(prefix="/api/maintenance", tags=["maintenance"])

@router.get("", response_model=List[MaintenancePlanOut])
def list_plans(plantId: str = None, db: Session = Depends(get_db)):
    query = db.query(models.MaintenancePlan)
    if plantId:
        query = query.filter(models.MaintenancePlan.plantId == plantId)
    return query.all()

@router.post("", response_model=MaintenancePlanOut)
def create_plan(payload: MaintenancePlanCreate, db: Session = Depends(get_db)):
    new_plan = models.MaintenancePlan(
        id=str(uuid4()),
        **payload.dict()
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.put("/{plan_id}", response_model=MaintenancePlanOut)
def update_plan(plan_id: str, payload: MaintenancePlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(models.MaintenancePlan).filter(models.MaintenancePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    
    for key, value in payload.dict(exclude_unset=True).items():
        setattr(plan, key, value)
    
    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/{plan_id}")
def delete_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(models.MaintenancePlan).filter(models.MaintenancePlan.id == plan_id).first()
    if not plan:
        raise HTTPException(404, "Plan not found")
    
    db.delete(plan)
    db.commit()
    return {"ok": True}