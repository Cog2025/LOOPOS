import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

# Carrega a DATABASE_URL do arquivo .env
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def faxina_absoluta():
    print("Iniciando o modo 'Aspirador de Pó' em todas as tabelas...")
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    inspector = inspect(engine)

    # Dicionário turbinado com os símbolos novos encontrados nos seus prints (├ü = Á, ├ç = Ç)
    substituicoes = {
        "├º": "ç", "├â": "Ã", "├ë": "É", "├¡": "í", 
        "├ú": "ã", "├®": "é", "├Ç": "À", "├á": "à", 
        "├í": "á", "├é": "Â", "├¬": "ê", "├│": "ó", 
        "├╡": "õ", "├ô": "Ô", "├║": "ú", "├ç": "Ç", 
        "├ê": "Ê", "├Ü": "Ú", "├Õ": "Õ", "├ü": "Á",
        "├ì": "Í"
    }

    with Session() as session:
        # Pega o nome de TODAS as tabelas que existem no seu banco de dados
        for table_name in inspector.get_table_names():
            # Descobre quais colunas existem dentro dessa tabela
            colunas = inspector.get_columns(table_name)
            
            # Filtra apenas as colunas que guardam textos (VARCHAR ou TEXT)
            colunas_texto = [col['name'] for col in colunas if 'VARCHAR' in str(col['type']).upper() or 'TEXT' in str(col['type']).upper()]
            
            if not colunas_texto:
                continue # Pula tabelas que só guardam números ou datas (ex: logs de acesso)

            # Aplica o Localizar e Substituir em CADA coluna de texto encontrada
            for col_name in colunas_texto:
                try:
                    for errado, certo in substituicoes.items():
                        query = text(f"UPDATE {table_name} SET {col_name} = REPLACE({col_name}, :errado, :certo) WHERE {col_name} LIKE :busca")
                        session.execute(query, {"errado": errado, "certo": certo, "busca": f"%{errado}%"})
                except Exception:
                    session.rollback() # Se bater em alguma restrição de chave, ele ignora e segue o baile
            
            session.commit()
            print(f"✅ Tabela verificada e limpa: {table_name}")
            
    print("\n✨ Faxina nível industrial concluída! Pode recarregar o sistema.")

if __name__ == "__main__":
    faxina_absoluta()