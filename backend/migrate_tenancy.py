import os
import sys
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core import models
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    db = SessionLocal()
    try:
        # Procurar pela empresa destino (Loop Services, senao a primeira)
        target_company = db.query(models.Company).filter(models.Company.name.ilike('%Loop Services%')).first()
        if not target_company:
            target_company = db.query(models.Company).first()
            
        if not target_company:
            print("Erro: Nenhuma empresa encontrada no banco de dados. Crie uma empresa primeiro.")
            return

        print(f"Empresa alvo para migração: {target_company.name} (ID: {target_company.id})")

        # 1. Migrar Usuários órfãos
        users = db.query(models.User).filter(models.User.company_id == None).all()
        for u in users:
            u.company_id = target_company.id
            db.add(u)
        print(f"Migrados {len(users)} usuários.")

        # 2. Migrar Usinas órfãs
        plants = db.query(models.Plant).filter(models.Plant.company_id == None).all()
        for p in plants:
            p.company_id = target_company.id
            db.add(p)
        print(f"Migrados {len(plants)} usinas.")

        # 3. Migrar Cargos órfãos
        roles = db.query(models.RolePermission).filter(models.RolePermission.company_id == None).all()
        for r in roles:
            # Verifica se já existe um cargo com esse nome nesta empresa para não violar UNIQUE
            existe = db.query(models.RolePermission).filter(
                models.RolePermission.role_name == r.role_name,
                models.RolePermission.company_id == target_company.id
            ).first()
            if existe:
                db.delete(r) # Deleta o global se já existe um local
            else:
                r.company_id = target_company.id
                db.add(r)
        print(f"Processados {len(roles)} cargos órfãos.")

        db.commit()
        print("Migração concluída com sucesso!")

    except Exception as e:
        db.rollback()
        print(f"Erro na migração: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
