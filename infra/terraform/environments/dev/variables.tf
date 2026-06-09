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
