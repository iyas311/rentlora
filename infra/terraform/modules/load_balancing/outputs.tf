output "ext_alb_dns" {
  value       = aws_lb.external.dns_name
  description = "The DNS name of the external load balancer"
}

output "ext_alb_zone_id" {
  value       = aws_lb.external.zone_id
  description = "The Route53 Zone ID of the external load balancer"
}

output "ext_alb_arn_suffix" {
  value       = aws_lb.external.arn_suffix
  description = "ARN suffix of the external ALB (for CloudWatch metrics)"
}

output "int_alb_dns" {
  value       = aws_lb.internal.dns_name
  description = "The DNS name of the internal load balancer"
}

output "int_alb_arn_suffix" {
  value       = aws_lb.internal.arn_suffix
  description = "ARN suffix of the internal ALB (for CloudWatch metrics)"
}

output "frontend_tg_arn" {
  value       = aws_lb_target_group.frontend.arn
  description = "ARN of the frontend target group"
}

output "frontend_tg_arn_suffix" {
  value       = aws_lb_target_group.frontend.arn_suffix
  description = "ARN suffix of the frontend target group (for CloudWatch metrics)"
}

output "backend_properties_tg_arn" {
  value       = aws_lb_target_group.backend_properties.arn
}

output "backend_properties_tg_arn_suffix" {
  value       = aws_lb_target_group.backend_properties.arn_suffix
  description = "ARN suffix of the backend properties target group (for CloudWatch metrics)"
}

output "backend_bookings_tg_arn" {
  value       = aws_lb_target_group.backend_bookings.arn
}

output "backend_ai_tg_arn" {
  value       = aws_lb_target_group.backend_ai.arn
}

output "backend_admin_tg_arn" {
  value       = aws_lb_target_group.backend_admin.arn
}
