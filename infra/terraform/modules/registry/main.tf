locals {
  # These are the microservices that need Docker images
  repositories = [
    "frontend",
    "booking-service",
    "property-service",
    "ai-service",
    "admin-service",
    "search-service"
  ]
}

# Create an ECR Repository for each microservice dynamically
resource "aws_ecr_repository" "repos" {
  for_each = toset(local.repositories)

  # Example: rentlora-dev-frontend
  name                 = "${var.project_name}-${var.environment}-${each.key}"
  image_tag_mutability = "MUTABLE"

  # Automatically scan images for vulnerabilities when pushed (Great for security!)
  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Environment = var.environment
    Service     = each.key
    ManagedBy   = "Terraform"
  }
}
