output "cloudfront_domain_name" {
  description = "The CloudFront Domain Name for the application"
  value       = module.cdn.cloudfront_domain_name
}

output "external_alb_dns" {
  description = "The DNS name of the External Application Load Balancer"
  value       = module.load_balancing.ext_alb_dns_name
}

output "rds_endpoint" {
  description = "The RDS PostgreSQL endpoint"
  value       = module.database.db_endpoint
}
