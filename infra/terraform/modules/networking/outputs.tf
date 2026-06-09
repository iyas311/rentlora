output "vpc_id" {
  value       = aws_vpc.main.id
  description = "The ID of the VPC"
}

output "public_subnet_ids" {
  value       = aws_subnet.public[*].id
  description = "IDs of the public subnets"
}

output "frontend_subnet_ids" {
  value       = aws_subnet.frontend[*].id
  description = "IDs of the private frontend subnets"
}

output "backend_subnet_ids" {
  value       = aws_subnet.backend[*].id
  description = "IDs of the private backend subnets"
}

output "db_subnet_ids" {
  value       = aws_subnet.db[*].id
  description = "IDs of the private database subnets"
}
