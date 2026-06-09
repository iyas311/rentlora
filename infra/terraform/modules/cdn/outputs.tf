output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.main.domain_name
  description = "The global CloudFront Distribution URL"
}

output "cloudfront_hosted_zone_id" {
  value       = aws_cloudfront_distribution.main.hosted_zone_id
  description = "The CloudFront Hosted Zone ID for Route53 Alias records"
}
