# /attachments/app/core/storage.py
# Persistência simples em JSON com lock e escrita atômica.
# Os arquivos são salvos em /attachments/data para facilitar backup e migração.

import json
import threading
from typing import Any
from pathlib import Path

_LOCKS = {}

# Base em .../attachments/data (app/core -> app -> attachments)
_BASE_DIR = Path(__file__).resolve().parents[2] / "data"
_BASE_DIR.mkdir(parents=True, exist_ok=True)


def _get_lock(name: str) -> threading.Lock:
    if name not in _LOCKS:
        _LOCKS[name] = threading.Lock()
    return _LOCKS[name]

def _path(name: str) -> Path:
    return _BASE_DIR / name

def load_json(name: str, default: Any):
    p = _path(name)
    # arquivo inexistente ou vazio → default
    if not p.exists() or p.stat().st_size == 0:
        return default
    try:
        with p.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        # conteúdo inválido → trate como default (não quebra a API)
        return default

def save_json(name: str, data: Any):
    p = _path(name)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    lock = _get_lock(name)
    with lock:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        tmp.replace(p)