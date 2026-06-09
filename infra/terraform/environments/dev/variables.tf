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

variable "admin_emails" {
  description = "A list of email addresses to verify in AWS SES for testing email sending"
  type        = list(string)
}
