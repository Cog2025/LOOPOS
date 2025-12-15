# fix_plans.py
import sqlite3
from pathlib import Path

# Caminho do banco de dados
DB_PATH = Path("attachments/data/loopos.db")

def fix_plans():
    if not DB_PATH.exists():
        print(f"❌ Banco não encontrado em: {DB_PATH}")
        return

    print(f"🔧 Conectando ao banco: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Verifica se a coluna 'active' existe, se não, cria.
        try:
            cursor.execute("SELECT active FROM plant_maintenance_plans LIMIT 1")
        except sqlite3.OperationalError:
            print("⚠️ Coluna 'active' não encontrada. Adicionando...")
            cursor.execute("ALTER TABLE plant_maintenance_plans ADD COLUMN active BOOLEAN DEFAULT 1")
            print("✅ Coluna 'active' criada.")

        # 2. Verifica quantos planos estão 'invisíveis' (NULL ou 0)
        cursor.execute("SELECT count(*) FROM plant_maintenance_plans WHERE active IS NULL OR active = 0")
        count = cursor.fetchone()[0]
        print(f"🔍 Encontradas {count} tarefas de manutenção inativas ou sem status.")

        # 3. Força todos a ficarem ATIVOS
        if count > 0:
            print("🚀 Ativando todas as tarefas...")
            cursor.execute("UPDATE plant_maintenance_plans SET active = 1 WHERE active IS NULL OR active = 0")
            conn.commit()
            print(f"✨ Sucesso! {count} tarefas foram recuperadas e ativadas.")
        else:
            # Caso preventivo: garante que tudo seja 1 mesmo que o count tenha dado zero por algum motivo de tipo
            cursor.execute("UPDATE plant_maintenance_plans SET active = 1")
            conn.commit()
            print("✅ Todas as tarefas já estavam ativas (ou banco forçado para garantir).")

    except Exception as e:
        print(f"❌ Erro ao corrigir planos: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_plans()