import sys
import os

# Adds attachments to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine
from app.core import models

def run_seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        roles = ["Admin", "Operador", "Coordenador", "Supervisor", "Técnico", "Auxiliar", "Coordinator", "Technician", "Assistant"]
        slugs = ["os.criar", "os.editar", "os.excluir", "os.executar", "os.revisar", "os.baixar"]
        
        for role in roles:
            for slug in slugs:
                existing = db.query(models.Permission).filter(
                    models.Permission.role == role,
                    models.Permission.slug == slug
                ).first()
                if not existing:
                    # Admin/Operador/Coordenador starts with True
                    allowed = True if role in ["Admin", "Operador", "Coordenador"] else False
                    new_perm = models.Permission(role=role, slug=slug, allowed=allowed)
                    db.add(new_perm)
        db.commit()
        print("[OK] Permissions seeded successfully!")
    except Exception as e:
        print(f"[ERROR] Error seeding permissions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
