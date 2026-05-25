import os
import uuid

from fastapi import HTTPException, UploadFile

from config import get_settings

settings = get_settings()
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024


async def upload_property_image(property_id: int, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp files are allowed")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    ext = file.filename.split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "webp"}:
        ext = "jpg"

    base_dir = os.path.abspath(settings.uploads_dir)
    target_dir = os.path.join(base_dir, "properties", str(property_id))
    os.makedirs(target_dir, exist_ok=True)
    name = f"{uuid.uuid4()}.{ext}"
    target_path = os.path.join(target_dir, name)
    with open(target_path, "wb") as f:
        f.write(data)

    return f"/uploads/properties/{property_id}/{name}"
