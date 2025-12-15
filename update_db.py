# update_db.py
import sqlite3
from pathlib import Path

# Caminho do banco
DB_PATH = Path("attachments/data/loopos.db")

def add_column_if_not_exists(cursor, table, column, type_def):
    try:
        print(f"🔧 Tentando adicionar '{column}' na tabela '{table}'...")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {type_def}")
        print(f"   ✅ Sucesso: Coluna '{column}' adicionada.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"   ℹ️ Aviso: Coluna '{column}' já existe. Nada a fazer.")
        else:
            print(f"   ❌ Erro: {e}")

def update_schema():
    if not DB_PATH.exists():
        print(f"❌ Banco não encontrado em: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("🚀 Iniciando atualização da estrutura do banco...")

    # 1. Adicionar campos na tabela OS
    add_column_if_not_exists(cursor, "os", "currentExecutorId", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "executionHistory", "JSON")
    
    # 2. Adicionar campos na tabela OS (Detalhes que adicionamos antes)
    add_column_if_not_exists(cursor, "os", "subPlantId", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "inverterId", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "classification1", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "classification2", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "estimatedDuration", "INTEGER DEFAULT 0")
    add_column_if_not_exists(cursor, "os", "plannedDowntime", "INTEGER DEFAULT 0")
    
    # Execução
    add_column_if_not_exists(cursor, "os", "executionStart", "VARCHAR")
    add_column_if_not_exists(cursor, "os", "executionTimeSeconds", "INTEGER DEFAULT 0")
    add_column_if_not_exists(cursor, "os", "isInReview", "BOOLEAN DEFAULT 0")
    add_column_if_not_exists(cursor, "os", "subtasksStatus", "JSON")

    conn.commit()
    conn.close()
    print("\n✨ Atualização concluída! O banco agora tem os campos novos.")

if __name__ == "__main__":
    update_schema()