import os
import sys
from pathlib import Path

# Adiciona o caminho para importar os módulos do app
sys.path.append(str(Path(__file__).parent / "attachments"))

# Define os caminhos
DATA_DIR = Path("attachments/data")
DB_FILE = DATA_DIR / "loopos.db"
JSON_FILES = ["users.json", "plants.json", "os.json"]

def clean_slate():
    print("🧹 --- INICIANDO LIMPEZA ---")
    
    # 1. Verifica se os JSONs de origem existem (Segurança)
    missing_files = [f for f in JSON_FILES if not (DATA_DIR / f).exists()]
    if missing_files:
        print(f"❌ ERRO CRÍTICO: Arquivos JSON de origem não encontrados: {missing_files}")
        print("   Não posso apagar o banco se não tenho o backup JSON para restaurar!")
        return False

    print("✅ Arquivos JSON de origem encontrados (Backup seguro).")

    # 2. Apaga o banco de dados existente (SQLite)
    if DB_FILE.exists():
        try:
            os.remove(DB_FILE)
            print(f"🗑️  Banco de dados antigo removido: {DB_FILE}")
        except PermissionError:
            print("❌ ERRO: O banco de dados está em uso. Pare o servidor (uvicorn) primeiro!")
            return False
    else:
        print("ℹ️  Nenhum banco de dados antigo encontrado (Limpo).")

    return True

if __name__ == "__main__":
    # Passo 1: Limpar
    if clean_slate():
        print("\n🚀 --- INICIANDO MIGRAÇÃO ---")
        
        # Passo 2: Criar Tabela Vazia (Importando models cria as tabelas via create_all no main ou manual)
        from app.core.database import engine, Base
        from app.core import models
        
        # Força a criação das tabelas no arquivo novo
        models.Base.metadata.create_all(bind=engine)
        print("✅ Tabelas SQL criadas com sucesso.")

        # Passo 3: Rodar a migração de dados
        # Importamos a função do script anterior (certifique-se que migrate_to_sql.py existe)
        try:
            from migrate_to_sql import migrate
            migrate()
            print("\n✨ SUCESSO: Banco de dados zerado e populado com os JSONs!")
        except ImportError:
            print("❌ ERRO: Não encontrei o script 'migrate_to_sql.py'. Crie-o antes de rodar este.")
        except Exception as e:
            print(f"❌ ERRO DURANTE A MIGRAÇÃO: {e}")