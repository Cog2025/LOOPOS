# Arquivo: attachments/check_db.py
import sys
import os
from pathlib import Path

# Ajusta o caminho para importar módulos do app
sys.path.append(os.getcwd())

from app.core.database import SessionLocal, BASE_DIR
from app.core.models import OS, User

print("\n" + "="*50)
print("🕵️‍♂️ DIAGNÓSTICO DO BANCO DE DADOS")
print("="*50)

print(f"📂 Pasta de Dados Configurada: {BASE_DIR}")
db_path = BASE_DIR / "loopos.db"
print(f"💾 Arquivo de Banco (Caminho Real): {db_path}")

if not db_path.exists():
    print("❌ ERRO: O arquivo do banco de dados NÃO EXISTE neste caminho!")
    exit()

print(f"✅ Arquivo encontrado! Tamanho: {db_path.stat().st_size} bytes")

db = SessionLocal()
try:
    # 1. Listar Usuários
    users = db.query(User).all()
    print(f"\n👥 Usuários ({len(users)}):")
    for u in users:
        print(f"   - {u.name} (Role: {u.role}, ID: {u.id})")

    # 2. Listar OSs
    oss = db.query(OS).all()
    print(f"\n📋 Ordens de Serviço ({len(oss)}):")
    if not oss:
        print("   (Nenhuma OS encontrada no banco)")
    
    for o in oss:
        print(f"   - [{o.id}] {o.title}")
        print(f"     Status: {o.status} | Técnico: {o.technicianId} | Criada em: {o.createdAt}")
        print("-" * 20)

finally:
    db.close()
    print("\n" + "="*50)