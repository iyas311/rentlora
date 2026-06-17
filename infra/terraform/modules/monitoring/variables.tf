variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "sns_topic_arn" {
  type        = string
  description = "SNS topic ARN for alarm notifications"
}

variable "ext_alb_arn_suffix" {
  type        = string
  description = "ARN suffix of the external ALB (from aws_lb.external.arn_suffix)"
}

variable "int_alb_arn_suffix" {
  type        = string
  description = "ARN suffix of the internal ALB (from aws_lb.internal.arn_suffix)"
}

variable "rds_instance_id" {
  type        = string
  description = "RDS instance identifier (e.g. 'rentlora-db')"
}

variable "backend_tg_arn_suffix" {
  type        = string
  description = "ARN suffix of a backend target group (for healthy/unhealthy host metrics)"
}

variable "frontend_tg_arn_suffix" {
  type        = string
  description = "ARN suffix of the frontend target group"
}
