# debug_plans.py
import sys
from pathlib import Path
from sqlalchemy import text

sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal

def debug():
    db = SessionLocal()
    print("🕵️‍♂️ INICIANDO DIAGNÓSTICO DO BANCO DE DADOS...\n")
    
    # 1. Verificar Templates (Biblioteca)
    print("--- 1. BIBLIOTECA PADRÃO (TaskTemplates) ---")
    templates = db.execute(text("SELECT count(*) FROM task_templates")).scalar()
    print(f"Total de Templates na biblioteca: {templates}")
    
    # 2. Verificar Planos da Usina (PlantMaintenancePlan)
    print("\n--- 2. PLANOS DAS USINAS (PlantMaintenancePlan) ---")
    plans = db.execute(text("SELECT plantId, count(*) FROM plant_maintenance_plans GROUP BY plantId")).fetchall()
    
    if not plans:
        print("❌ NENHUM PLANO ENCONTRADO! A tabela 'plant_maintenance_plans' está vazia.")
    else:
        for p in plans:
            print(f"Usina ID: {p[0]} | Total de Tarefas: {p[1]}")
            
            # Detalhar ativos dessa usina
            print("   -> Ativos encontrados neste plano:")
            assets = db.execute(text(f"SELECT DISTINCT asset_category FROM plant_maintenance_plans WHERE plantId = '{p[0]}'")).fetchall()
            for a in assets:
                print(f"      - '{a[0]}' (Tamanho: {len(a[0])})")

    # 3. Verificar Cadastro da Usina (Plants)
    print("\n--- 3. CADASTRO DE ATIVOS NA USINA (Plants) ---")
    plants = db.execute(text("SELECT id, name, assets FROM plants")).fetchall()
    for p in plants:
        print(f"Usina: {p[1]} (ID: {p[0]})")
        print(f"Ativos Cadastrados (JSON): {p[2]}")

    db.close()

if __name__ == "__main__":
    debug()