output "certificate_arn" {
  value       = aws_acm_certificate_validation.cert.certificate_arn
  description = "The ARN of the validated ACM certificate"
}

output "domain_url" {
  value       = "https://${local.subdomain}"
  description = "The beautiful HTTPS URL for the app"
}

output "zone_id" {
  value       = data.aws_route53_zone.main.zone_id
  description = "The Route53 Hosted Zone ID"
}
