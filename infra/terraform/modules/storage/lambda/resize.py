"""Lambda function: Auto-resize property images on S3 upload.

Triggered by S3 PutObject events on the ``originals/`` prefix.
Creates two resized WebP variants:
  - ``medium/`` — 800px max width, quality 80
  - ``thumbnails/`` — 300px max width, quality 75

Requires a Lambda layer with Pillow (e.g. Klayers-p311-Pillow).
"""

import io
import logging
import os
import urllib.parse

import boto3
from PIL import Image

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")

# Resize targets: (prefix, max_width, webp_quality)
VARIANTS = [
    ("medium", 800, 80),
    ("thumbnails", 300, 75),
]


def handler(event, context):
    """Lambda entry point — triggered by S3 PutObject."""
    for record in event.get("Records", []):
        bucket = record["s3"]["bucket"]["name"]
        key = urllib.parse.unquote_plus(record["s3"]["object"]["key"])

        # Only process files under originals/
        if not key.startswith("originals/"):
            logger.info("Skipping non-original key: %s", key)
            continue

        logger.info("Processing image: s3://%s/%s", bucket, key)

        try:
            response = s3.get_object(Bucket=bucket, Key=key)
            image_data = response["Body"].read()
            img = Image.open(io.BytesIO(image_data))

            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Generate the relative path after "originals/"
            relative_path = key[len("originals/"):]
            # Change extension to .webp for variants
            base_path = relative_path.rsplit(".", 1)[0]

            for prefix, max_width, quality in VARIANTS:
                variant = img.copy()
                # Only resize if larger than target
                if variant.width > max_width:
                    ratio = max_width / variant.width
                    new_height = int(variant.height * ratio)
                    variant = variant.resize((max_width, new_height), Image.Resampling.LANCZOS)

                buf = io.BytesIO()
                variant.save(buf, format="WEBP", quality=quality, method=4)
                buf.seek(0)

                dest_key = f"{prefix}/{base_path}.webp"
                s3.put_object(
                    Bucket=bucket,
                    Key=dest_key,
                    Body=buf.getvalue(),
                    ContentType="image/webp",
                )
                logger.info("Created variant: s3://%s/%s (%d bytes)", bucket, dest_key, buf.tell())

        except Exception:
            logger.exception("Failed to process image: %s", key)
            raise

    return {"statusCode": 200, "body": "OK"}
