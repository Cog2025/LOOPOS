# File: attachments/fix_status.py
import sys
import os
from pathlib import Path

# Ajusta o caminho para importar módulos do app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal, BASE_DIR
from app.core.models import OS

print("🔧 Iniciando reparo de status das OSs...")

db = SessionLocal()
try:
    # Busca todas as OSs com o status errado
    wrong_status_oss = db.query(OS).filter(OS.status == "Em Execução").all()
    
    print(f"📋 Encontradas {len(wrong_status_oss)} OSs com status 'Em Execução' (Invisível).")
    
    for os in wrong_status_oss:
        print(f"   -> Corrigindo {os.id} ({os.title})...")
        os.status = "Em Progresso" # Muda para o status correto
        
    db.commit()
    print("✅ Correção aplicada com sucesso!")
    
except Exception as e:
    print(f"❌ Erro: {e}")
    db.rollback()
finally:
    db.close()