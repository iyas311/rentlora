# --- AWS SES (Simple Email Service) ---
# Verifies a single email address so you can send test emails in dev mode.
# In production, you would verify an entire domain (aws_ses_domain_identity).
resource "aws_ses_email_identity" "admin" {
  email = var.admin_email
}

# --- AWS SNS (Simple Notification Service) ---
# Creates a topic that the Python backend can publish SMS/Alerts to.
resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"

  tags = {
    Environment = var.environment
  }
}
