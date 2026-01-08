import sys
import os
import sqlite3
from pathlib import Path

# --- CONFIGURAÇÃO ---
DB_PATH = Path("attachments/data/loopos.db")
TXT_PATH_1 = Path("Plano de tarefas.txt")
TXT_PATH_2 = Path("attachments/Plano de tarefas.txt")

def normalize_criticality(raw_text):
    """
    Converte o texto do arquivo para o padrão do Banco de Dados.
    """
    t = raw_text.strip().upper()
    
    if "MUITO ALTO" in t:
        return "Urgente"
    elif "ALTO" in t or "ALTA" in t:
        return "Alta"
    elif "MÉDIO" in t or "MEDIO" in t or "MÉDIA" in t:
        return "Média"
    elif "BAIXO" in t or "BAIXA" in t:
        return "Baixa"
    
    return "Média"

def parse_custom_format(file_path):
    task_map = {}
    print(f"📖 Lendo arquivo estruturado: {file_path}...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except UnicodeDecodeError:
        print("⚠️ Encoding UTF-8 falhou, tentando Latin-1...")
        with open(file_path, 'r', encoding='latin-1') as f:
            lines = f.readlines()

    current_task_name = None

    for line in lines:
        line = line.strip()
        
        if line.upper().startswith("TAREFA:"):
            current_task_name = line.split(":", 1)[1].strip()
        
        elif line.upper().startswith("CRITICIDADE:") and current_task_name:
            raw_val = line.split(":", 1)[1].strip()
            final_crit = normalize_criticality(raw_val)
            task_map[current_task_name] = final_crit
            current_task_name = None 

    return task_map

def update_database(task_map):
    if not DB_PATH.exists():
        print(f"❌ Erro: Banco de dados não encontrado em {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"\n🔧 Iniciando atualização no Banco de Dados...")
    updates_count = 0
    
    # --- CORREÇÃO AQUI ---
    # Biblioteca e Planos usam 'criticality'
    sql_library = "UPDATE task_templates SET criticality = ? WHERE title = ?"
    sql_plans = "UPDATE plant_maintenance_plans SET criticality = ? WHERE title = ?"
    
    # A Tabela OS usa 'priority'
    sql_os = "UPDATE os SET priority = ? WHERE title LIKE ?" 

    for task, crit in task_map.items():
        # 1. Atualiza Biblioteca
        cursor.execute(sql_library, (crit, task))
        c1 = cursor.rowcount
        
        # 2. Atualiza Planos das Usinas
        cursor.execute(sql_plans, (crit, task))
        c2 = cursor.rowcount

        # 3. Atualiza OS (Alterado para usar 'priority')
        # O LIKE com % ajuda a achar a tarefa mesmo se tiver espaços extras no título da OS
        cursor.execute(sql_os, (crit, f"%{task}%"))
        c3 = cursor.rowcount
        
        if c1 + c2 + c3 > 0:
            updates_count += (c1 + c2 + c3)
            # print(f"✅ Atualizado: '{task}' -> {crit} ({c1+c2+c3} registros)")

    conn.commit()
    conn.close()
    
    print(f"\n✨ Processo concluído! Total de registros ajustados: {updates_count}")

if __name__ == "__main__":
    final_path = None
    if TXT_PATH_1.exists(): final_path = TXT_PATH_1
    elif TXT_PATH_2.exists(): final_path = TXT_PATH_2
    
    if not final_path:
        print("❌ Arquivo 'Plano de tarefas.txt' não encontrado.")
    else:
        mapping = parse_custom_format(final_path)
        print(f"📋 Tarefas extraídas do arquivo: {len(mapping)}")
        
        if len(mapping) > 0:
            update_database(mapping)
        else:
            print("⚠️ Nenhuma tarefa encontrada.")