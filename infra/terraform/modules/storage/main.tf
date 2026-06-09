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
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/*"
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
