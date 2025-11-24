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

# Define o diretório de dados
_BASE_DIR = Path(__file__).resolve().parents[2] / "data"
_BASE_DIR.mkdir(parents=True, exist_ok=True)

def _get_lock(name: str) -> threading.Lock:
    if name not in _LOCKS:
        _LOCKS[name] = threading.Lock()
    return _LOCKS[name]

def _path(name: str) -> Path:
    return _BASE_DIR / name

def load_json(name: str, default: Any):
    """
    Carrega um arquivo JSON com segurança.
    Se der erro, retorna o valor 'default' (geralmente uma lista vazia []).
    """
    p = _path(name)
    
    # Se arquivo não existe, retorna default
    if not p.exists():
        return default
    
    # Se arquivo está vazio (0 bytes), retorna default
    if p.stat().st_size == 0:
        print(f"⚠️ [STORAGE] Arquivo vazio detectado: {name}")
        return default
    
    try:
        with p.open("r", encoding="utf-8") as f:
            data = json.load(f)
            # Se o JSON for "null", retorna default
            if data is None:
                return default
            return data
    except json.JSONDecodeError as e:
        print(f"❌ [STORAGE] JSON corrompido em {name}: {e}")
        return default
    except Exception as e:
        print(f"❌ [STORAGE] Erro ao ler {name}: {e}")
        return default

def save_json(name: str, data: Any, max_retries: int = 3):
    p = _path(name)
    tmp = p.with_suffix(p.suffix + ".tmp")
    lock = _get_lock(name)
    
    for attempt in range(max_retries):
        try:
            with lock:
                with tmp.open("w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                tmp.replace(p)
            return
        except PermissionError:
            if attempt < max_retries - 1:
                time.sleep(0.5)
                continue
            else:
                print(f"❌ [STORAGE] Permissão negada ao salvar {name}")
                raise
        except Exception as e:
            print(f"❌ [STORAGE] Erro ao salvar {name}: {e}")
            raise