# fix_dates.py
import sys
from datetime import datetime
from pathlib import Path
from sqlalchemy import text
sys.path.append(str(Path(__file__).parent / "attachments"))
from app.core.database import SessionLocal

def fix():
    db = SessionLocal()
    now = datetime.utcnow().isoformat()
    # Garante que NENHUMA data esteja nula
    db.execute(text(f"UPDATE os SET createdAt = '{now}' WHERE createdAt IS NULL"))
    db.execute(text(f"UPDATE os SET updatedAt = '{now}' WHERE updatedAt IS NULL"))
    db.execute(text(f"UPDATE os SET startDate = '{now}' WHERE startDate IS NULL"))
    db.commit()
    print("✅ Datas corrigidas.")
    db.close()

if __name__ == "__main__":
    fix()