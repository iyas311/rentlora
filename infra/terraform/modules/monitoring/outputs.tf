output "backend_log_group_name" {
  value       = aws_cloudwatch_log_group.backend_logs.name
  description = "The name of the backend log group"
}

output "frontend_log_group_name" {
  value       = aws_cloudwatch_log_group.frontend_logs.name
  description = "The name of the frontend log group"
}
