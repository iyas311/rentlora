
output "rds_endpoint" {
  description = "The RDS PostgreSQL endpoint"
  value       = module.database.db_endpoint
}
