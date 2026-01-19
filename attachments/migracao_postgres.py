import sqlite3
import psycopg2
from psycopg2.extras import execute_batch
import sys
import os
import json
import ast

# Adiciona o diretório atual ao path para importar seus módulos
sys.path.append(os.getcwd())

try:
    from app.core.database import engine as pg_engine, Base
    from app.core import models 
except ImportError as e:
    print("❌ Erro de importação. Certifique-se de salvar este script na pasta 'attachments'.")
    sys.exit(1)

# --- CONFIGURAÇÕES ---
SQLITE_DB = os.path.join("data", "loopos.db")

# LISTA DE CAMPOS BOOLEANOS (Para corrigir o erro "integer vs boolean")
# Adicionei todos que costumam dar problema
BOOL_COLUMNS = [
    'can_login', 'active', 'attachmentsEnabled', 'isInReview', 
    'read', 'superuser', 'system_admin', 'is_preventive', 'done'
]

def fix_json_field(val):
    if val is None: return None
    if isinstance(val, str):
        val = val.strip()
        # Se parece JSON ou Lista Python, tenta converter
        if (val.startswith('[') and val.endswith(']')) or (val.startswith('{') and val.endswith('}')):
            try:
                return json.loads(val)
            except:
                try:
                    return ast.literal_eval(val)
                except:
                    pass
    return val

def migrate():
    if not os.path.exists(SQLITE_DB):
        print(f"❌ ERRO CRÍTICO: Banco não encontrado em: {SQLITE_DB}")
        return

    print(f"🚀 Iniciando Migração EXATA (Sem mudar nomes) de: {SQLITE_DB}")

    # 1. LIMPEZA E CRIAÇÃO (SCHEMA)
    print("1️⃣  Recriando estrutura no PostgreSQL (baseado no models.py)...")
    try:
        Base.metadata.drop_all(bind=pg_engine) # Limpa tudo para garantir
        Base.metadata.create_all(bind=pg_engine)
        
        # Lista as tabelas criadas para conferência
        print("   ✅ Tabelas criadas:")
        created_tables = list(Base.metadata.tables.keys())
        print(f"      {created_tables}")
    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {e}")
        return

    # 2. CONEXÃO
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()
    
    pg_conn = pg_engine.raw_connection()
    pg_cursor = pg_conn.cursor()

    # MAPA DE MIGRAÇÃO IDENTICO (Nome -> Nome)
    # A ordem importa por causa das chaves estrangeiras (Users -> Plants -> OS)
    tables_order = [
        "users",
        "plants",
        "task_templates",
        "plant_maintenance_plans", # Nome original mantido
        "notifications",
        "os" # Nome original mantido
    ]

    for table_name in tables_order:
        print(f"\n📦 Processando tabela: {table_name}...")
        
        # Verifica se existe no Postgres
        if table_name not in created_tables:
            print(f"   ⚠️  Aviso: Tabela '{table_name}' não foi criada pelo models.py. Verifique se o nome no arquivo models.py é exatamente esse.")
            continue

        # Ler do SQLite
        try:
            sqlite_cursor.execute(f"SELECT * FROM {table_name}")
            rows = sqlite_cursor.fetchall()
        except Exception as e:
            print(f"   ⚠️  Tabela '{table_name}' não encontrada no SQLite. Pulando.")
            continue

        if not rows:
            print("   (Tabela vazia no SQLite, nada a copiar)")
            continue

        # Preparar dados
        columns = rows[0].keys()
        data_to_insert = []
        
        for row in rows:
            row_dict = dict(row)
            clean_row = []
            
            for col in columns:
                val = row_dict[col]
                
                # CORREÇÃO 1: Booleanos (O erro do can_login morre aqui)
                if col in BOOL_COLUMNS or col.startswith('is_') or col.startswith('has_'):
                    if val is not None:
                        val = bool(val) 
                
                # CORREÇÃO 2: Arrays/Listas
                if isinstance(val, str) and col in ['plantIds', 'subPlants', 'assets', 'subtasks', 'logs', 'imageAttachments', 'executionHistory']:
                     val = json.dumps(fix_json_field(val))

                # CORREÇÃO 3: Nulos
                if val == '': val = None

                clean_row.append(val)
            
            data_to_insert.append(clean_row)

        # Inserir no Postgres
        cols_str = ', '.join([f'"{c}"' for c in columns])
        vals_placeholders = ', '.join(['%s'] * len(columns))
        
        insert_query = f"INSERT INTO {table_name} ({cols_str}) VALUES ({vals_placeholders})"
        
        try:
            execute_batch(pg_cursor, insert_query, data_to_insert)
            pg_conn.commit()
            print(f"   ✅ Sucesso: {len(data_to_insert)} registros inseridos.")
        except Exception as e:
            pg_conn.rollback()
            print(f"   ❌ Erro ao inserir em '{table_name}': {e}")
            # Não para o script, tenta a próxima tabela
            continue

    # Sincronizar IDs (Auto-increment)
    print("\n🔄 Ajustando sequências de IDs...")
    for t in tables_order:
        try:
            pg_cursor.execute(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), coalesce(max(id),0) + 1, false) FROM {t};")
            pg_conn.commit()
        except:
            pass

    print("\n🎉 MIGRAÇÃO FINALIZADA.")
    sqlite_conn.close()
    pg_conn.close()

if __name__ == "__main__":
    migrate()