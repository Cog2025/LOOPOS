# debug_orm.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal
from app.core import models

# ID da Usina Bom Jesus (peguei do seu log anterior)
PLANT_ID = "1e882824-bebf-46ae-bf59-d42d08b9fd09"

def check():
    db = SessionLocal()
    print(f"🕵️ Testando consulta ORM para a usina: {PLANT_ID}")

    # 1. Busca SEM filtro de 'active'
    total = db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == PLANT_ID
    ).count()
    print(f"📚 Total bruto (sem filtro active): {total}")

    # 2. Busca COM filtro de 'active == True' (Jeito que está na API)
    active_true = db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == PLANT_ID,
        models.PlantMaintenancePlan.active == True
    ).count()
    print(f"✅ Filtro (active == True): {active_true}")

    # 3. Busca COM filtro de 'active' (Genérico)
    active_generic = db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == PLANT_ID,
        models.PlantMaintenancePlan.active
    ).count()
    print(f"✅ Filtro (active genérico): {active_generic}")

    # 4. Inspecionar um item
    item = db.query(models.PlantMaintenancePlan).filter(
        models.PlantMaintenancePlan.plantId == PLANT_ID
    ).first()
    if item:
        print(f"\n🔎 Exemplo de tarefa: '{item.title}'")
        print(f"   Valor da coluna 'active': {item.active} (Tipo: {type(item.active)})")
    
    db.close()

if __name__ == "__main__":
    check()