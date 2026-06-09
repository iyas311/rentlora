variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "admin_email" {
  type        = string
  description = "Email address to verify in SES for testing/sending emails"
}
