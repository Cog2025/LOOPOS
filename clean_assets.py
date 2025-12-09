# clean_assets.py
import sys
from pathlib import Path
from sqlalchemy import text

# Aponta para a pasta correta do app
sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal
from app.core import models

# Lista Padrão Limpa (A que você quer manter)
STANDARD_ASSETS = [
    "Ar Condicionado", "Aterramento", "Atividades de Limpeza e Roçagem",
    "Cercamento", "Drenagem", "Estação Solarimétrica", "Frotas",
    "Inversores", "NoBreak", "Planta de Alarme e CFTV", "QGBT",
    "RSU/NCU", "Relé de Proteção", "Rotina de O&M", "SCADA",
    "Sala de Controle", "Sistema de Incêndio", "Subestação MT",
    "Terreno", "Trackers", "Transformador a seco",
    "Transformador a óleo", "Vias de acesso"
]

def clean():
    db = SessionLocal()
    print("🧹 Limpando ativos antigos das usinas...")
    
    plants = db.query(models.Plant).all()
    for plant in plants:
        # Substitui a lista atual (cheia de lixo) pela lista padrão limpa
        plant.assets = STANDARD_ASSETS
        db.add(plant)
        print(f"   ✅ Usina '{plant.name}' resetada para os ativos padrão.")
    
    db.commit()
    db.close()
    print("✨ Limpeza concluída!")

if __name__ == "__main__":
    clean()