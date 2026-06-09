from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date, timezone
from pydantic import BaseModel
from app.core.database import get_db
from app.core import models
from app.core.auth_middleware import get_current_user
from sqlalchemy import or_

router = APIRouter(tags=["auditoria"])

def tem_permissao(slug: str, current_user: models.User, db: Session) -> bool:
    if current_user.is_superadmin or current_user.role == 'admin':
        return True
        
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    role_perm = db.query(models.RolePermission).filter(
        models.RolePermission.role_name == current_user.role, 
        models.RolePermission.company_id == empresa_id
    ).first()
    
    user_perms = role_perm.permissions if role_perm else []
    return isinstance(user_perms, list) and slug in user_perms

def verificar_permissao(slug: str, current_user: models.User, db: Session):
    if not tem_permissao(slug, current_user, db):
        raise HTTPException(status_code=403, detail=f"Acesso negado: Necessário permissão '{slug}'")

# --- SCHEMA DE RESPOSTA ---
class AuditoriaLogResponse(BaseModel):
    id: str
    tabela: Optional[str] = None
    registro_id: Optional[str] = None
    acao: Optional[str] = None
    dados_antigos: Optional[dict] = None
    dados_novos: Optional[dict] = None
    usuario_id: Optional[str] = None
    usuario_nome: Optional[str] = None
    data_hora: datetime

    class Config: 
        from_attributes = True

class AuditoriaLogPaginado(BaseModel):
    items: List[AuditoriaLogResponse]
    total: int
    page: int
    limit: int


@router.get("/", response_model=AuditoriaLogPaginado)
def listar_logs(
    usuario_nome: Optional[str] = None,
    tabela: Optional[str] = None,
    acao: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    busca: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verificar_permissao("auditoria.ver", current_user, db)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    # ISOLAMENTO MULTI-TENANT: Trava os logs pela empresa logada
    query = db.query(models.AuditoriaLog).filter(
        models.AuditoriaLog.empresa_id == empresa_id
    )
    
    # TRAVA DE VISÃO GLOBAL PARA AUDITORIA
    tem_visao_global = tem_permissao("auditoria.visao_global", current_user, db)
    
    if not tem_visao_global:
        query = query.filter(models.AuditoriaLog.usuario_id == current_user.id)
    
    if usuario_nome:
        query = query.filter(models.AuditoriaLog.usuario_nome == usuario_nome)
    if tabela:
        query = query.filter(models.AuditoriaLog.tabela == tabela)
    if acao:
        query = query.filter(models.AuditoriaLog.acao == acao)
    if data_inicio:
        query = query.filter(models.AuditoriaLog.data_hora >= data_inicio)
    if data_fim:
        dt_fim = datetime.combine(data_fim, datetime.max.time())
        query = query.filter(models.AuditoriaLog.data_hora <= dt_fim)
        
    if busca:
        search = f"%{busca}%"
        query = query.filter(
            or_(
                # Nota: Em Postgres, .astext é necessário para buscar em JSON, mas em SQLite json cast às vezes não funciona com ilike diretamente
                # Vamos simplificar pesquisando no text casted
                models.AuditoriaLog.usuario_nome.ilike(search),
                models.AuditoriaLog.tabela.ilike(search)
            )
        )

    total = query.count()
    items = query.order_by(models.AuditoriaLog.data_hora.desc()).offset((page - 1) * limit).limit(limit).all()
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/filtros")
def opcoes_filtros(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    verificar_permissao("auditoria.ver", current_user, db)
    empresa_id = getattr(current_user, 'empresa_atual_id', current_user.company_id)
    
    base_query = db.query(models.AuditoriaLog).filter(
        models.AuditoriaLog.empresa_id == empresa_id
    )
    
    tem_visao_global = tem_permissao("auditoria.visao_global", current_user, db)
    
    if not tem_visao_global:
        base_query = base_query.filter(models.AuditoriaLog.usuario_id == current_user.id)
    
    usuarios = base_query.with_entities(models.AuditoriaLog.usuario_nome).distinct().all()
    tabelas = base_query.with_entities(models.AuditoriaLog.tabela).distinct().all()
    acoes = base_query.with_entities(models.AuditoriaLog.acao).distinct().all()
    
    return {
        "usuarios": [u[0] for u in usuarios if u[0]],
        "tabelas": [t[0] for t in tabelas if t[0]],
        "acoes": [a[0] for a in acoes if a[0]]
    }
