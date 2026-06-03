import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext

# Carrega a DATABASE_URL do arquivo .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Configura o gerador de hash
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def resetar_todas_as_senhas():
    print("Conectando ao banco Neon...")
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    
    nova_senha_plana = "123"
    
    print(f"Gerando hash blindado para a senha '{nova_senha_plana}'...")
    senha_hasheada = pwd_context.hash(nova_senha_plana)
    
    with Session() as session:
        # O comando UPDATE sem o WHERE afeta TODAS as linhas da tabela
        query = text("UPDATE users SET password = :senha")
        result = session.execute(query, {"senha": senha_hasheada})
        session.commit()
        
        print(f"Sucesso absoluto! As senhas de {result.rowcount} usuários foram redefinidas para: {nova_senha_plana}")

if __name__ == "__main__":
    resetar_todas_as_senhas()