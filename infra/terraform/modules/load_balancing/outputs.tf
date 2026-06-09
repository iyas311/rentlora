output "ext_alb_dns" {
  value       = aws_lb.external.dns_name
  description = "The DNS name of the external load balancer"
}

output "ext_alb_zone_id" {
  value       = aws_lb.external.zone_id
  description = "The Route53 Zone ID of the external load balancer"
}

output "int_alb_dns" {
  value       = aws_lb.internal.dns_name
  description = "The DNS name of the internal load balancer"
}

output "frontend_tg_arn" {
  value       = aws_lb_target_group.frontend.arn
  description = "ARN of the frontend target group"
}

output "backend_properties_tg_arn" {
  value       = aws_lb_target_group.backend_properties.arn
}

output "backend_bookings_tg_arn" {
  value       = aws_lb_target_group.backend_bookings.arn
}

output "backend_ai_tg_arn" {
  value       = aws_lb_target_group.backend_ai.arn
}
