# --- S3 BUCKET FOR IMAGES ---
resource "aws_s3_bucket" "images" {
  bucket = "${var.project_name}-${var.environment}-property-images"

  tags = {
    Name        = "${var.project_name}-property-images"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_ownership_controls" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket = aws_s3_bucket.images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.images.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
  
  depends_on = [aws_s3_bucket_public_access_block.images]
}

# --- SSM PARAMETER STORE ---
# The backend Python code uses boto3 to fetch this parameter to know where to upload!
resource "aws_ssm_parameter" "s3_bucket_name" {
  name        = "/rentlora/${var.environment}/s3-image-bucket"
  description = "The S3 bucket name for property images"
  type        = "String"
  value       = aws_s3_bucket.images.id
}
