output "db_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "The connection endpoint for the RDS instance"
}

output "db_name" {
  value       = aws_db_instance.postgres.db_name
  description = "The name of the database"
}
