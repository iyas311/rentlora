terraform {
  backend "s3" {
    bucket         = "rentlora-terraform-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "rentlora-terraform-locks-dev"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  project_name = "rentlora"
  environment  = "dev"
}

module "networking" {
  source = "../../modules/networking"

  project_name     = "${local.project_name}-${local.environment}"
  vpc_cidr         = "10.0.0.0/16"
  azs              = ["us-east-1a", "us-east-1b"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
  frontend_subnets = ["10.0.11.0/24", "10.0.12.0/24"]
  backend_subnets  = ["10.0.21.0/24", "10.0.22.0/24"]
  db_subnets       = ["10.0.31.0/24", "10.0.32.0/24"]
}

module "security" {
  source = "../../modules/security"

  project_name = "${local.project_name}-${local.environment}"
  vpc_id       = module.networking.vpc_id
}

module "database" {
  source = "../../modules/database"

  project_name  = local.project_name
  environment   = local.environment
  db_subnet_ids = module.networking.db_subnet_ids
  rds_sg_id     = module.security.rds_sg_id
  db_password   = var.db_password
}

module "storage" {
  source = "../../modules/storage"

  project_name = local.project_name
  environment  = local.environment
}

module "domain" {
  source = "../../modules/domain"

  domain_name = var.domain_name
  environment = local.environment
}

module "load_balancing" {
  source = "../../modules/load_balancing"

  project_name        = local.project_name
  environment         = local.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  frontend_subnet_ids = module.networking.frontend_subnet_ids
  ext_alb_sg_id       = module.security.ext_alb_sg_id
  int_alb_sg_id       = module.security.int_alb_sg_id
  certificate_arn     = module.domain.certificate_arn
}

module "compute" {
  source = "../../modules/compute"

  project_name              = "${local.project_name}-${local.environment}"
  environment               = local.environment
  ami_id                    = var.ami_id
  key_name                  = var.key_name
  repo_url                  = "https://github.com/iyas311/rentlora.git"
  frontend_subnet_ids       = module.networking.frontend_subnet_ids
  backend_subnet_ids        = module.networking.backend_subnet_ids
  frontend_sg_id            = module.security.frontend_ec2_sg_id
  backend_sg_id             = module.security.backend_ec2_sg_id
  frontend_tg_arn           = module.load_balancing.frontend_tg_arn
  backend_properties_tg_arn = module.load_balancing.backend_properties_tg_arn
  backend_bookings_tg_arn   = module.load_balancing.backend_bookings_tg_arn
  backend_ai_tg_arn         = module.load_balancing.backend_ai_tg_arn
  int_alb_dns               = module.load_balancing.int_alb_dns
  ec2_instance_profile_name = module.security.ec2_instance_profile_name
}

module "monitoring" {
  source = "../../modules/monitoring"

  project_name = local.project_name
  environment  = local.environment
}

module "notifications" {
  source = "../../modules/notifications"

  project_name = local.project_name
  environment  = local.environment
  admin_emails = var.admin_emails
}

# --- 8. CONTAINER REGISTRY ---
module "registry" {
  source = "../../modules/registry"

  project_name = local.project_name
  environment  = local.environment
}

# --- 9. GLOBAL SHIELD (CLOUDFRONT) ---
module "cdn" {
  source = "../../modules/cdn"

  project_name    = local.project_name
  environment     = local.environment
  domain_name     = var.domain_name
  alb_domain_name = module.load_balancing.ext_alb_dns
  certificate_arn = module.domain.certificate_arn
}

resource "aws_route53_record" "app" {
  zone_id = module.domain.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.cdn.cloudfront_domain_name
    zone_id                = module.cdn.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "www" {
  zone_id = module.domain.zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cdn.cloudfront_domain_name
    zone_id                = module.cdn.cloudfront_hosted_zone_id
    evaluate_target_health = false
  }
}

output "website_url" {
  value       = module.domain.domain_url
  description = "The main entrypoint for the application"
}

output "database_endpoint" {
  value       = module.database.db_endpoint
  description = "The direct connection string for the PostgreSQL Database"
}

output "internal_api_endpoint" {
  value       = module.load_balancing.int_alb_dns
  description = "The internal Load Balancer DNS used by microservices to talk to each other"
}

output "s3_bucket" {
  value       = module.storage.s3_bucket_id
  description = "The private S3 bucket holding property images"
}

output "cloudfront_cdn_domain" {
  value       = module.storage.cloudfront_domain
  description = "The CloudFront Global CDN URL that serves the images"
}
