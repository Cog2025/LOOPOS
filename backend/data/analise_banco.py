import sqlite3
import pandas as pd
from datetime import datetime

# Nome do arquivo do banco atual
DB_FILE = "loopos.db"

def check_sqlite_integrity():
    print(f"🔍 Iniciando análise do banco: {DB_FILE}...\n")
    
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()
    except Exception as e:
        print(f"❌ Erro ao abrir o banco: {e}")
        return

    # Pega todas as tabelas
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    for table_name in tables:
        table = table_name[0]
        if "sqlite" in table: continue # Pula tabelas internas
        
        print(f"📋 Tabela: {table}")
        
        # Pega info das colunas
        df = pd.read_sql_query(f"SELECT * FROM {table}", conn)
        
        if df.empty:
            print("   ⚠️  Tabela vazia. Sem problemas de tipo.")
            continue

        # Analisa colunas críticas
        for col in df.columns:
            # Verifica se há nulos onde não deveria (baseado na lógica comum)
            null_count = df[col].isnull().sum()
            example = df[col].iloc[0]
            
            # Detecção simples de tipo
            dtype = df[col].dtype
            
            print(f"   - Coluna '{col}': Tipo detectado {dtype} | Nulos: {null_count}")
            
            # Alerta para datas
            if "date" in col.lower() or "created_at" in col.lower():
                try:
                    # Tenta converter uma amostra para ver se é data válida
                    if example and isinstance(example, str):
                        pd.to_datetime(example)
                except:
                    print(f"     ❌ ALERTA: Coluna '{col}' parece ter datas inválidas ou formato não ISO (Ex: {example})")

            # Alerta para Booleanos (SQLite usa 0 e 1, Postgres quer True/False)
            if "is_" in col.lower() or "has_" in col.lower():
                unique_vals = df[col].unique()
                print(f"     ℹ️  Boolean Check: Valores encontrados {unique_vals}. (0/1 será convertido automaticamente)")

        print("-" * 30)

    conn.close()
    print("\n✅ Análise concluída.")

if __name__ == "__main__":
    # Tenta instalar pandas se não tiver, apenas para o script de análise
    try:
        import pandas
        check_sqlite_integrity()
    except ImportError:
        print("Para rodar a análise detalhada, instale o pandas: pip install pandas")
        print("Mas você pode tentar rodar a migração direta se confiar nos dados.")