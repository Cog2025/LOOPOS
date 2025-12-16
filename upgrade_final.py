# Arquivo: LOOPOS/upgrade_final.py
import sqlite3
from pathlib import Path

# Caminho exato do banco
DB_PATH = Path("attachments/data/loopos.db")

def upgrade_database():
    if not DB_PATH.exists():
        print(f"❌ Erro: Banco de dados não encontrado em {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print(f"🚀 Atualizando Banco de Dados...")

    # 1. Adicionar coluna 'assistantId' na tabela 'os'
    try:
        cursor.execute("ALTER TABLE os ADD COLUMN assistantId VARCHAR")
        print("✅ Coluna 'assistantId' adicionada na tabela OS.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("ℹ️  Coluna 'assistantId' já existia.")
        else:
            print(f"❌ Erro ao adicionar assistantId: {e}")

    # 2. Criar a tabela 'notifications'
    try:
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id VARCHAR PRIMARY KEY,
            userId VARCHAR NOT NULL,
            message VARCHAR NOT NULL,
            read BOOLEAN DEFAULT 0,
            timestamp VARCHAR
        )
        """)
        print("✅ Tabela 'notifications' verificada/criada.")
    except Exception as e:
        print(f"❌ Erro ao criar tabela notifications: {e}")

    conn.commit()
    conn.close()
    print("\n✨ Banco de dados pronto! Pode iniciar o servidor.")

if __name__ == "__main__":
    upgrade_database()