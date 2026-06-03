import cloudinary
import os

def init_cloudinary():
    # As variáveis são injetadas pelo ambiente local (backend/.env) ou painel do Render
    cloudinary.config(
        cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        api_key=os.getenv("CLOUDINARY_API_KEY", ""),
        api_secret=os.getenv("CLOUDINARY_API_SECRET", "")
    )
