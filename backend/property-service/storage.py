import os
import io
import uuid
import boto3
from PIL import Image

from fastapi import HTTPException, UploadFile
import logging
from config import get_settings

logger = logging.getLogger("property-service.storage")
settings = get_settings()
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE = 5 * 1024 * 1024

async def upload_property_image(property_id: int, file: UploadFile) -> str:
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only jpg, png, webp files are allowed")
    
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    # --- IMAGE COMPRESSION & RESIZING (PIL) ---
    try:
        img = Image.open(io.BytesIO(data))
        # Convert RGBA to RGB (removes transparency, needed for standard JPEG/WebP)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        # Resize if width or height exceeds 1200px, maintaining aspect ratio
        img.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
        
        # Save compressed image to a BytesIO object in WebP format
        compressed_io = io.BytesIO()
        img.save(compressed_io, format="WEBP", quality=80, method=4)
        compressed_data = compressed_io.getvalue()
        logger.info(f"Successfully compressed image for property {property_id} to {len(compressed_data)} bytes")
    except Exception as e:
        logger.error(f"Failed to process image for property {property_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process image")

    # Force extension and content type to WebP since we just converted it
    ext = "webp"
    content_type = "image/webp"
    name = f"properties/{property_id}/{uuid.uuid4()}.{ext}"
    
    # If not in production (no S3 bucket), fallback to local storage
    if not settings.s3_bucket:
        base_dir = os.path.abspath(settings.uploads_dir)
        target_dir = os.path.join(base_dir, "properties", str(property_id))
        os.makedirs(target_dir, exist_ok=True)
        target_path = os.path.join(target_dir, f"{uuid.uuid4()}.{ext}")
        with open(target_path, "wb") as f:
            f.write(compressed_data)
        return f"/uploads/properties/{property_id}/{name.split('/')[-1]}"

    # Production: Upload to S3
    try:
        s3_client = boto3.client('s3', region_name=settings.aws_default_region)
        s3_client.put_object(
            Bucket=settings.s3_bucket,
            Key=name,
            Body=compressed_data,
            ContentType=content_type
        )
        logger.info(f"Successfully uploaded {name} to S3 bucket {settings.s3_bucket}")
    except Exception as e:
        logger.error(f"Failed to upload {name} to S3: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload image to storage")
    
    # Return the CloudFront URL if available, otherwise fallback to raw S3 URL
    if settings.cloudfront_domain:
        return f"https://{settings.cloudfront_domain}/{name}"
    return f"https://{settings.s3_bucket}.s3.{settings.aws_default_region}.amazonaws.com/{name}"
