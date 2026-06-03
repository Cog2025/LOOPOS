from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.auth_middleware import get_current_user
import cloudinary.uploader
import logging

router = APIRouter()

@router.post("/api/upload", tags=["upload"])
def upload_image(file: UploadFile = File(...), user_id: str = Depends(get_current_user)):
    try:
        file_content = file.file.read()
        
        response = cloudinary.uploader.upload(
            file_content,
            folder="loopos/os_images",
            resource_type="auto"
        )
        
        logging.info(f"✅ Upload Cloudinary Sucesso: {response.get('secure_url')}")
        return {"secure_url": response.get("secure_url")}
        
    except Exception as e:
        logging.error(f"❌ Erro upload Cloudinary: {e}")
        raise HTTPException(status_code=500, detail="Falha ao enviar imagem para a nuvem")
