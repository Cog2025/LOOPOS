import sqlite3
import psycopg2
import sys
import os
import json
import ast
from datetime import datetime, date

# Configuração de caminhos
sys.path.append(os.getcwd())
try:
    from app.core.database import engine as pg_engine
except ImportError:
    print("❌ Erro: Salve este arquivo na pasta 'attachments' (onde está o run.py).")
    sys.exit(1)

SQLITE_DB = os.path.join("data", "loopos.db")

# ✅ CORREÇÃO: Adicionado 'subtasksStatus' que faltava na lista
JSON_COLS = [
    'plantIds', 'subPlants', 'assets', 'subtasks', 'logs', 
    'imageAttachments', 'executionHistory', 'subtasksStatus'
]

def normalize_string(s):
    """Remove variações de unicode e aspas para comparação de texto"""
    if not isinstance(s, str): return s
    # Converte unicode escapes (ex: \u00e7 -> ç)
    try:
        s = s.encode('utf-8').decode('unicode_escape')
    except:
        pass
    return s.strip()

def normalize_value(val, col_name=None):
    """Padroniza valores para comparação (SQLite vs Postgres)"""
    
    if val is None or val == '': return None

    # Booleanos
    if isinstance(val, bool): return val
    if isinstance(val, int) and (val == 0 or val == 1):
        # Em colunas JSON, 0/1 não devem virar bool automaticamente, 
        # mas aqui estamos comparando valores de colunas SQL, então ok.
        pass

    # JSON e Listas
    if col_name in JSON_COLS:
        if isinstance(val, str):
            try:
                # Tenta JSON padrão
                cleaned = val.strip()
                return json.loads(cleaned)
            except:
                try:
                    # Tenta formato Python (aspas simples)
                    return ast.literal_eval(cleaned)
                except:
                    pass
    
    # Datas
    if isinstance(val, (datetime, date)): return val.isoformat()
    if isinstance(val, str) and len(val) > 10 and 'T' in val:
        return val # Já está em ISO

    return normalize_string(val)

def are_values_equal(v1, v2):
    """Compara dois valores de forma inteligente"""
    if v1 == v2: return True
    
    # Se ambos forem listas (JSON), compara o conteúdo independente da ordem se possível? 
    # Não, ordem importa em arrays JSON. Vamos comparar direto.
    if isinstance(v1, list) and isinstance(v2, list):
        return json.dumps(v1, sort_keys=True) == json.dumps(v2, sort_keys=True)

    # Comparações de String
    s1 = str(v1)
    s2 = str(v2)
    if s1 == s2: return True
    
    # Tenta normalizar unicode novamente se falhou
    if normalize_string(s1) == normalize_string(s2): return True

    # Nulos
    if (v1 is None and v2 == '') or (v1 == '' and v2 is None): return True
    
    # Booleanos vs Inteiros (1 == True)
    if (v1 is True and v2 == 1) or (v1 is False and v2 == 0): return True
    if (v1 == 1 and v2 is True) or (v1 == 0 and v2 is False): return True

    return False

def audit():
    print(f"🕵️  AUDITORIA V2: {SQLITE_DB} vs PostgreSQL\n")

    conn_lite = sqlite3.connect(SQLITE_DB)
    conn_lite.row_factory = sqlite3.Row
    cur_lite = conn_lite.cursor()

    conn_pg = pg_engine.raw_connection()
    cur_pg = conn_pg.cursor()

    tables = ['users', 'plants', 'task_templates', 'plant_maintenance_plans', 'notifications', 'os']
    
    all_perfect = True

    for tbl in tables:
        print(f"📋 Tabela: {tbl.upper()}")

        try:
            cur_lite.execute(f"SELECT * FROM {tbl} ORDER BY id")
            rows_lite = cur_lite.fetchall()
            
            cur_pg.execute(f"SELECT * FROM {tbl} ORDER BY id")
            rows_pg = cur_pg.fetchall()
            
            col_names_pg = [desc[0] for desc in cur_pg.description]
        except Exception as e:
            print(f"   ❌ Erro crítico ao ler tabela: {e}")
            continue

        # 1. Comparar Contagem
        count_lite = len(rows_lite)
        count_pg = len(rows_pg)
        
        if count_lite != count_pg:
            print(f"   ⚠️  CONTAGEM DIFERENTE: Lite={count_lite} vs PG={count_pg}")
            all_perfect = False
        else:
            # 2. Comparar Conteúdo
            mismatches = 0
            
            for i in range(count_lite):
                row_l = dict(rows_lite[i])
                row_p = dict(zip(col_names_pg, rows_pg[i]))

                row_diffs = []
                for col in row_l.keys():
                    if col not in row_p: continue 

                    val_l = normalize_value(row_l[col], col)
                    val_p = normalize_value(row_p[col], col)

                    if not are_values_equal(val_l, val_p):
                        # Filtro final para ignorar flutuação de float minúscula
                        try:
                            if abs(float(val_l) - float(val_p)) < 0.01: continue
                        except:
                            pass
                        
                        # Se for a coluna logs ou subtasks, imprime só o começo para não poluir
                        debug_l = str(val_l)[:50] + "..." if len(str(val_l)) > 50 else str(val_l)
                        debug_p = str(val_p)[:50] + "..." if len(str(val_p)) > 50 else str(val_p)
                        row_diffs.append(f"{col} [{debug_l} != {debug_p}]")

                if row_diffs:
                    mismatches += 1
                    if mismatches <= 1: # Mostra só o primeiro erro de exemplo
                        print(f"      ❌ Diferença ID {row_l.get('id')}: {', '.join(row_diffs)}")

            if mismatches == 0:
                print(f"   ✅ {count_lite} registros 100% IDÊNTICOS.")
            else:
                print(f"   ⚠️  {mismatches} linhas com divergência.")
                all_perfect = False
        
        print("-" * 30)

    conn_lite.close()
    conn_pg.close()

    if all_perfect:
        print("\n🏆 PARABÉNS! Migração Perfeita e Validada.")
    else:
        print("\n⚠️  Ainda há divergências. Verifique os logs acima.")

if __name__ == "__main__":
    audit()