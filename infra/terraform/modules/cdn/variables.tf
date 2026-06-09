variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "domain_name" {
  type        = string
  description = "The root domain name (e.g., rentlora.in)"
}

variable "alb_domain_name" {
  type        = string
  description = "The DNS name of the External Application Load Balancer"
}

variable "certificate_arn" {
  type        = string
  description = "The ARN of the ACM certificate in us-east-1"
}
