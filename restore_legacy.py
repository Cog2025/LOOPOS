# restore_legacy.py
import json
import sys
from pathlib import Path

# Configuração de caminhos
sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal
from app.core import models

def load_json_content(filename):
    # Tenta ler do diretório atual ou de attachments/data
    paths = [
        Path(filename),
        Path(f"attachments/data/{filename}"),
        Path(f"data/{filename}")
    ]
    
    for p in paths:
        if p.exists():
            print(f"📂 Lendo arquivo: {p.absolute()}")
            try:
                with open(p, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        return data
                    else:
                        print(f"⚠️ Arquivo {filename} está vazio ou não é uma lista válida.")
            except Exception as e:
                print(f"❌ Erro ao ler {filename}: {e}")
    
    print(f"❌ Arquivo não encontrado em nenhum local: {filename}")
    return []

def restore():
    db = SessionLocal()
    print("🚑 INICIANDO RESTAURAÇÃO FORÇADA...")

    # 1. RESTAURAR USUÁRIOS
    users_data = load_json_content("users.json")
    print(f"   Encontrados {len(users_data)} usuários no JSON.")
    
    count_u = 0
    for u in users_data:
        # Verifica existência
        existing = db.query(models.User).filter(models.User.id == u["id"]).first()
        if not existing:
            try:
                db_user = models.User(
                    id=u.get("id"),
                    name=u.get("name"),
                    username=u.get("username"),
                    role=u.get("role"),
                    plantIds=u.get("plantIds", []) or [],
                    password=u.get("password", "123456"),
                    email=u.get("email"),
                    phone=u.get("phone")
                )
                db.add(db_user)
                count_u += 1
            except Exception as e:
                print(f"   ❌ Erro ao criar usuário {u.get('name')}: {e}")
        else:
            print(f"   ℹ️ Usuário já existe: {u.get('name')}")
            
    db.commit() # Commit parcial
    print(f"✅ {count_u} Novos usuários inseridos.")

    # 2. RESTAURAR USINAS
    plants_data = load_json_content("plants.json")
    print(f"   Encontrados {len(plants_data)} usinas no JSON.")
    
    count_p = 0
    for p in plants_data:
        existing = db.query(models.Plant).filter(models.Plant.id == p["id"]).first()
        if not existing:
            try:
                db_plant = models.Plant(
                    id=p.get("id"),
                    client=p.get("client"),
                    name=p.get("name"),
                    stringCount=p.get("stringCount", 0),
                    trackerCount=p.get("trackerCount", 0),
                    subPlants=p.get("subPlants", []),
                    assets=p.get("assets", [])
                )
                db.add(db_plant)
                count_p += 1
            except Exception as e:
                print(f"   ❌ Erro ao criar usina {p.get('name')}: {e}")
        else:
            print(f"   ℹ️ Usina já existe: {p.get('name')}")

    db.commit()
    print(f"✅ {count_p} Novas usinas inseridas.")

    # 3. RESTAURAR OS (Opcional - mas recomendado já que você tem os dados)
    os_data = load_json_content("os.json")
    print(f"   Encontrados {len(os_data)} Ordens de Serviço no JSON.")
    
    count_os = 0
    for o in os_data:
        existing = db.query(models.OS).filter(models.OS.id == o["id"]).first()
        if not existing:
            try:
                db_os = models.OS(
                    id=o.get("id"),
                    title=o.get("title"),
                    description=o.get("description"),
                    status=o.get("status"),
                    priority=o.get("priority"),
                    plantId=o.get("plantId"),
                    technicianId=o.get("technicianId"),
                    supervisorId=o.get("supervisorId"),
                    startDate=o.get("startDate"),
                    activity=o.get("activity"),
                    assets=o.get("assets", []),
                    logs=o.get("logs", []),
                    imageAttachments=o.get("imageAttachments", []),
                    # Novos campos com valor padrão
                    executionTimeSeconds=0,
                    isInReview=False,
                    subtasksStatus=[]
                )
                db.add(db_os)
                count_os += 1
            except Exception as e:
                print(f"   ❌ Erro ao criar OS {o.get('id')}: {e}")

    db.commit()
    print(f"✅ {count_os} Novas OSs inseridas.")
    
    db.close()
    print("\n🎉 PROCESSO CONCLUÍDO! Tente acessar o sistema agora.")

if __name__ == "__main__":
    restore()