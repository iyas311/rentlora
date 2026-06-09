output "ses_identity_arns" {
  value       = [for identity in aws_ses_email_identity.admin : identity.arn]
  description = "The ARNs of the verified SES identities"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "The ARN of the SNS topic"
}
