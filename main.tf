

locals {
  region         = "us-east-1"
  azs            = ["us-east-1a", "us-east-1b"]
  project        = "rentlora"
  vpc_cidr       = "10.0.0.0/16"
  public_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
  frontend_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
  backend_cidrs  = ["10.0.21.0/24", "10.0.22.0/24"]
  db_cidrs       = ["10.0.31.0/24", "10.0.32.0/24"]

  ami_id      = "ami-REPLACE"
  key_name    = "iyas-private"
  repo_url    = "https://github.com/iyas311/rentlora.git"
  db_password = "Iy@s2458"
}

provider "aws" { region = local.region }

resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  tags = { Name = "${local.project}-vpc" }
}

resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_cidrs[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${local.project}-public-${count.index + 1}" }
}
resource "aws_subnet" "frontend" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.frontend_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = { Name = "${local.project}-frontend-${count.index + 1}" }
}
resource "aws_subnet" "backend" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.backend_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = { Name = "${local.project}-backend-${count.index + 1}" }
}
resource "aws_subnet" "db" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.db_cidrs[count.index]
  availability_zone = local.azs[count.index]
  tags = { Name = "${local.project}-db-${count.index + 1}" }
}

resource "aws_internet_gateway" "igw" { vpc_id = aws_vpc.main.id }
resource "aws_eip" "nat" { domain = "vpc" }
resource "aws_nat_gateway" "nat" {
  subnet_id     = aws_subnet.public[0].id
  allocation_id = aws_eip.nat.id
  depends_on    = [aws_internet_gateway.igw]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0" gateway_id = aws_internet_gateway.igw.id }
}
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0" nat_gateway_id = aws_nat_gateway.nat.id }
}
resource "aws_route_table" "db" { vpc_id = aws_vpc.main.id }

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

resource "aws_security_group" "ext_alb" { name = "sg-ext-alb" vpc_id = aws_vpc.main.id }
resource "aws_security_group" "frontend" { name = "sg-frontend" vpc_id = aws_vpc.main.id }
resource "aws_security_group" "int_alb" { name = "sg-int-alb" vpc_id = aws_vpc.main.id }
resource "aws_security_group" "backend" { name = "sg-backend" vpc_id = aws_vpc.main.id }
resource "aws_security_group" "db" { name = "sg-db" vpc_id = aws_vpc.main.id }

resource "aws_security_group_rule" "ext80" { type = "ingress" from_port = 80 to_port = 80 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] security_group_id = aws_security_group.ext_alb.id }
resource "aws_security_group_rule" "ext443" { type = "ingress" from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] security_group_id = aws_security_group.ext_alb.id }
resource "aws_security_group_rule" "fe_from_ext" { type = "ingress" from_port = 80 to_port = 80 protocol = "tcp" source_security_group_id = aws_security_group.ext_alb.id security_group_id = aws_security_group.frontend.id }
resource "aws_security_group_rule" "int_from_fe" { type = "ingress" from_port = 80 to_port = 80 protocol = "tcp" source_security_group_id = aws_security_group.frontend.id security_group_id = aws_security_group.int_alb.id }
resource "aws_security_group_rule" "be8001" { type = "ingress" from_port = 8001 to_port = 8001 protocol = "tcp" source_security_group_id = aws_security_group.int_alb.id security_group_id = aws_security_group.backend.id }
resource "aws_security_group_rule" "be8002" { type = "ingress" from_port = 8002 to_port = 8002 protocol = "tcp" source_security_group_id = aws_security_group.int_alb.id security_group_id = aws_security_group.backend.id }
resource "aws_security_group_rule" "db5432" { type = "ingress" from_port = 5432 to_port = 5432 protocol = "tcp" source_security_group_id = aws_security_group.backend.id security_group_id = aws_security_group.db.id }

resource "aws_iam_role" "ec2_role" {
  name = "rentlora-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{ Effect = "Allow", Action = "sts:AssumeRole", Principal = { Service = "ec2.amazonaws.com" } }]
  })
}
resource "aws_iam_role_policy_attachment" "cw" { role = aws_iam_role.ec2_role.name policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy" }
resource "aws_iam_role_policy_attachment" "ssm" { role = aws_iam_role.ec2_role.name policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore" }
resource "aws_iam_instance_profile" "ec2_profile" { name = "rentlora-ec2-profile" role = aws_iam_role.ec2_role.name }

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

resource "aws_lb_target_group" "tg_property" { name = "tg-property" port = 8001 protocol = "HTTP" vpc_id = aws_vpc.main.id health_check { path = "/health" } }
resource "aws_lb_target_group" "tg_booking" { name = "tg-booking" port = 8002 protocol = "HTTP" vpc_id = aws_vpc.main.id health_check { path = "/health" } }
resource "aws_lb_target_group" "tg_frontend" { name = "tg-frontend" port = 80 protocol = "HTTP" vpc_id = aws_vpc.main.id health_check { path = "/" matcher = "200-399" } }

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
  default_action { type = "fixed-response" fixed_response { content_type = "text/plain" status_code = "404" message_body = "not found" } }
}
resource "aws_lb_listener_rule" "r1" { listener_arn = aws_lb_listener.internal80.arn priority = 1 action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn } condition { path_pattern { values = ["/api/properties*"] } } }
resource "aws_lb_listener_rule" "r2" { listener_arn = aws_lb_listener.internal80.arn priority = 2 action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn } condition { path_pattern { values = ["/api/search*"] } } }
resource "aws_lb_listener_rule" "r3" { listener_arn = aws_lb_listener.internal80.arn priority = 3 action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn } condition { path_pattern { values = ["/api/reviews*"] } } }
resource "aws_lb_listener_rule" "r4" { listener_arn = aws_lb_listener.internal80.arn priority = 4 action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn } condition { path_pattern { values = ["/api/auth*"] } } }
resource "aws_lb_listener_rule" "r5" { listener_arn = aws_lb_listener.internal80.arn priority = 5 action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn } condition { path_pattern { values = ["/api/users*"] } } }
resource "aws_lb_listener_rule" "r6" { listener_arn = aws_lb_listener.internal80.arn priority = 6 action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn } condition { path_pattern { values = ["/api/bookings*"] } } }

resource "aws_launch_template" "lt_property" {
  name_prefix               = "lt-property-"
  image_id                  = local.ami_id
  instance_type             = "t3.small"
  key_name                  = local.key_name
  vpc_security_group_ids    = [aws_security_group.backend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    dnf install -y git python3.11 python3.11-pip gcc libpq-devel
    mkdir -p /opt
    git clone ${local.repo_url} /opt/rentlora || true
    cd /opt/rentlora/property-service
    pip3 install -r requirements.txt
    cat > /opt/rentlora/property-service/.env <<ENV
    DATABASE_URL=postgresql+asyncpg://rentlora_admin:${local.db_password}@${aws_db_instance.main.address}:5432/rentlora
    JWT_SECRET=replace-me-same-on-both-services
    UPLOADS_DIR=./uploads
    AWS_DEFAULT_REGION=us-east-1
    ENV=production
    ENV
    cat > /etc/systemd/system/property.service <<UNIT
    [Unit]
    Description=Property Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/rentlora/property-service
    ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    systemctl daemon-reload
    systemctl enable --now property
  EOF
  )
}

resource "aws_launch_template" "lt_booking" {
  name_prefix               = "lt-booking-"
  image_id                  = local.ami_id
  instance_type             = "t3.small"
  key_name                  = local.key_name
  vpc_security_group_ids    = [aws_security_group.backend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    dnf install -y git python3.11 python3.11-pip gcc libpq-devel
    mkdir -p /opt
    git clone ${local.repo_url} /opt/rentlora || true
    cd /opt/rentlora/booking-service
    pip3 install -r requirements.txt
    cat > /opt/rentlora/booking-service/.env <<ENV
    DATABASE_URL=postgresql+asyncpg://rentlora_admin:${local.db_password}@${aws_db_instance.main.address}:5432/rentlora
    JWT_SECRET=replace-me-same-on-both-services
    AWS_DEFAULT_REGION=us-east-1
    ENV=production
    ENV
    cat > /etc/systemd/system/booking.service <<UNIT
    [Unit]
    Description=Booking Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/rentlora/booking-service
    ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8002 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    systemctl daemon-reload
    systemctl enable --now booking
  EOF
  )
}

resource "aws_launch_template" "lt_frontend" {
  name_prefix               = "lt-frontend-"
  image_id                  = local.ami_id
  instance_type             = "t3.small"
  key_name                  = local.key_name
  vpc_security_group_ids    = [aws_security_group.frontend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    dnf install -y git nginx nodejs npm
    mkdir -p /opt
    git clone ${local.repo_url} /opt/rentlora || true
    cd /opt/rentlora/frontend
    npm install
    npm run build
    cp -r dist/* /usr/share/nginx/html/
    cat > /etc/nginx/conf.d/rentlora.conf <<NGINX
    server {
      listen 80;
      root /usr/share/nginx/html;
      location / { try_files \$uri \$uri/ /index.html; }
      location /api/ { proxy_pass http://${aws_lb.internal.dns_name}; }
    }
    NGINX
    systemctl enable --now nginx
  EOF
  )
}

resource "aws_autoscaling_group" "asg_property" {
  name = "asg-property"
  min_size = 1
  max_size = 4
  desired_capacity = 1
  vpc_zone_identifier = aws_subnet.backend[*].id
  target_group_arns = [aws_lb_target_group.tg_property.arn]
  health_check_type = "ELB"
  health_check_grace_period = 120
  launch_template { id = aws_launch_template.lt_property.id version = "$Latest" }
}
resource "aws_autoscaling_group" "asg_booking" {
  name = "asg-booking"
  min_size = 1
  max_size = 4
  desired_capacity = 1
  vpc_zone_identifier = aws_subnet.backend[*].id
  target_group_arns = [aws_lb_target_group.tg_booking.arn]
  health_check_type = "ELB"
  health_check_grace_period = 120
  launch_template { id = aws_launch_template.lt_booking.id version = "$Latest" }
}
resource "aws_autoscaling_group" "asg_frontend" {
  name = "asg-frontend"
  min_size = 1
  max_size = 4
  desired_capacity = 1
  vpc_zone_identifier = aws_subnet.frontend[*].id
  target_group_arns = [aws_lb_target_group.tg_frontend.arn]
  health_check_type = "ELB"
  health_check_grace_period = 60
  launch_template { id = aws_launch_template.lt_frontend.id version = "$Latest" }
}

resource "aws_autoscaling_policy" "property_cpu" {
  name = "asg-property-cpu"
  policy_type = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_property.name
  target_tracking_configuration { predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" } target_value = 60 }
}
resource "aws_autoscaling_policy" "booking_cpu" {
  name = "asg-booking-cpu"
  policy_type = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_booking.name
  target_tracking_configuration { predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" } target_value = 60 }
}
resource "aws_autoscaling_policy" "frontend_cpu" {
  name = "asg-frontend-cpu"
  policy_type = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_frontend.name
  target_tracking_configuration { predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" } target_value = 60 }
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
  port = 80
  protocol = "HTTP"
  default_action { type = "redirect" redirect { port = "443" protocol = "HTTPS" status_code = "HTTP_301" } }
}
resource "aws_lb_listener" "external443" {
  load_balancer_arn = aws_lb.external.arn
  port = 443
  protocol = "HTTPS"
  ssl_policy      = "ELBSecurityPolicy-2016-08"
  certificate_arn = "ACM_CERT_ARN_REPLACE"
  default_action { type = "forward" target_group_arn = aws_lb_target_group.tg_frontend.arn }
}

output "external_alb_dns" { value = aws_lb.external.dns_name }
output "internal_alb_dns" { value = aws_lb.internal.dns_name }
output "rds_endpoint"     { value = aws_db_instance.main.address }
