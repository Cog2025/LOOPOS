import sqlite3
from pathlib import Path

# --- CONFIGURAÇÃO ---
DB_PATH = Path("attachments/data/loopos.db")
TXT_PATH_1 = Path("Plano de tarefas.txt")
TXT_PATH_2 = Path("attachments/Plano de tarefas.txt")

def normalize_criticality(raw_text):
    """Mesma lógica de normalização."""
    t = raw_text.strip().upper()
    if "MUITO ALTO" in t: return "Urgente"
    elif "ALTO" in t or "ALTA" in t: return "Alta"
    elif "MÉDIO" in t or "MEDIO" in t or "MÉDIA" in t: return "Média"
    elif "BAIXO" in t or "BAIXA" in t: return "Baixa"
    return "Média"

def parse_txt_file(file_path):
    """Lê o arquivo TXT e monta o gabarito."""
    task_map = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f: lines = f.readlines()
    except:
        with open(file_path, 'r', encoding='latin-1') as f: lines = f.readlines()

    current_task = None
    for line in lines:
        line = line.strip()
        if line.upper().startswith("TAREFA:"):
            current_task = line.split(":", 1)[1].strip()
        elif line.upper().startswith("CRITICIDADE:") and current_task:
            crit = normalize_criticality(line.split(":", 1)[1].strip())
            # Guarda a tarefa em maiúsculo para facilitar a busca
            task_map[current_task.upper()] = crit
            current_task = None
    return task_map

def check_os_table(cursor, task_map):
    print(f"\n🔍 Verificando Tabela: ORDENS DE SERVIÇO (OS)...")
    
    try:
        # Pega ID, Título e Prioridade de todas as OSs
        cursor.execute(f"SELECT id, title, priority FROM os")
        db_rows = cursor.fetchall()
    except sqlite3.OperationalError:
        print(f"⚠️ Tabela OS não encontrada.")
        return

    ok_count = 0
    error_count = 0
    not_found_count = 0

    # Para cada OS no banco
    for os_id, os_title, os_priority in db_rows:
        if not os_title: continue
        
        os_title_upper = os_title.upper()
        found_match = False

        # Tenta encontrar qual tarefa do TXT está contida neste título de OS
        # Ex: "OS100 - LIMPEZA X" contém "LIMPEZA X"
        for task_name, expected_crit in task_map.items():
            if task_name in os_title_upper:
                found_match = True
                
                # Normaliza o que veio do banco para garantir (ex: remove espaços)
                db_crit_norm = (os_priority or "").strip()
                
                if db_crit_norm == expected_crit:
                    ok_count += 1
                else:
                    print(f"   ❌ ERRO na {os_id}: '{os_title}'")
                    print(f"      Banco: '{db_crit_norm}' | Esperado: '{expected_crit}'")
                    error_count += 1
                break # Parar de procurar tarefas para esta OS
        
        if not found_match:
            not_found_count += 1

    print(f"   ✅ Corretos: {ok_count}")
    if error_count > 0:
        print(f"   ❌ Divergências encontradas: {error_count}")
    else:
        print(f"   ✨ Nenhuma divergência encontrada nas OSs identificadas!")
    
    print(f"   ℹ️  OSs que não bateram com nenhuma tarefa do TXT: {not_found_count}")

def verify():
    if not DB_PATH.exists():
        print("❌ Banco de dados não encontrado.")
        return

    txt_path = TXT_PATH_1 if TXT_PATH_1.exists() else TXT_PATH_2
    if not txt_path:
        print("❌ Arquivo TXT não encontrado.")
        return
        
    gabarito = parse_txt_file(txt_path)
    print(f"📋 Gabarito carregado: {len(gabarito)} tarefas.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Verifica apenas a tabela OS agora, já que as outras deram OK
    check_os_table(cursor, gabarito)

    conn.close()

if __name__ == "__main__":
    verify()