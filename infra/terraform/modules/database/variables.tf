variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "db_subnet_ids" {
  type        = list(string)
  description = "List of DB subnet IDs"
}

variable "rds_sg_id" {
  type        = string
  description = "Security Group ID for RDS"
}

variable "db_username" {
  type        = string
  description = "Master username for RDS"
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS"
  sensitive   = true
}
