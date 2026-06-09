variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnets for External ALB"
}

variable "frontend_subnet_ids" {
  type        = list(string)
  description = "Private frontend subnets for Internal ALB"
}

variable "ext_alb_sg_id" {
  type        = string
  description = "Security Group ID for External ALB"
}

variable "int_alb_sg_id" {
  type        = string
  description = "Security Group ID for Internal ALB"
}
