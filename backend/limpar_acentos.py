import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Carrega a DATABASE_URL do arquivo .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def faxina_mojibake():
    print("Conectando ao banco Neon para a faxina de acentos...")
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)

    # Dicionário mapeando a sujeira do Windows (CP1252) para os acentos corretos (UTF-8)
    # Inclui os erros vistos nos seus prints (INSPE├º├âO, ├ëlis, Ra├¡zen, etc)
    substituicoes = {
        "├º": "ç", "├â": "Ã", "├ë": "É", "├¡": "í", 
        "├ú": "ã", "├®": "é", "├Ç": "À", "├á": "à", 
        "├í": "á", "├é": "Â", "├¬": "ê", "├│": "ó", 
        "├╡": "õ", "├ô": "Ô", "├║": "ú", "├ç": "Ç", 
        "├ê": "Ê", "├Ü": "Ú", "├Õ": "Õ"
    }

    # Tentaremos limpar tanto as colunas em inglês quanto em português (caso existam)
    alvos = [
        ("os", "title"), ("os", "titulo"),
        ("os", "description"), ("os", "descricao"),
        ("users", "name"), ("users", "role")
    ]

    with Session() as session:
        for tabela, coluna in alvos:
            try:
                # Testa se a coluna existe e executa o REPLACE para todos os erros mapeados
                for errado, certo in substituicoes.items():
                    query = text(f"UPDATE {tabela} SET {coluna} = REPLACE({coluna}, :errado, :certo) WHERE {coluna} LIKE :busca")
                    session.execute(query, {"errado": errado, "certo": certo, "busca": f"%{errado}%"})
                session.commit()
                print(f"✅ Faxina aplicada com sucesso em: {tabela}.{coluna}")
            except Exception:
                # Se a tabela ou coluna não existir no seu modelo, ele ignora sem quebrar o script
                session.rollback()
                
        print("\n✨ Limpeza concluída! Atualize o seu navegador para ver os acentos corretos.")

if __name__ == "__main__":
    faxina_mojibake()