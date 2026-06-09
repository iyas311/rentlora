output "s3_bucket_id" {
  value       = aws_s3_bucket.images.id
  description = "The name of the bucket"
}

output "s3_bucket_arn" {
  value       = aws_s3_bucket.images.arn
  description = "The ARN of the bucket"
}

output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "The CloudFront Domain Name"
}
