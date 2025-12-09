# check_db.py
import sys
from pathlib import Path
from sqlalchemy import create_engine, text

# Ajuste o caminho se necessário
DB_PATH = Path("attachments/data/loopos.db")

def check():
    if not DB_PATH.exists():
        print(f"❌ Arquivo de banco não encontrado em: {DB_PATH}")
        return

    print(f"📂 Lendo banco: {DB_PATH}")
    engine = create_engine(f"sqlite:///{DB_PATH}")
    
    try:
        with engine.connect() as conn:
            # Conta usuários
            users = conn.execute(text("SELECT count(*) FROM users")).scalar()
            print(f"👥 Usuários encontrados: {users}")
            
            # Conta usinas
            plants = conn.execute(text("SELECT count(*) FROM plants")).scalar()
            print(f"🏭 Usinas encontradas: {plants}")
            
            # Conta OS
            os = conn.execute(text("SELECT count(*) FROM os")).scalar()
            print(f"📋 OSs encontradas: {os}")
            
            # Conta Planos de Manutenção
            templates = conn.execute(text("SELECT count(*) FROM task_templates")).scalar()
            print(f"📚 Templates de Manutenção: {templates}")

            if users > 0:
                print("\n✅ O BANCO ESTÁ CHEIO E SAUDÁVEL!")
            else:
                print("\n⚠️ O arquivo existe, mas as tabelas estão vazias.")
                
    except Exception as e:
        print(f"❌ Erro ao ler o banco: {e}")

if __name__ == "__main__":
    check()