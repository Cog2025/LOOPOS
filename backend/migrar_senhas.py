import sys
import os

# Adiciona o diretório attachments ao path para os imports absolutos (como app.core...) funcionarem
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.core import models
from app.core.security import hash_password

def migrar():
    print("🚀 Iniciando migração de senhas para bcrypt...")
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        updated_count = 0
        skipped_count = 0
        
        for user in users:
            if not user.password:
                continue
            
            # Se a senha não começar com $2 (como $2b$, $2y$, etc), significa que ainda não é bcrypt
            if not user.password.startswith("$2"):
                print(f"Atualizando senha para o usuário: {user.username}")
                # O bcrypt suporta no máximo 72 bytes, truncamos para evitar erro
                senha_truncada = user.password[:72]
                user.password = hash_password(senha_truncada)
                updated_count += 1
            else:
                skipped_count += 1
                
        if updated_count > 0:
            db.commit()
            print(f"✅ Sucesso! {updated_count} senhas atualizadas.")
        else:
            print("✅ Nenhuma senha precisou ser atualizada.")
            
        print(f"ℹ️ {skipped_count} usuários já possuíam senhas com hash e foram ignorados.")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro durante a migração: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrar()
