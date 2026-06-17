
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

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

# --- CLOUDFRONT ORIGIN ACCESS CONTROL ---
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for Property Images Bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- CLOUDFRONT DISTRIBUTION ---
resource "aws_cloudfront_distribution" "cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = ""

  origin {
    domain_name              = aws_s3_bucket.images.bucket_regional_domain_name
    origin_id                = aws_s3_bucket.images.id
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = aws_s3_bucket.images.id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 3600
    max_ttl                = 86400
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name        = "${var.project_name}-cdn"
    Environment = var.environment
  }
}

# --- ALLOW CLOUDFRONT TO READ PRIVATE BUCKET ---
resource "aws_s3_bucket_policy" "cloudfront_read" {
  bucket = aws_s3_bucket.images.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.images.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn.arn
          }
        }
      }
    ]
  })
}

# --- SSM PARAMETER STORE ---
resource "aws_ssm_parameter" "s3_bucket_name" {
  name        = "/rentlora/${var.environment}/s3-image-bucket"
  description = "The S3 bucket name for property images"
  type        = "String"
  value       = aws_s3_bucket.images.id
}

resource "aws_ssm_parameter" "cloudfront_domain" {
  name        = "/rentlora/${var.environment}/cloudfront-domain"
  description = "The CloudFront Domain Name for S3"
  type        = "String"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

# =============================================================
# S3 CORS — Required for presigned URL uploads from the browser
# =============================================================

resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    max_age_seconds = 3600
  }

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
  }
}

# =============================================================
# LAMBDA — Auto-resize images on S3 upload
# =============================================================

# We will use a pre-zipped file instead of the hashicorp/archive provider

# IAM role for Lambda
resource "aws_iam_role" "resize_lambda" {
  name = "${var.project_name}-${var.environment}-resize-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Lambda needs to read/write S3 and write CloudWatch Logs
resource "aws_iam_role_policy" "resize_lambda_s3" {
  name = "s3-read-write"
  role = aws_iam_role.resize_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "resize_lambda_logs" {
  role       = aws_iam_role.resize_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda function
resource "aws_lambda_function" "resize" {
  function_name    = "${var.project_name}-${var.environment}-image-resize"
  description      = "Auto-resize property images into thumbnail and medium variants"
  role             = aws_iam_role.resize_lambda.arn
  handler          = "resize.handler"
  runtime          = "python3.11"
  timeout          = 60
  memory_size      = 512
  filename         = "${path.module}/lambda/resize.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda/resize.zip")

  layers = [
    # Klayers — community-maintained Lambda layer for Pillow on Python 3.11
    "arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-Pillow:8"
  ]

  tags = {
    Name        = "${var.project_name}-image-resize"
    Environment = var.environment
  }
}

# Allow S3 to invoke the Lambda function
resource "aws_lambda_permission" "s3_invoke" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.resize.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.images.arn
}

# S3 event notification — trigger Lambda on PutObject in originals/
resource "aws_s3_bucket_notification" "resize_trigger" {
  bucket = aws_s3_bucket.images.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.resize.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "originals/"
  }

  depends_on = [aws_lambda_permission.s3_invoke]
}
