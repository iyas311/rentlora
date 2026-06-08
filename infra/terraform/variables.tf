variable "db_password" {
  description = "Database password used for the Rentlora RDS instance and service DATABASE_URL values."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret shared by the backend services."
  type        = string
  sensitive   = true
}

variable "xai_api_key" {
  description = "xAI Grok API key used by the ai-service."
  type        = string
  sensitive   = true
  default     = ""
}
