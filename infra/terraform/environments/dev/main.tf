provider "aws" {
  region = "us-east-1"
}

locals {
  project_name = "rentlora"
  environment  = "dev"
  ami_id       = "ami-091138d0f0d41ff90"
  key_name     = "iyas-private"
  repo_url     = "https://github.com/iyas311/rentlora.git"
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

  domain_name = "rentlora.in"
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
  ami_id                    = local.ami_id
  key_name                  = local.key_name
  repo_url                  = local.repo_url
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
  admin_email  = var.admin_email
}

resource "aws_route53_record" "app" {
  zone_id = module.domain.zone_id
  name    = "dev.rentlora.in"
  type    = "A"

  alias {
    name                   = module.load_balancing.ext_alb_dns
    zone_id                = module.load_balancing.ext_alb_zone_id
    evaluate_target_health = true
  }
}

output "website_url" {
  value = module.domain.domain_url
}
