# --- ROUTE 53 HOSTED ZONE ---
# Assumes the domain is already registered in Route53
data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

locals {
  # The user wants the dev environment to act as the main site for now.
  subdomain = var.domain_name
}

# --- ACM CERTIFICATE ---
resource "aws_acm_certificate" "cert" {
  domain_name       = local.subdomain
  validation_method = "DNS"

  # Always cover www.rentlora.in so the website is fully accessible
  subject_alternative_names = ["www.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = true
  }

  tags = {
    Environment = var.environment
  }
}

# --- DNS VALIDATION RECORDS ---
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.cert.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for validation to complete
resource "aws_acm_certificate_validation" "cert" {
  certificate_arn         = aws_acm_certificate.cert.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}
