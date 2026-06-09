from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.core import models

PERMS_BASE = [
    # --- 01. OPERAÇÃO ---
    {"slug": "kanban.acessar", "nome": "Visualizar Painel Kanban", "modulo": "01. OPERAÇÃO > PAINEL KANBAN"},
    {"slug": "calendario.acessar", "nome": "Visualizar Calendário", "modulo": "01. OPERAÇÃO > CALENDÁRIO"},
    {"slug": "cronograma.acessar", "nome": "Visualizar Cronograma 52 Semanas", "modulo": "01. OPERAÇÃO > CRONOGRAMA 52 SEMANAS"},
    
    {"slug": "os.visualizar", "nome": "Visualizar O.S", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    {"slug": "os.criar", "nome": "Criar O.S", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    {"slug": "os.editar", "nome": "Editar O.S", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    {"slug": "os.excluir", "nome": "Excluir O.S", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    {"slug": "os.executar", "nome": "Executar O.S (Play/Pause/Concluir)", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    {"slug": "os.revisar", "nome": "Revisar/Aprovar O.S", "modulo": "01. OPERAÇÃO > ORDENS DE SERVIÇO"},
    
    {"slug": "planos.visualizar", "nome": "Visualizar Planos", "modulo": "01. OPERAÇÃO > PLANOS DE MANUTENÇÃO"},
    {"slug": "planos.criar", "nome": "Criar Planos", "modulo": "01. OPERAÇÃO > PLANOS DE MANUTENÇÃO"},
    {"slug": "planos.editar", "nome": "Editar Planos", "modulo": "01. OPERAÇÃO > PLANOS DE MANUTENÇÃO"},
    {"slug": "planos.excluir", "nome": "Excluir Planos", "modulo": "01. OPERAÇÃO > PLANOS DE MANUTENÇÃO"},

    # --- 02. EQUIPES ---
    {"slug": "usuarios.visualizar", "nome": "Visualizar Membros da Equipe", "modulo": "02. EQUIPES > EQUIPES"},
    {"slug": "usuarios.criar", "nome": "Criar Novos Membros", "modulo": "02. EQUIPES > EQUIPES"},
    {"slug": "usuarios.editar", "nome": "Editar Membros da Equipe", "modulo": "02. EQUIPES > EQUIPES"},
    {"slug": "usuarios.excluir", "nome": "Excluir Membros da Equipe", "modulo": "02. EQUIPES > EQUIPES"},
    {"slug": "usuarios.atribuir_usinas", "nome": "Vincular Usinas a Usuários", "modulo": "02. EQUIPES > EQUIPES"},

    # --- 03. USINAS ---
    {"slug": "usinas.visualizar", "nome": "Visualizar Usinas/Ativos", "modulo": "03. USINAS > USINAS"},
    {"slug": "usinas.criar", "nome": "Criar Usinas/Ativos", "modulo": "03. USINAS > USINAS"},
    {"slug": "usinas.editar", "nome": "Editar Usinas/Ativos", "modulo": "03. USINAS > USINAS"},
    {"slug": "usinas.excluir", "nome": "Excluir Usinas/Ativos", "modulo": "03. USINAS > USINAS"},
    {"slug": "usinas.restrito", "nome": "Acesso Restrito (Ver apenas usinas vinculadas a si mesmo)", "modulo": "03. USINAS > USINAS"},
    
    # --- 04. ADMINISTRAÇÃO ---
    {"slug": "empresas.gerenciar", "nome": "Gerenciar Empresas", "modulo": "04. ADMINISTRAÇÃO > EMPRESAS"},
    
    {"slug": "permissoes.visualizar", "nome": "Visualizar Matriz de Permissões", "modulo": "04. ADMINISTRAÇÃO > PERMISSÕES"},
    {"slug": "permissoes.editar", "nome": "Conceder/Revogar Permissões", "modulo": "04. ADMINISTRAÇÃO > PERMISSÕES"},
    {"slug": "permissoes.criar_cargo", "nome": "Criar Novos Cargos", "modulo": "04. ADMINISTRAÇÃO > PERMISSÕES"},
    
    {"slug": "auditoria.visualizar", "nome": "Acessar Logs de Auditoria", "modulo": "04. ADMINISTRAÇÃO > AUDITORIA"},
    {"slug": "auditoria.exportar", "nome": "Exportar Logs (PDF/Excel)", "modulo": "04. ADMINISTRAÇÃO > AUDITORIA"},
]

AVAILABLE_SLUGS = [p["slug"] for p in PERMS_BASE]

def verificar_permissao(slug: str, current_user: models.User, db: Session) -> bool:
    if not current_user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    
    if current_user.is_superadmin or current_user.role == 'admin':
        return True
        
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    role_perm = db.query(models.RolePermission).filter(
        models.RolePermission.role_name == current_user.role, 
        models.RolePermission.company_id == empresa_id
    ).first()
    
    user_perms = role_perm.permissions if role_perm else []
    
    if isinstance(user_perms, list) and slug in user_perms:
        return True
        
    raise HTTPException(status_code=403, detail=f"Acesso negado: Necessário permissão '{slug}'")
