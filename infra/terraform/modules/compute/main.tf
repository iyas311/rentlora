data "aws_caller_identity" "current" {}

# --- FRONTEND LAUNCH TEMPLATE ---
resource "aws_launch_template" "frontend" {
  name_prefix   = "${var.project_name}-frontend-"
  image_id      = var.ami_id
  instance_type = "t3.micro"
  key_name      = var.key_name

  vpc_security_group_ids = [var.frontend_sg_id]

  iam_instance_profile {
    name = var.ec2_instance_profile_name
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose git awscli jq

    # Get Internal ALB DNS from Terraform variable
    export INT_ALB_DNS="${var.int_alb_dns}"

    # Configure Docker to send logs to CloudWatch
    cat << 'DOCKER_CFG' | sudo tee /etc/docker/daemon.json
    {
      "log-driver": "awslogs",
      "log-opts": {
        "awslogs-region": "us-east-1",
        "awslogs-group": "/rentlora/${var.environment}/frontend"
      }
    }
    DOCKER_CFG
    sudo systemctl restart docker

    # Log into AWS ECR
    aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com

    # Pull and run the pre-built Frontend image
    sudo docker pull ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-frontend:latest
    sudo docker run -d --name frontend -p 80:80 \
      -e INT_ALB_DNS="${var.int_alb_dns}" \
      ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-frontend:latest
  EOF
  )
}

# --- FRONTEND AUTO SCALING GROUP ---
resource "aws_autoscaling_group" "frontend" {
  name                = "${var.project_name}-frontend-asg"
  vpc_zone_identifier = var.frontend_subnet_ids
  target_group_arns   = [var.frontend_tg_arn]

  min_size         = 1
  max_size         = 2
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.frontend.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-frontend"
    propagate_at_launch = true
  }
}

# --- FRONTEND SCALING POLICY (CPU) ---
resource "aws_autoscaling_policy" "frontend_cpu" {
  name                   = "${var.project_name}-frontend-cpu-policy"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.frontend.name

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# --- BACKEND LAUNCH TEMPLATE ---
resource "aws_launch_template" "backend" {
  name_prefix   = "${var.project_name}-backend-"
  image_id      = var.ami_id
  instance_type = "t3.small"
  key_name      = var.key_name

  vpc_security_group_ids = [var.backend_sg_id]

  iam_instance_profile {
    name = var.ec2_instance_profile_name
  }

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
        "awslogs-group": "/rentlora/${var.environment}/backend"
      }
    }
    DOCKER_CFG
    sudo systemctl restart docker

    # Log into AWS ECR
    aws ecr get-login-password --region us-east-1 | sudo docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com

    # Create the production docker-compose file dynamically
    mkdir -p /home/ubuntu/rentlora/backend
    cd /home/ubuntu/rentlora/backend

    cat << 'COMPOSE' > docker-compose.yml
    version: "3.9"
    services:
      property-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-property-service:latest
        ports:
          - "8001:8001"
        environment:
          - ENV=${var.environment}
        restart: always

      booking-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-booking-service:latest
        ports:
          - "8002:8002"
        environment:
          - ENV=${var.environment}
        restart: always

      ai-service:
        image: ${data.aws_caller_identity.current.account_id}.dkr.ecr.us-east-1.amazonaws.com/rentlora-${var.environment}-ai-service:latest
        ports:
          - "8003:8003"
        environment:
          - ENV=${var.environment}
        restart: always
    COMPOSE

    sudo docker compose pull
    sudo docker compose up -d
  EOF
  )
}

# --- BACKEND AUTO SCALING GROUP ---
resource "aws_autoscaling_group" "backend" {
  name                = "${var.project_name}-backend-asg"
  vpc_zone_identifier = var.backend_subnet_ids
  
  # Attach all three backend target groups
  target_group_arns = [
    var.backend_properties_tg_arn,
    var.backend_bookings_tg_arn,
    var.backend_ai_tg_arn
  ]

  min_size         = 1
  max_size         = 2
  desired_capacity = 1

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${var.project_name}-backend"
    propagate_at_launch = true
  }
}

# --- BACKEND SCALING POLICY (CPU) ---
resource "aws_autoscaling_policy" "backend_cpu" {
  name                   = "${var.project_name}-backend-cpu-policy"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.backend.name

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
