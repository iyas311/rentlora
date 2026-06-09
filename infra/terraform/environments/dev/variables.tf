variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "rentlora"
}

variable "domain_name" {
  description = "The root domain name"
  type        = string
  default     = "rentlora.in"
}

variable "ami_id" {
  description = "The AMI ID for EC2 instances"
  type        = string
}

variable "key_name" {
  description = "The SSH key pair name"
  type        = string
}

variable "repo_url" {
  description = "The GitHub repository URL"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "azs" {
  description = "List of Availability Zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "public_subnets" {
  description = "List of Public Subnet CIDRs"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "frontend_subnets" {
  description = "List of Frontend Subnet CIDRs"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "backend_subnets" {
  description = "List of Backend Subnet CIDRs"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "db_subnets" {
  description = "List of Database Subnet CIDRs"
  type        = list(string)
  default     = ["10.0.31.0/24", "10.0.32.0/24"]
}

variable "db_password" {
  description = "Database password used for the Rentlora RDS instance"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "xai_api_key" {
  description = "xAI Grok API key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_email" {
  description = "Your email address to verify in AWS SES for testing email sending"
  type        = string
}
