# migrate_to_sql.py (Salvar na pasta LOOPOS)
import json
import sys
from pathlib import Path

# Adiciona o caminho para importar os módulos do app
sys.path.append(str(Path(__file__).parent / "attachments"))

from app.core.database import SessionLocal, engine
from app.core import models

def load_json_file(filename):
    p = Path(f"attachments/data/{filename}")
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def migrate():
    db = SessionLocal()
    
    print("🔄 Iniciando migração JSON -> SQLite...")

    # 1. Users
    users_data = load_json_file("users.json")
    for u in users_data:
        # Verifica se já existe
        if not db.query(models.User).filter_by(id=u["id"]).first():
            db_user = models.User(**u)
            db.add(db_user)
    print(f"✅ {len(users_data)} Usuários processados.")

    # 2. Plants
    plants_data = load_json_file("plants.json")
    for p in plants_data:
        # Remove campos que não existem na tabela (assignments calculados)
        clean_p = {k: v for k, v in p.items() if k not in ['coordinatorId', 'supervisorIds', 'technicianIds', 'assistantIds']}
        if not db.query(models.Plant).filter_by(id=p["id"]).first():
            db_plant = models.Plant(**clean_p)
            db.add(db_plant)
    print(f"✅ {len(plants_data)} Usinas processadas.")

    # 3. OS
    os_data = load_json_file("os.json")
    for o in os_data:
        if not db.query(models.OS).filter_by(id=o["id"]).first():
            db_os = models.OS(**o)
            db.add(db_os)
    print(f"✅ {len(os_data)} Ordens de Serviço processadas.")

    db.commit()
    db.close()
    print("🎉 Migração Concluída! Arquivo loopos.db criado em /data.")

if __name__ == "__main__":
    migrate()