variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev or prod)"
}

variable "admin_emails" {
  type        = list(string)
  description = "A list of email addresses to verify in SES for testing/sending emails"
}
