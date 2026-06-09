output "ses_identity_arn" {
  value       = aws_ses_email_identity.admin.arn
  description = "The ARN of the SES identity"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "The ARN of the SNS topic"
}
