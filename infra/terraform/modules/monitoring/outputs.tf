output "backend_log_group_name" {
  value       = aws_cloudwatch_log_group.backend_logs.name
  description = "The name of the backend log group"
}

output "frontend_log_group_name" {
  value       = aws_cloudwatch_log_group.frontend_logs.name
  description = "The name of the frontend log group"
}

output "dashboard_url" {
  value       = "https://us-east-1.console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
  description = "Direct link to the CloudWatch monitoring dashboard"
}
