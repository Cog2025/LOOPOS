# /attachments/app/core/database.py
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pathlib import Path

# Define onde o arquivo do banco vai ficar (na mesma pasta 'data' dos json)
BASE_DIR = Path(__file__).resolve().parents[2] / "data"
BASE_DIR.mkdir(parents=True, exist_ok=True)

SQL_DATABASE_URL = f"sqlite:///{BASE_DIR}/loopos.db"

# Configuração específica para SQLite (check_same_thread=False)
engine = create_engine(
    SQL_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependência para injetar o banco nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()