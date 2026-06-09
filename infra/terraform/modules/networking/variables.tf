variable "project_name" {
  type        = string
  description = "The name of the project (e.g. rentlora)"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
}

variable "azs" {
  type        = list(string)
  description = "Availability Zones to use"
}

variable "public_subnets" {
  type        = list(string)
  description = "CIDR blocks for public subnets"
}

variable "frontend_subnets" {
  type        = list(string)
  description = "CIDR blocks for private frontend subnets"
}

variable "backend_subnets" {
  type        = list(string)
  description = "CIDR blocks for private backend subnets"
}

variable "db_subnets" {
  type        = list(string)
  description = "CIDR blocks for private database subnets"
}
