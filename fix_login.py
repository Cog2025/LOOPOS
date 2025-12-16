# Arquivo: LOOPOS/fix_login.py
import sqlite3
from pathlib import Path

# Caminho exato do banco
DB_PATH = Path("attachments/data/loopos.db")

def fix_users_table():
    if not DB_PATH.exists():
        print(f"❌ Erro: Banco não encontrado em {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print(f"🚀 Corrigindo tabela de Usuários em: {DB_PATH.name}...")

    # Adicionar coluna 'assistantId' na tabela 'users' para parar o erro de login
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN assistantId VARCHAR")
        print("✅ Sucesso: Coluna 'assistantId' adicionada na tabela 'users'.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("ℹ️  Aviso: A coluna 'assistantId' já existia na tabela 'users'.")
        else:
            print(f"❌ Erro SQL: {e}")

    conn.commit()
    conn.close()
    print("\n✨ Correção concluída! Tente fazer login novamente.")

if __name__ == "__main__":
    fix_users_table()