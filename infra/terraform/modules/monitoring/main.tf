resource "aws_cloudwatch_log_group" "backend_logs" {
  name              = "/${var.project_name}/${var.environment}/backend"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "frontend_logs" {
  name              = "/${var.project_name}/${var.environment}/frontend"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}
