output "frontend_asg_name" {
  value       = aws_autoscaling_group.frontend.name
  description = "Name of the frontend Auto Scaling Group"
}

output "backend_asg_name" {
  value       = aws_autoscaling_group.backend.name
  description = "Name of the backend Auto Scaling Group"
}
