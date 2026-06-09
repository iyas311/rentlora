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

    git clone ${var.repo_url} /home/ubuntu/rentlora
    cd /home/ubuntu/rentlora/frontend

    # OVERWRITE NGINX FOR AWS INTERNAL ALB
    cat << 'NGINX' > nginx.conf
    events {}
    http {
      resolver 169.254.169.253 valid=5s;
      include /etc/nginx/mime.types;
      server {
        listen 80;
        client_max_body_size 50M;
        root /usr/share/nginx/html;
        index index.html;
        location / {
          try_files $$uri $$uri/ /index.html;
        }
        location /api/ {
          proxy_pass http://${var.int_alb_dns}:80;
        }
        location /uploads/ {
          proxy_pass http://${var.int_alb_dns}:80;
        }
      }
    }
    NGINX

    # Build the image
    sudo docker build -t rentlora-frontend .

    # Run the container
    sudo docker run -d -p 80:80 rentlora-frontend
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
  instance_type = "t3.micro"
  key_name      = var.key_name

  vpc_security_group_ids = [var.backend_sg_id]

  iam_instance_profile {
    name = var.ec2_instance_profile_name
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    sudo apt-get update -y
    sudo apt-get install -y docker.io docker-compose git awscli jq

    git clone ${var.repo_url} /home/ubuntu/rentlora
    cd /home/ubuntu/rentlora/backend

    # Ensure ENV is set so config.py pulls from Secrets Manager/Parameter Store correctly
    echo "ENV=${var.environment}" > .env

    sudo docker compose up -d --build
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
