import sys
from pathlib import Path
from sqlalchemy import func

# Configura o caminho para encontrar os módulos do seu projeto
# Ajuste "attachments" se sua estrutura de pastas for diferente
sys.path.append(str(Path(__file__).parent / "attachments")) 

from app.core.database import SessionLocal
from app.core.models import TaskTemplate, PlantMaintenancePlan, Plant

def print_header(title):
    print("\n" + "="*60)
    print(f"📊 {title}")
    print("="*60)

def check_stats():
    db = SessionLocal()
    
    try:
        # --- 1. BIBLIOTECA PADRÃO ---
        print_header("BIBLIOTECA PADRÃO (LOOP)")
        
        # Contagem total
        total_std = db.query(TaskTemplate).count()
        print(f"Total Geral de Tarefas Modelo: {total_std}")
        
        # Agrupado por Ativo
        std_by_asset = db.query(
            TaskTemplate.asset_category, 
            func.count(TaskTemplate.id)
        ).group_by(TaskTemplate.asset_category).all()
        
        print(f"Quantidade de Ativos (Grupos): {len(std_by_asset)}")
        print("-" * 40)
        print(f"{'ATIVO / CATEGORIA':<40} | {'QTD TAREFAS'}")
        print("-" * 40)
        
        for asset, count in sorted(std_by_asset, key=lambda x: x[0]):
            print(f"{asset:<40} | {count}")
            
        # --- 2. PLANOS POR USINA ---
        print_header("PLANOS DE MANUTENÇÃO POR USINA")
        
        # Busca IDs distintos de usinas que têm planos
        plant_ids_with_plans = db.query(PlantMaintenancePlan.plantId).distinct().all()
        plant_ids = [p[0] for p in plant_ids_with_plans]
        
        if not plant_ids:
            print("❌ Nenhum plano de usina encontrado (apenas Biblioteca).")
        else:
            for plant_id in plant_ids:
                # Pega nome da usina
                plant = db.query(Plant).filter(Plant.id == plant_id).first()
                plant_name = plant.name if plant else f"ID: {plant_id}"
                
                # Conta tarefas dessa usina
                total_plant_tasks = db.query(PlantMaintenancePlan).filter(
                    PlantMaintenancePlan.plantId == plant_id
                ).count()
                
                print(f"\n🏭 USINA: {plant_name}")
                print(f"   Total de Tarefas: {total_plant_tasks}")
                
                # Agrupa por ativo dentro da usina
                plant_assets = db.query(
                    PlantMaintenancePlan.asset_category,
                    func.count(PlantMaintenancePlan.id)
                ).filter(
                    PlantMaintenancePlan.plantId == plant_id
                ).group_by(PlantMaintenancePlan.asset_category).all()
                
                for asset, count in sorted(plant_assets, key=lambda x: x[0]):
                    print(f"     • {asset}: {count}")

    except Exception as e:
        print(f"Erro ao executar script: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_stats()