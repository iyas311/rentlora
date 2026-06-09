output "ecr_repository_urls" {
  value       = module.registry.repository_urls
  description = "The URLs of the newly created ECR repositories. Use these in your GitHub Actions pipeline!"
}
