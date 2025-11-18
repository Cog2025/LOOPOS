# /attachments/app/core/sync.py
"""Módulo de sincronização entre users e plants assignments"""

from app.core.storage import load_json, save_json


def sync_assignments_from_users():
    """Reconstrói assignments.json baseado em users.plantIds (apenas se mudou)"""
    try:
        users = load_json("users.json", [])
        plants = load_json("plants.json", [])
        
        print(f"🔄 SYNC INICIADA - Usuários: {len(users)}, Plantas: {len(plants)}")
        
        # ✅ CARREGA assignments ATUAL
        current_assignments = load_json("assignments.json", {})
        
        assignments = {}
        
        # Inicializa assignments para todas as plantas
        plant_ids = {plant["id"] for plant in plants}
        
        for plant in plants:
            assignments[plant["id"]] = {
                'coordinatorId': '',
                'supervisorIds': [],
                'technicianIds': [],
                'assistantIds': []
            }
        
        # Preenche baseado em users.plantIds + role
        for user in users:
            role = user.get('role', '').upper()  # ✅ CONVERTE PARA UPPERCASE
            
            print(f"  - Processando {user.get('name')} (role: {user.get('role')} → {role}, plants: {user.get('plantIds', [])})")
            
            for plant_id in user.get('plantIds', []):
                # ✅ Valida se plant_id existe
                if plant_id not in plant_ids:
                    print(f"    ⚠️ plant_id {plant_id} não existe!")
                    continue
                
                # ✅ MATCHES AGORA: "Supervisor", "SUPERVISOR", "supervisor" todos funcionam
                if role == 'COORDINATOR' or role == 'ADMIN':
                    assignments[plant_id]['coordinatorId'] = user['id']
                    print(f"    ✅ {user.get('name')} → COORDINATOR")
                elif role == 'SUPERVISOR':
                    if user['id'] not in assignments[plant_id]['supervisorIds']:
                        assignments[plant_id]['supervisorIds'].append(user['id'])
                    print(f"    ✅ {user.get('name')} → SUPERVISOR")
                elif role == 'TECHNICIAN' or role == 'TÉCNICO':  # ✅ TAMBÉM ACEITA 'TÉCNICO' português
                    if user['id'] not in assignments[plant_id]['technicianIds']:
                        assignments[plant_id]['technicianIds'].append(user['id'])
                    print(f"    ✅ {user.get('name')} → TECHNICIAN")
                elif role == 'ASSISTANT' or role == 'AUXILIAR':  # ✅ TAMBÉM ACEITA 'AUXILIAR' português
                    if user['id'] not in assignments[plant_id]['assistantIds']:
                        assignments[plant_id]['assistantIds'].append(user['id'])
                    print(f"    ✅ {user.get('name')} → ASSISTANT")
                else:
                    print(f"    ⚠️ Role desconhecido: {user.get('role')}")
        
        print(f"🔍 Novo assignments: {assignments}")
        print(f"🔍 Assignments atual: {current_assignments}")
        
        # ✅ NOVO: Compara antes de salvar
        if assignments != current_assignments:
            save_json("assignments.json", assignments)
            print("✅ assignments.json ATUALIZADO (mudanças detectadas)")
        else:
            # ✅ Sem mudanças = sem reescrever = sem reload
            print("ℹ️  assignments.json já está sincronizado (nenhuma mudança)")
        
    except Exception as e:
        print(f"❌ Erro ao sincronizar assignments: {e}")
        import traceback
        traceback.print_exc()