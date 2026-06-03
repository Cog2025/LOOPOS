import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def faxina_nuclear():
    print("Iniciando a Faxina Nuclear (incluindo campos JSON e Listas)...")
    engine = create_engine(DATABASE_URL, echo=False)
    Session = sessionmaker(bind=engine)
    inspector = inspect(engine)

    # Dicionário absoluto com todas as variações encontradas
    substituicoes = {
        "├º": "ç", "├ç": "Ç", "├â": "Ã", "├ú": "ã", "├á": "à", "├í": "á",
        "├ü": "Á", "├é": "Â", "├ê": "Ê", "├ë": "É", "├®": "é", "├¡": "í",
        "├ì": "Í", "├│": "ó", "├ô": "Ô", "├ò": "Õ", "├╡": "õ", "├║": "ú",
        "├Ü": "Ú", "├▒": "ñ", "├æ": "Ñ"
    }

    with Session() as session:
        for table_name in inspector.get_table_names():
            colunas = inspector.get_columns(table_name)

            for col in colunas:
                col_name = col['name']
                col_type = str(col['type']).upper()
                
                # Pega o tipo base (ex: transforma VARCHAR(255) em apenas VARCHAR)
                base_type = col_type.split('(')[0] 

                is_text = 'VARCHAR' in base_type or 'TEXT' in base_type
                is_json = 'JSON' in base_type

                if not (is_text or is_json):
                    continue

                try:
                    for errado, certo in substituicoes.items():
                        # O segredo: CAST converte JSON para texto, limpa e devolve para o formato original
                        query = text(f"UPDATE {table_name} SET {col_name} = CAST(REPLACE(CAST({col_name} AS TEXT), :errado, :certo) AS {base_type}) WHERE CAST({col_name} AS TEXT) LIKE :busca")
                        session.execute(query, {"errado": errado, "certo": certo, "busca": f"%{errado}%"})
                except Exception:
                    session.rollback() # Se esbarrar em alguma chave do sistema, ele ignora com segurança
                    continue
            
            session.commit()
            print(f"✅ Limpeza profunda aplicada na tabela: {table_name}")

    print("\n✨ Faxina Nuclear Concluída!")

if __name__ == "__main__":
    faxina_nuclear()