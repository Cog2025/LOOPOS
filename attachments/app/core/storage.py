# /attachments/app/core/storage.py
# Persistência simples em JSON com lock e escrita atômica.
# Os arquivos são salvos em /attachments/data para facilitar backup e migração.

# Persistência em JSON com lock thread-safe e retry automático para Windows/Nextcloud

import json
import threading
import time
from typing import Any
from pathlib import Path


_LOCKS = {}

# Base em .../attachments/data (app/core -> app -> attachments)
_BASE_DIR = Path(__file__).resolve().parents[2] / "data"
_BASE_DIR.mkdir(parents=True, exist_ok=True)


def _get_lock(name: str) -> threading.Lock:
    """Obtém lock por arquivo (thread-safe)"""
    if name not in _LOCKS:
        _LOCKS[name] = threading.Lock()
    return _LOCKS[name]


def _path(name: str) -> Path:
    """Retorna caminho completo do arquivo"""
    return _BASE_DIR / name


def load_json(name: str, default: Any):
    """Carrega JSON com fallback para valor padrão"""
    p = _path(name)
    
    # Arquivo inexistente ou vazio → default
    if not p.exists() or p.stat().st_size == 0:
        return default
    
    try:
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        # Conteúdo inválido → retorna default
        print(f"⚠️ Arquivo corrompido: {name}, usando default")
        return default
    except Exception as e:
        print(f"⚠️ Erro ao carregar {name}: {e}")
        return default


def save_json(name: str, data: Any, max_retries: int = 3):
    """
    Salva JSON com lock thread-safe e retry automático (Windows/Nextcloud)
    
    Args:
        name: Nome do arquivo JSON
        data: Dados a salvar
        max_retries: Número máximo de tentativas (padrão: 3)
    """
    p = _path(name)
    tmp = p.with_suffix(p.suffix + ".tmp")
    lock = _get_lock(name)
    
    for attempt in range(max_retries):
        try:
            with lock:  # ✅ Thread-safe
                # Escreve no arquivo temporário
                with tmp.open("w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                # Tenta renomear (atomic write)
                tmp.replace(p)
            
            return  # ✅ Sucesso!
        
        except PermissionError as e:
            if attempt < max_retries - 1:
                # ✅ RETRY: Arquivo bloqueado, tenta novamente
                print(f"⚠️ Arquivo bloqueado: {name} (tentativa {attempt + 1}/{max_retries})")
                time.sleep(0.5)  # Espera 500ms (Nextcloud libera)
                
                # Limpa arquivo temp se estiver preso
                try:
                    if tmp.exists():
                        tmp.unlink()
                except:
                    pass
                
                continue
            else:
                # ✅ FALHA: Depois de N tentativas
                print(f"❌ Falha permanente ao salvar {name}: {e}")
                raise
        
        except Exception as e:
            print(f"❌ Erro ao salvar {name}: {e}")
            raise