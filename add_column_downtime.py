# Arquivo: LOOPOS/add_column_downtime.py
import sqlite3
from pathlib import Path

# Caminho do banco de dados
DB_PATH = Path("attachments/data/loopos.db")

def fix_database():
    if not DB_PATH.exists():
        print(f"❌ Banco de dados não encontrado em: {DB_PATH}")
        return

    print(f"🔧 Conectando ao banco de dados...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Tabelas que precisam da nova coluna
    tables_to_fix = ["task_templates", "plant_maintenance_plans"]

    for table in tables_to_fix:
        try:
            print(f"   ➡ Tentando adicionar 'planned_downtime_minutes' na tabela '{table}'...")
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN planned_downtime_minutes INTEGER DEFAULT 0")
            print(f"   ✅ Sucesso: Coluna criada em '{table}'.")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"   ℹ️  Aviso: A coluna já existia em '{table}'. Tudo certo.")
            else:
                print(f"   ❌ Erro ao alterar '{table}': {e}")

    conn.commit()
    conn.close()
    print("\n✨ Atualização do banco concluída!")

if __name__ == "__main__":
    fix_database()