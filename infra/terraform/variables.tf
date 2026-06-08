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
