# The Global CloudFront Distribution acting as the Main Entry Point and Shield
resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  is_ipv6_enabled     = true
  aliases             = var.domain_name != null ? [var.domain_name, "www.${var.domain_name}"] : []
  
  # Point CloudFront to the External ALB
  origin {
    domain_name = var.alb_domain_name
    origin_id   = "ExternalALB"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = var.certificate_arn != null ? "https-only" : "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods  = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "ExternalALB"

    # Forward everything to the ALB (important for APIs and dynamic React routing)
    forwarded_values {
      query_string = true
      headers      = ["*"]
      cookies {
        forward = "all"
      }
    }

    viewer_protocol_policy = var.certificate_arn != null ? "redirect-to-https" : "allow-all"
    
    # We set TTLs to 0 because the React App and API are dynamic.
    # We want CloudFront to act as a security shield (WAF) and SSL terminator, 
    # not a static cache for the dynamic content.
    min_ttl                = 0
    default_ttl            = 0 
    max_ttl                = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.certificate_arn != null ? [1] : []
    content {
      acm_certificate_arn      = var.certificate_arn
      ssl_support_method       = "sni-only"
      minimum_protocol_version = "TLSv1.2_2021"
    }
  }

  dynamic "viewer_certificate" {
    for_each = var.certificate_arn == null ? [1] : []
    content {
      cloudfront_default_certificate = true
    }
  }

  # NOTE: In the future, you can attach an aws_wafv2_web_acl here using the `web_acl_id` argument!

  tags = {
    Name        = "${var.project_name}-global-shield"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
