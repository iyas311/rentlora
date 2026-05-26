

locals {
  region         = "us-east-1"
  azs            = ["us-east-1a", "us-east-1b"]
  project        = "rentlora"
  vpc_cidr       = "10.0.0.0/16"
  public_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
  frontend_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
  backend_cidrs  = ["10.0.21.0/24", "10.0.22.0/24"]
  db_cidrs       = ["10.0.31.0/24", "10.0.32.0/24"]

  ami_id      = "ami-091138d0f0d41ff90"
  key_name    = "iyas-private"
  repo_url    = "https://github.com/iyas311/rentlora.git"
  db_password = "IyAs2458#Safe"
  jwt_secret  = "secret"
}

provider "aws" {
  region = local.region
}

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  tags = {
    Name = "${local.project}-vpc"
  }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags = {
    Name = "${local.project}-public-${count.index + 1}"
  }
}

resource "aws_subnet" "frontend" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.frontend_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = {
    Name = "${local.project}-frontend-${count.index + 1}"
  }
}

resource "aws_subnet" "backend" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.backend_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = {
    Name = "${local.project}-backend-${count.index + 1}"
  }
}

resource "aws_subnet" "db" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.db_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = {
    Name = "${local.project}-db-${count.index + 1}"
  }
}

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  subnet_id     = aws_subnet.public[0].id
  allocation_id = aws_eip.nat.id
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }
}

resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "frontend" {
  count          = 2
  subnet_id      = aws_subnet.frontend[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "backend" {
  count          = 2
  subnet_id      = aws_subnet.backend[count.index].id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "db" {
  count          = 2
  subnet_id      = aws_subnet.db[count.index].id
  route_table_id = aws_route_table.db.id
}

resource "aws_security_group" "ext_alb" {
  name   = "rentlora-ext-alb-sg"
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sg-ext-alb" }
}

resource "aws_security_group" "frontend" {
  name   = "rentlora-frontend-sg"
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sg-frontend" }
}

resource "aws_security_group" "int_alb" {
  name   = "rentlora-int-alb-sg"
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sg-int-alb" }
}

resource "aws_security_group" "backend" {
  name   = "rentlora-backend-sg"
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sg-backend" }
}

resource "aws_security_group" "db" {
  name   = "rentlora-db-sg"
  vpc_id = aws_vpc.main.id
  tags   = { Name = "sg-db" }
}

resource "aws_security_group_rule" "ext80" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ext_alb.id
}

resource "aws_security_group_rule" "ext443" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ext_alb.id
}

resource "aws_security_group_rule" "fe_from_ext" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ext_alb.id
  security_group_id        = aws_security_group.frontend.id
}

resource "aws_security_group_rule" "int_from_fe" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.frontend.id
  security_group_id        = aws_security_group.int_alb.id
}

resource "aws_security_group_rule" "be8001" {
  type                     = "ingress"
  from_port                = 8001
  to_port                  = 8001
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.int_alb.id
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "be8002" {
  type                     = "ingress"
  from_port                = 8002
  to_port                  = 8002
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.int_alb.id
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "be8001_from_ext_alb" {
  type                     = "ingress"
  from_port                = 8001
  to_port                  = 8001
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ext_alb.id
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "be8002_from_ext_alb" {
  type                     = "ingress"
  from_port                = 8002
  to_port                  = 8002
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ext_alb.id
  security_group_id        = aws_security_group.backend.id
}

resource "aws_security_group_rule" "db5432" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.backend.id
  security_group_id        = aws_security_group.db.id
}

resource "aws_security_group_rule" "ext_alb_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.ext_alb.id
}

resource "aws_security_group_rule" "frontend_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.frontend.id
}

resource "aws_security_group_rule" "int_alb_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.int_alb.id
}

resource "aws_security_group_rule" "backend_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.backend.id
}

resource "aws_security_group_rule" "db_egress_all" {
  type              = "egress"
  from_port         = 0
  to_port           = 0
  protocol          = "-1"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.db.id
}

resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "rentlora-db-subnet-group"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_db_instance" "main" {
  identifier              = "rentlora-db"
  engine                  = "postgres"
  engine_version          = "16"
  instance_class          = "db.t3.micro"
  allocated_storage       = 20
  db_name                 = "rentlora"
  username                = "rentlora_admin"
  password                = local.db_password
  publicly_accessible     = false
  skip_final_snapshot     = true
  vpc_security_group_ids  = [aws_security_group.db.id]
  db_subnet_group_name    = aws_db_subnet_group.db_subnet_group.name
  backup_retention_period = 7
}

resource "aws_lb_target_group" "tg_property" {
  name     = "tg-property"
  port     = 8001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/health"
  }
}

resource "aws_lb_target_group" "tg_booking" {
  name     = "tg-booking"
  port     = 8002
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/health"
  }
}

resource "aws_lb_target_group" "tg_frontend" {
  name     = "tg-frontend"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path    = "/"
    matcher = "200-399"
  }
}

resource "aws_lb_target_group" "tg_rental" {
  name     = "tg-rental"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path    = "/rental/"
    matcher = "200-399"
  }
}

resource "aws_lb" "internal" {
  name               = "rentlora-internal-alb"
  internal           = true
  load_balancer_type = "application"
  subnets            = aws_subnet.backend[*].id
  security_groups    = [aws_security_group.int_alb.id]
}

resource "aws_lb_listener" "internal80" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      status_code  = "404"
      message_body = "not found"
    }
  }
}

resource "aws_lb_listener_rule" "r1" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 1
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_property.arn
  }
  condition {
    path_pattern {
      values = ["/properties*"]
    }
  }
}

resource "aws_lb_listener_rule" "r2" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 2
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_property.arn
  }
  condition {
    path_pattern {
      values = ["/search*"]
    }
  }
}

resource "aws_lb_listener_rule" "r3" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 3
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_property.arn
  }
  condition {
    path_pattern {
      values = ["/reviews*"]
    }
  }
}

resource "aws_lb_listener_rule" "r4" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 4
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_booking.arn
  }
  condition {
    path_pattern {
      values = ["/auth*"]
    }
  }
}

resource "aws_lb_listener_rule" "r5" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 5
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_booking.arn
  }
  condition {
    path_pattern {
      values = ["/users*"]
    }
  }
}

resource "aws_lb_listener_rule" "r6" {
  listener_arn = aws_lb_listener.internal80.arn
  priority     = 6
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_booking.arn
  }
  condition {
    path_pattern {
      values = ["/bookings*"]
    }
  }
}

resource "aws_launch_template" "lt_backend" {
  name_prefix            = "lt-backend-"
  image_id               = local.ami_id
  instance_type          = "t3.small"
  key_name               = local.key_name
  vpc_security_group_ids = [aws_security_group.backend.id]
  user_data = base64encode(<<-EOF
    #!/bin/bash
    # force refresh 5
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y git python3 python3-pip build-essential libpq-dev postgresql-client
    mkdir -p /opt
    git clone ${local.repo_url} /opt/rentlora || true
    
    # Force install python dependencies
    cd /opt/rentlora/property-service && pip3 install --break-system-packages -r requirements.txt
    cd /opt/rentlora/booking-service && pip3 install --break-system-packages -r requirements.txt
    
    # Automatically initialize Database Schema
    export PGPASSWORD="${local.db_password}"
    psql -h ${aws_db_instance.main.address} -U rentlora_admin -d rentlora -f /opt/rentlora/schema.sql || true
    
    cat > /opt/rentlora/property-service/.env <<ENV
    DATABASE_URL=postgresql+asyncpg://rentlora_admin:${local.db_password}@${aws_db_instance.main.address}:5432/rentlora
    JWT_SECRET=${local.jwt_secret}
    UPLOADS_DIR=./uploads
    AWS_DEFAULT_REGION=us-east-1
    ENV=production
    ENV
    cat > /opt/rentlora/booking-service/.env <<ENV
    DATABASE_URL=postgresql+asyncpg://rentlora_admin:${local.db_password}@${aws_db_instance.main.address}:5432/rentlora
    JWT_SECRET=${local.jwt_secret}
    AWS_DEFAULT_REGION=us-east-1
    ENV=production
    ENV
    cat > /etc/systemd/system/property.service <<UNIT
    [Unit]
    Description=Property Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/rentlora/property-service
    EnvironmentFile=/opt/rentlora/property-service/.env
    ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    cat > /etc/systemd/system/booking.service <<UNIT
    [Unit]
    Description=Booking Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/rentlora/booking-service
    EnvironmentFile=/opt/rentlora/booking-service/.env
    ExecStart=/usr/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8002 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    systemctl daemon-reload
    systemctl enable --now property booking
  EOF
  )
}

resource "aws_launch_template" "lt_frontend" {
  name_prefix            = "lt-frontend-"
  image_id               = "ami-0221670218e6a86e9"
  instance_type          = "t3.small"
  key_name               = local.key_name
  vpc_security_group_ids = [aws_security_group.frontend.id]
  user_data = base64encode(<<-EOF
    #!/bin/bash
    # force refresh to trigger ASG 3
    cat > /etc/nginx/conf.d/rentlora.conf <<'NGINX'
    server {
      listen 80;
      root /var/www/html;
      
      location / { try_files $uri $uri/ /index.html; }
      
      location /uploads { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /properties { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /search { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /reviews { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /auth { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /users { proxy_pass http://${aws_lb.internal.dns_name}; }
      location /bookings { proxy_pass http://${aws_lb.internal.dns_name}; }
    }
    NGINX
    systemctl restart nginx
  EOF
  )
}

resource "aws_autoscaling_group" "asg_backend" {
  name                      = "asg-backend"
  tag {
    key                 = "Name"
    value               = "rentlora-backend"
    propagate_at_launch = true
  }
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.backend[*].id
  target_group_arns         = [aws_lb_target_group.tg_property.arn, aws_lb_target_group.tg_booking.arn]
  health_check_type         = "EC2"
  health_check_grace_period = 600
  launch_template {
    id      = aws_launch_template.lt_backend.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_group" "asg_frontend" {
  name                      = "asg-frontend"
  tag {
    key                 = "Name"
    value               = "rentlora-frontend"
    propagate_at_launch = true
  }
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.frontend[*].id
  target_group_arns         = [aws_lb_target_group.tg_frontend.arn]
  health_check_type         = "EC2"
  health_check_grace_period = 600
  launch_template {
    id      = aws_launch_template.lt_frontend.id
    version = "$Latest"
  }
}

resource "aws_launch_template" "lt_rental" {
  name_prefix            = "lt-rental-"
  image_id               = local.ami_id
  instance_type          = "t3.small"
  key_name               = local.key_name
  vpc_security_group_ids = [aws_security_group.frontend.id]
  user_data = base64encode(<<-EOF
    #!/bin/bash
    # force refresh 5
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
    mkdir -p /var/www/html/rental
    cat > /var/www/html/rental/index.html <<'HTML'
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rentlora | Premium Stays</title>
        <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background: #ffffff; color: #222222; }
            header { padding: 20px 40px; border-bottom: 1px solid #ebebeb; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 800; color: #FF385C; letter-spacing: -1px; text-decoration: none; }
            .hero { padding: 80px 40px; text-align: center; background: linear-gradient(180deg, #fff 0%, #f7f7f7 100%); }
            h1 { font-size: 48px; font-weight: 800; margin: 0 0 20px; line-height: 1.2; letter-spacing: -1px; }
            p { font-size: 20px; color: #717171; margin-bottom: 40px; max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.5; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 30px; padding: 40px; max-width: 1200px; margin: 0 auto; }
            .card { border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s; }
            .card:hover { transform: translateY(-5px); }
            .img-placeholder { height: 200px; background: #e0e0e0; border-radius: 12px; margin-bottom: 12px; }
            .title { font-weight: 600; font-size: 16px; margin-bottom: 4px; }
            .price { color: #717171; font-size: 15px; }
            .btn { display: inline-block; background: #FF385C; color: white; padding: 14px 24px; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background 0.2s; }
            .btn:hover { background: #D90B38; }
        </style>
    </head>
    <body>
        <header>
            <a href="/" class="logo">Rentlora</a>
        </header>
        <div class="hero">
            <h1>Find your next perfect stay.</h1>
            <p>Discover unique homes, luxury villas, and comfortable apartments curated exclusively for you.</p>
            <a href="/" class="btn">Explore all properties</a>
        </div>
        <div class="grid">
            <div class="card"><div class="img-placeholder" style="background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);"></div><div class="title">Luxury Villa in Bali</div><div class="price"><strong></strong> / night</div></div>
            <div class="card"><div class="img-placeholder" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);"></div><div class="title">Modern Apartment in NYC</div><div class="price"><strong></strong> / night</div></div>
            <div class="card"><div class="img-placeholder" style="background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);"></div><div class="title">Cozy Cabin in the Alps</div><div class="price"><strong></strong> / night</div></div>
        </div>
    </body>
    </html>
    HTML
    systemctl enable --now nginx
  EOF
  )
}

resource "aws_autoscaling_group" "asg_rental" {
  name                      = "asg-rental"
  tag {
    key                 = "Name"
    value               = "rentlora-rental"
    propagate_at_launch = true
  }
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.frontend[*].id
  target_group_arns         = [aws_lb_target_group.tg_rental.arn]
  health_check_type         = "EC2"
  health_check_grace_period = 600
  launch_template {
    id      = aws_launch_template.lt_rental.id
    version = "$Latest"
  }
}

resource "aws_autoscaling_policy" "backend_cpu" {
  name                   = "asg-backend-cpu"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_backend.name
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60
  }
}

resource "aws_autoscaling_policy" "frontend_cpu" {
  name                   = "asg-frontend-cpu"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_frontend.name
  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60
  }
}

resource "aws_lb" "external" {
  name               = "rentlora-external-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.ext_alb.id]
}

resource "aws_lb_listener" "external80" {
  load_balancer_arn = aws_lb.external.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_frontend.arn
  }
}

resource "aws_lb_listener_rule" "ext_rental_path" {
  listener_arn = aws_lb_listener.external80.arn
  priority     = 20
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_rental.arn
  }
  condition {
    path_pattern {
      values = ["/rental*"]
    }
  }
}


output "external_alb_dns" {
  value = aws_lb.external.dns_name
}

output "internal_alb_dns" {
  value = aws_lb.internal.dns_name
}

output "rds_endpoint" {
  value = aws_db_instance.main.address
}

# ==========================================
# DOCS HOST-BASED ROUTING RESOURCES
# ==========================================

resource "aws_lb_target_group" "tg_docs" {
  name     = "tg-docs"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check {
    path = "/"
    port = 80
  }
}

resource "aws_lb_listener_rule" "ext_docs_host" {
  listener_arn = aws_lb_listener.external80.arn
  priority     = 5

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_docs.arn
  }

  condition {
    host_header {
      values = ["docs.rentlora.in"]
    }
  }
}

resource "aws_launch_template" "lt_docs" {
  name_prefix            = "lt-docs-"
  image_id               = local.ami_id
  instance_type          = "t3.small"
  key_name               = local.key_name
  vpc_security_group_ids = [aws_security_group.frontend.id]
  user_data = base64encode(<<-EOF
    #!/bin/bash
    # force refresh 2
    while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do sleep 5; done
    apt-get update -y
    DEBIAN_FRONTEND=noninteractive apt-get install -y nginx
    cat > /var/www/html/index.html <<'HTML'
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Rentlora | Developer Documentation</title>
        <style>
            body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; color: #333; line-height: 1.6; }
            .sidebar { width: 250px; background: white; height: 100vh; position: fixed; padding: 20px; border-right: 1px solid #e9ecef; }
            .content { margin-left: 250px; padding: 50px; max-width: 900px; }
            h1 { color: #2b6cb0; font-size: 36px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h2 { color: #2d3748; margin-top: 40px; }
            .logo { font-size: 24px; font-weight: 800; color: #FF385C; margin-bottom: 30px; display: block; letter-spacing: -1px;}
            .nav-link { display: block; padding: 10px 0; color: #4a5568; text-decoration: none; font-weight: 500; }
            .nav-link:hover { color: #FF385C; }
            pre { background: #1a202c; color: #a0aec0; padding: 15px; border-radius: 8px; overflow-x: auto; font-size: 14px;}
            .badge { background: #48bb78; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <div class="logo">Rentlora Docs</div>
            <a href="#intro" class="nav-link">Introduction</a>
            <a href="#auth" class="nav-link">Authentication</a>
            <a href="#properties" class="nav-link">Properties API</a>
            <a href="#bookings" class="nav-link">Bookings API</a>
        </div>
        <div class="content">
            <h1 id="intro">Rentlora API Reference</h1>
            <p>Welcome to the official Rentlora developer documentation. Here you will find all the endpoints required to integrate with our property and booking microservices.</p>
            
            <h2 id="auth">Authentication</h2>
            <p>All private API endpoints require a JWT token passed in the Authorization header.</p>
            <pre><code>Authorization: Bearer &lt;your_jwt_token&gt;</code></pre>
            
            <h2 id="properties">Properties API</h2>
            <p><span class="badge">GET</span> <code>/properties</code> - Fetch all available properties.</p>
            <pre><code>{
  "status": "success",
  "data": [
    { "id": 1, "title": "Luxury Villa in Bali", "price": 120 }
  ]
}</code></pre>

            <h2 id="bookings">Bookings API</h2>
            <p><span class="badge" style="background:#4299e1;">POST</span> <code>/bookings</code> - Create a new booking.</p>
            <p>Pass the property ID and desired dates in the JSON body to reserve a property.</p>
        </div>
    </body>
    </html>
    HTML
    systemctl enable --now nginx
  EOF
  )
}

resource "aws_autoscaling_group" "asg_docs" {
  name                      = "asg-docs"
  tag {
    key                 = "Name"
    value               = "rentlora-docs"
    propagate_at_launch = true
  }
  min_size                  = 1
  max_size                  = 1
  desired_capacity          = 1
  vpc_zone_identifier       = aws_subnet.frontend[*].id
  target_group_arns         = [aws_lb_target_group.tg_docs.arn]
  health_check_type         = "EC2"
  health_check_grace_period = 600
  launch_template {
    id      = aws_launch_template.lt_docs.id
    version = "$Latest"
  }
}
