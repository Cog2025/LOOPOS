# Arquivo: attachments/run.py
import uvicorn

if __name__ == "__main__":
    print("🚀 Iniciando servidor Uvicorn via Script Python (Blindado contra Shell)...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        # Define as regras de exclusão diretamente no código
        reload_excludes=[
            "data/*", 
            "*.db", 
            "images/*",
            "*.json"
        ]
    )