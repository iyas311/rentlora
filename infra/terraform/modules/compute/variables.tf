variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment string (e.g. dev or prod)"
}

variable "ami_id" {
  type        = string
  description = "AMI ID for instances"
}

variable "key_name" {
  type        = string
  description = "SSH Key name"
}

variable "repo_url" {
  type        = string
  description = "GitHub repository URL"
}

variable "frontend_subnet_ids" {
  type        = list(string)
  description = "Subnets for Frontend ASG"
}

variable "backend_subnet_ids" {
  type        = list(string)
  description = "Subnets for Backend ASG"
}

variable "frontend_sg_id" {
  type        = string
  description = "Security Group ID for Frontend EC2"
}

variable "backend_sg_id" {
  type        = string
  description = "Security Group ID for Backend EC2"
}

variable "frontend_tg_arn" {
  type        = string
  description = "Target Group ARN for Frontend"
}

variable "backend_properties_tg_arn" {
  type        = string
  description = "Target Group ARN for Backend Properties"
}

variable "backend_bookings_tg_arn" {
  type        = string
  description = "Target Group ARN for Backend Bookings"
}

variable "backend_ai_tg_arn" {
  type        = string
  description = "Target Group ARN for Backend AI"
}

variable "int_alb_dns" {
  type        = string
  description = "DNS name of the internal ALB for NGINX config"
}

variable "ec2_instance_profile_name" {
  type        = string
  description = "IAM Instance Profile for EC2 instances"
}
