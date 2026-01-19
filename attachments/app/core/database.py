# /attachments/app/core/database.py
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CONFIGURAÇÃO DE AMBIENTE ---
# O arquivo .database.py está em: attachments/app/core/
# O arquivo .env.local está em:   LOOPOS/ (Raiz)
# Precisamos subir 3 níveis: core -> app -> attachments -> LOOPOS
env_path = Path(__file__).resolve().parents[3] / '.env.local'

# Carrega as variáveis do arquivo .env.local
load_dotenv(dotenv_path=env_path)

# Pega a URL do banco. Se não encontrar, lança um erro para te avisar.
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

if not SQLALCHEMY_DATABASE_URL:
    # Fallback de segurança ou erro explicativo
    raise ValueError(f"❌ A variável DATABASE_URL não foi encontrada em: {env_path}")

# --- CONEXÃO COM O BANCO ---
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- DEPENDÊNCIA (Essencial para as rotas) ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
