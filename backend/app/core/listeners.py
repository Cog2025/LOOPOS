import json
import uuid
from sqlalchemy import event
from sqlalchemy.orm import Session
from app.core import models
from app.core.context import current_user_context

def serialize_obj(obj):
    if not obj: return None
    state = obj.__dict__.copy()
    state.pop('_sa_instance_state', None)
    for k, v in state.items():
        if hasattr(v, 'isoformat'):
            state[k] = v.isoformat()
        elif isinstance(v, uuid.UUID):
            state[k] = str(v)
    return state

def get_changes(instance):
    state = instance.__dict__.get('_sa_instance_state')
    if not state: return None, None
    
    antigos = {}
    novos = {}
    
    for attr in state.manager.mapper.columns.keys():
        hist = getattr(state.attrs, attr).history
        if hist.has_changes():
            val_antigo = hist.deleted[0] if hist.deleted else None
            val_novo = hist.added[0] if hist.added else None
            
            if hasattr(val_antigo, 'isoformat'): val_antigo = val_antigo.isoformat()
            elif isinstance(val_antigo, uuid.UUID): val_antigo = str(val_antigo)
                
            if hasattr(val_novo, 'isoformat'): val_novo = val_novo.isoformat()
            elif isinstance(val_novo, uuid.UUID): val_novo = str(val_novo)
                
            antigos[attr] = val_antigo
            novos[attr] = val_novo
            
    return antigos, novos

def auditoria_listener(session, flush_context, instances):
    user = current_user_context.get()
    
    for obj in session.new:
        if isinstance(obj, models.AuditoriaLog): continue
        if not hasattr(obj, '__tablename__'): continue
        
        tabela = obj.__tablename__
        empresa_id = getattr(user, 'empresa_atual_id', getattr(user, 'company_id', None)) if user else getattr(obj, 'company_id', None)
        
        log = models.AuditoriaLog(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            tabela=tabela,
            registro_id=str(getattr(obj, 'id', 'N/A')),
            acao="CREATE",
            dados_novos=serialize_obj(obj),
            usuario_id=user.id if user else None,
            usuario_nome=user.name if user else "Sistema"
        )
        session.add(log)
        
    for obj in session.dirty:
        if isinstance(obj, models.AuditoriaLog): continue
        if not hasattr(obj, '__tablename__'): continue
        
        tabela = obj.__tablename__
        antigos, novos = get_changes(obj)
        if not novos: continue
        
        empresa_id = getattr(user, 'empresa_atual_id', getattr(user, 'company_id', None)) if user else getattr(obj, 'company_id', None)
        
        log = models.AuditoriaLog(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            tabela=tabela,
            registro_id=str(getattr(obj, 'id', 'N/A')),
            acao="UPDATE",
            dados_antigos=antigos,
            dados_novos=novos,
            usuario_id=user.id if user else None,
            usuario_nome=user.name if user else "Sistema"
        )
        session.add(log)
        
    for obj in session.deleted:
        if isinstance(obj, models.AuditoriaLog): continue
        if not hasattr(obj, '__tablename__'): continue
        
        tabela = obj.__tablename__
        empresa_id = getattr(user, 'empresa_atual_id', getattr(user, 'company_id', None)) if user else getattr(obj, 'company_id', None)
        
        log = models.AuditoriaLog(
            id=str(uuid.uuid4()),
            empresa_id=empresa_id,
            tabela=tabela,
            registro_id=str(getattr(obj, 'id', 'N/A')),
            acao="DELETE",
            dados_antigos=serialize_obj(obj),
            usuario_id=user.id if user else None,
            usuario_nome=user.name if user else "Sistema"
        )
        session.add(log)

# Registra o event listener no SQLAlchemy Session
event.listen(Session, 'before_flush', auditoria_listener)
