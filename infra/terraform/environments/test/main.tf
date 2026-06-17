terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

data "aws_caller_identity" "current" {}

# 1. Networking (VPC, Subnets)
module "networking" {
  source           = "../../modules/networking"
  project_name     = var.project_name
  vpc_cidr         = "10.0.0.0/16"
  azs              = ["us-east-1a", "us-east-1b"]
  public_subnets   = ["10.0.1.0/24"] # Single AZ for EC2
  frontend_subnets = []
  backend_subnets  = []
  db_subnets       = ["10.0.31.0/24", "10.0.32.0/24"] # RDS requires 2 AZs
}

# 2. Security (Security Groups, IAM Roles)
module "security" {
  source       = "../../modules/security"
  project_name = var.project_name
  environment  = var.environment
  vpc_id       = module.networking.vpc_id
}

# 3. Database (RDS PostgreSQL)
module "database" {
  source        = "../../modules/database"
  project_name  = var.project_name
  environment   = var.environment
  vpc_id        = module.networking.vpc_id
  db_subnet_ids = module.networking.db_subnet_ids
  rds_sg_id     = module.security.rds_sg_id
  db_username   = var.db_username
  db_password   = var.db_password
}

# 4. Storage (S3 Buckets)
module "storage" {
  source       = "../../modules/storage"
  project_name = var.project_name
  environment  = var.environment
}

# 5. Single EC2 Node (Replaces ALB + ASG)
data "aws_ami" "ubuntu" {
  most_recent = true
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
  owners = ["099720109477"] # Canonical
}

resource "aws_instance" "app_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.medium"
  subnet_id     = module.networking.public_subnet_ids[0]
  
  vpc_security_group_ids = [
    module.security.ext_alb_sg_id, # Allows 80/443 from internet
    module.security.frontend_ec2_sg_id,
    module.security.backend_ec2_sg_id
  ]
  
  iam_instance_profile = module.security.ec2_instance_profile_name

  user_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose git awscli jq

    # Configure Docker to send logs to CloudWatch
    cat << 'DOCKER_CFG' | sudo tee /etc/docker/daemon.json
    {
      "log-driver": "awslogs",
      "log-opts": {
        "awslogs-region": "us-east-1",
        "awslogs-group": "/rentlora/${var.environment}/single-node"
      }
    }
    DOCKER_CFG
    sudo systemctl restart docker

    # Log into AWS ECR
    aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com

    mkdir -p /home/ubuntu/rentlora
    cd /home/ubuntu/rentlora

    # Generate custom NGINX config for single node proxying
    cat << 'NGINX' > nginx.conf
    events {}
    http {
      resolver 127.0.0.11 valid=5s;
      include /etc/nginx/mime.types;
      server {
        listen 80;
        client_max_body_size 50M;
        root /usr/share/nginx/html;
        index index.html;
        location / {
          try_files $$uri $$uri/ /index.html;
        }
        location /api/properties {
          proxy_pass http://property-service:8001;
        }
        location /api/search {
          proxy_pass http://property-service:8001;
        }
        location /api/reviews {
          proxy_pass http://property-service:8001;
        }
        location /api/auth {
          proxy_pass http://booking-service:8002;
        }
        location /api/users {
          proxy_pass http://booking-service:8002;
        }
        location /api/bookings {
          proxy_pass http://booking-service:8002;
        }
        location /api/ai {
          proxy_pass http://ai-service:8003;
        }
        location /api/admin {
          proxy_pass http://admin-service:8004;
        }
        location /uploads/ {
          proxy_pass http://property-service:8001;
        }
      }
    }
    NGINX

    # Generate Docker Compose
    cat << 'COMPOSE' > docker-compose.yml
    version: "3.9"
    services:
      frontend:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-frontend:latest
        ports:
          - "80:80"
        volumes:
          - ./nginx.conf:/etc/nginx/nginx.conf
        restart: always

      property-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-property-service:latest
        environment:
          - ENV=${var.environment}
          - DATABASE_URL=${module.database.db_endpoint}
          - JWT_SECRET=${var.jwt_secret}
        restart: always

      booking-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-booking-service:latest
        environment:
          - ENV=${var.environment}
          - DATABASE_URL=${module.database.db_endpoint}
          - JWT_SECRET=${var.jwt_secret}
        restart: always

      ai-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-ai-service:latest
        environment:
          - ENV=${var.environment}
          - JWT_SECRET=${var.jwt_secret}
        restart: always

      admin-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-admin-service:latest
        environment:
          - ENV=${var.environment}
          - DATABASE_URL=${module.database.db_endpoint}
          - JWT_SECRET=${var.jwt_secret}
        restart: always
    COMPOSE

    sudo docker compose pull
    sudo docker compose up -d
  EOF
  )

  tags = {
    Name = "${var.project_name}-test-single-node"
  }
}

output "app_url" {
  value       = "http://${aws_instance.app_server.public_ip}"
  description = "The public IP URL to access the test application"
}
