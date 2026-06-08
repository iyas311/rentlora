## Part 1 — Manual AWS Console Setup (Concise)

### 1) VPC + Subnets + IGW + NAT GW + Route Tables
1. Create VPC `rentlora-vpc` with CIDR `10.0.0.0/16` in `us-east-1`.
2. Create 8 subnets exactly as defined (public/frontend/backend/db across `us-east-1a` and `us-east-1b`).
3. Attach Internet Gateway `rentlora-igw` to VPC. Create NAT GW in `rentlora-public-1` with new Elastic IP.
4. Create route tables:
   - `public-rt`: `0.0.0.0/0 -> IGW`
   - `private-rt`: `0.0.0.0/0 -> NAT GW`
   - `db-rt`: local only
5. Associate `public-rt` to both public subnets, `private-rt` to frontend+backend subnets, `db-rt` to DB subnets.
✅ Verify private/frontend/backend instances can egress via NAT, DB subnets cannot access internet.

### 2) Security Groups (5 chained)
1. Create SGs: `sg-ext-alb`, `sg-frontend`, `sg-int-alb`, `sg-backend`, `sg-db`.
2. Configure inbound exactly:

`sg-ext-alb`
| Type | Port | Source |
|---|---:|---|
| HTTP | 80 | 0.0.0.0/0 |
| HTTPS | 443 | 0.0.0.0/0 |

`sg-frontend`
| Type | Port | Source |
|---|---:|---|
| HTTP | 80 | sg-ext-alb |

`sg-int-alb`
| Type | Port | Source |
|---|---:|---|
| HTTP | 80 | sg-frontend |

`sg-backend`
| Type | Port | Source |
|---|---:|---|
| Custom TCP | 8001 | sg-int-alb |
| Custom TCP | 8002 | sg-int-alb |

`sg-db`
| Type | Port | Source |
|---|---:|---|
| PostgreSQL | 5432 | sg-backend |

⚠️ Do not open backend/DB ports to CIDRs.

### 3) ACM Certificate
1. In ACM (us-east-1), request cert for `*.rentlora.com` and `rentlora.com`.
2. Choose DNS validation and create Route 53 validation records.
3. Wait for status `Issued`.
✅ Keep certificate ARN for External ALB HTTPS listener.

### 4) RDS PostgreSQL
1. Create DB subnet group `rentlora-db-subnet-group` with `rentlora-db-1` and `rentlora-db-2`.
2. Create RDS instance:
   - Engine: PostgreSQL 16
   - Class: `db.t3.micro`
   - Identifier: `rentlora-db`
   - Public access: No
   - SG: `sg-db`
3. Set DB name `rentlora`, username `rentlora_admin`.
✅ Copy endpoint; use it in both service `.env` DATABASE_URL.

### 5) S3 Bucket + Upload .env and Builds
1. Create private bucket: `rentlora-deployments-[account-id]` (block all public access).
2. Upload:
   - `env/property-service.env`
   - `env/booking-service.env`
   - `env/nginx-env`
3. Build/package frontend:
```bash
cd frontend && npm install && npm run build
tar czf build.tar.gz dist
```
Upload to `builds/frontend/build.tar.gz`.
4. Package Python services:
```bash
tar czf app.tar.gz -C property-service .
tar czf app.tar.gz -C booking-service .
```
Upload to `builds/property-service/app.tar.gz` and `builds/booking-service/app.tar.gz`.
⚠️ `JWT_SECRET` must match in both backend env files.

### 6) IAM Role (rentlora-ec2-role)
1. Create IAM role for EC2: `rentlora-ec2-role`.
2. Attach policies:
   - `AmazonS3ReadOnlyAccess`
   - `CloudWatchAgentServerPolicy`
   - `AmazonSSMManagedInstanceCore`
3. Create instance profile and bind this role.
✅ Verify test EC2 can `aws s3 cp` from deployment bucket.

### 7) Bake Base AMI
1. Launch `t3.small` in public subnet with role `rentlora-ec2-role`.
2. Install runtime:
```bash
sudo dnf update -y
sudo dnf install -y python3.11 python3.11-pip gcc libpq-devel nginx
pip3 install fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic \
  pydantic[email] pydantic-settings PyJWT bcrypt boto3 python-multipart python-dotenv
```
3. Create AMI: `rentlora-base-ami`.
4. Terminate builder EC2.
✅ Use AMI ID in Launch Templates.

### 8) Internal ALB + Target Groups + Path Rules
1. Create `tg-property` (HTTP 8001, health `/health`) and `tg-booking` (HTTP 8002, health `/health`).
2. Create internal ALB in backend subnets with `sg-int-alb`.
3. Add HTTP:80 listener rules:
   - P1 `/api/properties*` -> `tg-property`
   - P2 `/api/search*` -> `tg-property`
   - P3 `/api/reviews*` -> `tg-property`
   - P4 `/api/auth*` -> `tg-booking`
   - P5 `/api/users*` -> `tg-booking`
   - P6 `/api/bookings*` -> `tg-booking`
✅ Copy internal ALB DNS and upload `env/nginx-env`.

### 9) Launch Templates (3)
1. Create `lt-property` (`t3.small`, backend SG, IAM profile, base AMI) with user-data:
```bash
#!/bin/bash
S3=rentlora-deployments-ACCOUNT
aws s3 cp s3://$S3/env/property-service.env /opt/property-service/.env
aws s3 cp s3://$S3/builds/property-service/app.tar.gz /tmp/p.tar.gz
tar xzf /tmp/p.tar.gz -C /opt/property-service/
cat > /etc/systemd/system/property-service.service <<EOF
[Unit]
Description=Property Service
After=network.target
[Service]
WorkingDirectory=/opt/property-service
EnvironmentFile=/opt/property-service/.env
ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
Restart=always
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now property-service
```
2. Create `lt-booking` same pattern, `/opt/booking-service`, port `8002`, service name `booking-service`.
3. Create `lt-frontend` with:
```bash
#!/bin/bash
S3=rentlora-deployments-ACCOUNT
aws s3 cp s3://$S3/builds/frontend/build.tar.gz /tmp/b.tar.gz
tar xzf /tmp/b.tar.gz -C /tmp/ && cp -r /tmp/dist/* /usr/share/nginx/html/
aws s3 cp s3://$S3/env/nginx-env /tmp/nginx-env && source /tmp/nginx-env
cat > /etc/nginx/conf.d/rentlora.conf <<EOF
server {
  listen 80;
  root /usr/share/nginx/html;
  location / { try_files \$uri \$uri/ /index.html; }
  location /api/ { proxy_pass http://${INTERNAL_ALB_DNS}; }
}
EOF
systemctl enable --now nginx
```
⚠️ Ensure paths exist (`/opt/property-service`, `/opt/booking-service`).

### 10) Auto Scaling Groups (3)
1. `asg-property`: backend subnets, `lt-property`, attach `tg-property`, min 1 max 4 desired 1, grace 120.
2. `asg-booking`: backend subnets, `lt-booking`, attach `tg-booking`, min 1 max 4 desired 1, grace 120.
3. `asg-frontend`: frontend subnets, `lt-frontend`, attach `tg-frontend`, min 1 max 4 desired 1, grace 60.
4. Add CPU target tracking 60% for all.
✅ Wait until all instances are `InService`.

### 11) External ALB + Frontend TG + Route 53
1. Create `tg-frontend` (port 80, health `/`).
2. Create internet-facing ALB in public subnets with `sg-ext-alb`.
3. Listener 80: redirect to 443. Listener 443: ACM cert + forward to `tg-frontend`.
4. Route 53 aliases:
   - `rentlora.com` -> external ALB
   - `www.rentlora.com` -> external ALB
✅ `https://rentlora.com` should load React.

### 12) Testing Checklist
```bash
curl -I http://rentlora.com
```
- Expect `301` redirect.
- Open `https://rentlora.com` and confirm app loads.
- Register user (`POST /api/auth/register`) returns tokens.
- Add property (`POST /api/properties`) works.
- Browse (`GET /api/properties`) returns data.
- Book (`POST /api/bookings`) works.
- On failure: inspect `/var/log/user-data.log`.
- Live logs: `journalctl -u property-service -f`.

### 13) Redeployment (code changes)
1. Rebuild/repackage artifacts.
2. Upload new tar files to S3 same keys.
3. Trigger ASG Instance Refresh (min healthy 50%).
✅ Verify new instances pull latest S3 artifacts at boot.

### 14) Troubleshooting (Common)
| Symptom | Likely Cause | Fix |
|---|---|---|
| 502 from external ALB | frontend target unhealthy | Check nginx and tg-frontend health path |
| `/api/*` 502 | internal ALB rule mismatch | Re-check listener priorities and paths |
| backend unhealthy | service not started | `journalctl -u property-service -f` / booking |
| DB connection error | wrong RDS endpoint/password | fix `.env`, refresh instances |
| 403 on S3 copy | missing IAM policy/profile | attach S3 read policy and relaunch |
| TLS not working | ACM cert not issued/attached | validate DNS and listener cert ARN |
| No internet in private tier | NAT/route issue | ensure private-rt default route -> NAT |
| app stale after deploy | old instances serving | run ASG instance refresh |

## Part 2 — Single Terraform `main.tf`

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

locals {
  region         = "us-east-1"
  azs            = ["us-east-1a", "us-east-1b"]
  project        = "rentlora"
  vpc_cidr       = "10.0.0.0/16"
  public_cidrs   = ["10.0.1.0/24", "10.0.2.0/24"]
  frontend_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]
  backend_cidrs  = ["10.0.21.0/24", "10.0.22.0/24"]
  db_cidrs       = ["10.0.31.0/24", "10.0.32.0/24"]
  ami_id         = "ami-REPLACE-WITH-YOUR-BAKED-AMI"
  key_name       = "your-key-pair-name"
  s3_bucket      = "rentlora-deployments-REPLACE"
  db_password    = "REPLACE_WITH_STRONG_PASSWORD"
}

provider "aws" {
  region = local.region
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = local.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "${local.project}-vpc" }
}

# Subnets: 2 per tier across 2 AZs
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

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "${local.project}-igw" }
}

# NAT Gateway in public subnet[0] (cost saving: single NAT)
resource "aws_eip" "nat" {
  domain = "vpc"
  tags = { Name = "${local.project}-nat-eip" }
}

resource "aws_nat_gateway" "main" {
  subnet_id     = aws_subnet.public[0].id
  allocation_id = aws_eip.nat.id
  depends_on    = [aws_internet_gateway.igw]
  tags = { Name = "${local.project}-nat-gw" }
}

# Route tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }
  tags = { Name = "${local.project}-public-rt" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "${local.project}-private-rt" }
}

resource "aws_route_table" "db" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "${local.project}-db-rt" }
}

# Route table associations (8 total)
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

# Security Groups
resource "aws_security_group" "sg_ext_alb" {
  name   = "sg-ext-alb"
  vpc_id = aws_vpc.main.id
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "sg_frontend" {
  name   = "sg-frontend"
  vpc_id = aws_vpc.main.id
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "sg_int_alb" {
  name   = "sg-int-alb"
  vpc_id = aws_vpc.main.id
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "sg_backend" {
  name   = "sg-backend"
  vpc_id = aws_vpc.main.id
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_security_group" "sg_db" {
  name   = "sg-db"
  vpc_id = aws_vpc.main.id
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

# SG rules (split out to avoid cyclical references)
resource "aws_security_group_rule" "ext_alb_http" {
  type              = "ingress"
  from_port         = 80
  to_port           = 80
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.sg_ext_alb.id
}

resource "aws_security_group_rule" "ext_alb_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.sg_ext_alb.id
}

resource "aws_security_group_rule" "frontend_from_ext_alb" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.sg_ext_alb.id
  security_group_id        = aws_security_group.sg_frontend.id
}

resource "aws_security_group_rule" "int_alb_from_frontend" {
  type                     = "ingress"
  from_port                = 80
  to_port                  = 80
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.sg_frontend.id
  security_group_id        = aws_security_group.sg_int_alb.id
}

resource "aws_security_group_rule" "backend_8001_from_int_alb" {
  type                     = "ingress"
  from_port                = 8001
  to_port                  = 8001
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.sg_int_alb.id
  security_group_id        = aws_security_group.sg_backend.id
}

resource "aws_security_group_rule" "backend_8002_from_int_alb" {
  type                     = "ingress"
  from_port                = 8002
  to_port                  = 8002
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.sg_int_alb.id
  security_group_id        = aws_security_group.sg_backend.id
}

resource "aws_security_group_rule" "db_5432_from_backend" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.sg_backend.id
  security_group_id        = aws_security_group.sg_db.id
}

# IAM role/profile for EC2
resource "aws_iam_role" "ec2_role" {
  name = "rentlora-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action = "sts:AssumeRole",
      Effect = "Allow",
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3_readonly" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

resource "aws_iam_role_policy_attachment" "cw_agent" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "rentlora-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# RDS subnet group + PostgreSQL instance
resource "aws_db_subnet_group" "main" {
  name       = "rentlora-db-subnet-group"
  subnet_ids = aws_subnet.db[*].id
}

resource "aws_db_instance" "main" {
  identifier                 = "rentlora-db"
  engine                     = "postgres"
  engine_version             = "16"
  instance_class             = "db.t3.micro"
  allocated_storage          = 20
  db_name                    = "rentlora"
  username                   = "rentlora_admin"
  password                   = local.db_password
  skip_final_snapshot        = true
  publicly_accessible        = false
  vpc_security_group_ids     = [aws_security_group.sg_db.id]
  db_subnet_group_name       = aws_db_subnet_group.main.name
  multi_az                   = false
  backup_retention_period    = 7
  auto_minor_version_upgrade = true
}

# Target groups for backend services and frontend
resource "aws_lb_target_group" "tg_property" {
  name     = "tg-property"
  port     = 8001
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/health" matcher = "200" }
}

resource "aws_lb_target_group" "tg_booking" {
  name     = "tg-booking"
  port     = 8002
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/health" matcher = "200" }
}

resource "aws_lb_target_group" "tg_frontend" {
  name     = "tg-frontend"
  port     = 80
  protocol = "HTTP"
  vpc_id   = aws_vpc.main.id
  health_check { path = "/" matcher = "200-399" }
}

# Internal ALB for API traffic (frontend Nginx proxies /api here)
resource "aws_lb" "internal" {
  name               = "rentlora-internal-alb"
  internal           = true
  load_balancer_type = "application"
  subnets            = aws_subnet.backend[*].id
  security_groups    = [aws_security_group.sg_int_alb.id]
}

resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "No matching API route"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "properties" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 1
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn }
  condition { path_pattern { values = ["/api/properties*"] } }
}

resource "aws_lb_listener_rule" "search" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 2
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn }
  condition { path_pattern { values = ["/api/search*"] } }
}

resource "aws_lb_listener_rule" "reviews" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 3
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_property.arn }
  condition { path_pattern { values = ["/api/reviews*"] } }
}

resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 4
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn }
  condition { path_pattern { values = ["/api/auth*"] } }
}

resource "aws_lb_listener_rule" "users" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 5
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn }
  condition { path_pattern { values = ["/api/users*"] } }
}

resource "aws_lb_listener_rule" "bookings" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 6
  action { type = "forward" target_group_arn = aws_lb_target_group.tg_booking.arn }
  condition { path_pattern { values = ["/api/bookings*"] } }
}

# Launch template: property-service
resource "aws_launch_template" "lt_property" {
  name_prefix   = "lt-property-"
  image_id      = local.ami_id
  instance_type = "t3.small"
  key_name      = local.key_name
  vpc_security_group_ids = [aws_security_group.sg_backend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    mkdir -p /opt/property-service
    S3=${local.s3_bucket}
    aws s3 cp s3://$S3/env/property-service.env /opt/property-service/.env
    aws s3 cp s3://$S3/builds/property-service/app.tar.gz /tmp/p.tar.gz
    tar xzf /tmp/p.tar.gz -C /opt/property-service/
    cat > /etc/systemd/system/property-service.service <<UNIT
    [Unit]
    Description=Property Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/property-service
    EnvironmentFile=/opt/property-service/.env
    ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8001 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    systemctl daemon-reload && systemctl enable --now property-service
  EOF
  )
}

# Launch template: booking-service
resource "aws_launch_template" "lt_booking" {
  name_prefix   = "lt-booking-"
  image_id      = local.ami_id
  instance_type = "t3.small"
  key_name      = local.key_name
  vpc_security_group_ids = [aws_security_group.sg_backend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    mkdir -p /opt/booking-service
    S3=${local.s3_bucket}
    aws s3 cp s3://$S3/env/booking-service.env /opt/booking-service/.env
    aws s3 cp s3://$S3/builds/booking-service/app.tar.gz /tmp/bk.tar.gz
    tar xzf /tmp/bk.tar.gz -C /opt/booking-service/
    cat > /etc/systemd/system/booking-service.service <<UNIT
    [Unit]
    Description=Booking Service
    After=network.target
    [Service]
    WorkingDirectory=/opt/booking-service
    EnvironmentFile=/opt/booking-service/.env
    ExecStart=/usr/local/bin/uvicorn main:app --host 0.0.0.0 --port 8002 --workers 2
    Restart=always
    [Install]
    WantedBy=multi-user.target
    UNIT
    systemctl daemon-reload && systemctl enable --now booking-service
  EOF
  )
}

# Launch template: frontend Nginx + React build
resource "aws_launch_template" "lt_frontend" {
  name_prefix   = "lt-frontend-"
  image_id      = local.ami_id
  instance_type = "t3.small"
  key_name      = local.key_name
  vpc_security_group_ids = [aws_security_group.sg_frontend.id]
  iam_instance_profile { name = aws_iam_instance_profile.ec2_profile.name }
  user_data = base64encode(<<-EOF
    #!/bin/bash
    S3=${local.s3_bucket}
    aws s3 cp s3://$S3/builds/frontend/build.tar.gz /tmp/f.tar.gz
    tar xzf /tmp/f.tar.gz -C /tmp/
    rm -rf /usr/share/nginx/html/*
    cp -r /tmp/dist/* /usr/share/nginx/html/
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

# ASGs
resource "aws_autoscaling_group" "asg_property" {
  name                      = "asg-property"
  min_size                  = 1
  max_size                  = 4
  desired_capacity          = 1
  health_check_type         = "ELB"
  health_check_grace_period = 120
  vpc_zone_identifier       = aws_subnet.backend[*].id
  target_group_arns         = [aws_lb_target_group.tg_property.arn]
  launch_template { id = aws_launch_template.lt_property.id, version = "$Latest" }
}

resource "aws_autoscaling_group" "asg_booking" {
  name                      = "asg-booking"
  min_size                  = 1
  max_size                  = 4
  desired_capacity          = 1
  health_check_type         = "ELB"
  health_check_grace_period = 120
  vpc_zone_identifier       = aws_subnet.backend[*].id
  target_group_arns         = [aws_lb_target_group.tg_booking.arn]
  launch_template { id = aws_launch_template.lt_booking.id, version = "$Latest" }
}

resource "aws_autoscaling_group" "asg_frontend" {
  name                      = "asg-frontend"
  min_size                  = 1
  max_size                  = 4
  desired_capacity          = 1
  health_check_type         = "ELB"
  health_check_grace_period = 60
  vpc_zone_identifier       = aws_subnet.frontend[*].id
  target_group_arns         = [aws_lb_target_group.tg_frontend.arn]
  launch_template { id = aws_launch_template.lt_frontend.id, version = "$Latest" }
}

# CPU target tracking scaling policies
resource "aws_autoscaling_policy" "cpu_property" {
  name                   = "asg-property-cpu60"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_property.name
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 60.0
  }
}

resource "aws_autoscaling_policy" "cpu_booking" {
  name                   = "asg-booking-cpu60"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_booking.name
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 60.0
  }
}

resource "aws_autoscaling_policy" "cpu_frontend" {
  name                   = "asg-frontend-cpu60"
  policy_type            = "TargetTrackingScaling"
  autoscaling_group_name = aws_autoscaling_group.asg_frontend.name
  target_tracking_configuration {
    predefined_metric_specification { predefined_metric_type = "ASGAverageCPUUtilization" }
    target_value = 60.0
  }
}

# External ALB
resource "aws_lb" "external" {
  name               = "rentlora-external-alb"
  internal           = false
  load_balancer_type = "application"
  subnets            = aws_subnet.public[*].id
  security_groups    = [aws_security_group.sg_ext_alb.id]
}

resource "aws_lb_listener" "external_http" {
  load_balancer_arn = aws_lb.external.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "external_https" {
  load_balancer_arn = aws_lb.external.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  # Replace ACM_CERT_ARN with your ACM certificate ARN
  certificate_arn   = "ACM_CERT_ARN_REPLACE"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_frontend.arn
  }
}

resource "aws_lb_listener_rule" "www_redirect" {
  listener_arn = aws_lb_listener.external_https.arn
  priority     = 100
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.tg_frontend.arn
  }
  condition {
    host_header { values = ["www.rentlora.com"] }
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
```

### How to Run

Prerequisites:
```bash
aws configure
cd infra/terraform
terraform init
```

Steps:
1. Run Terraform from `infra/terraform`.
2. Set `db_password` and `jwt_secret` in `terraform.tfvars` instead of hardcoding them in `main.tf`.
3. Review environment-specific values like `ami_id`, `s3_bucket`, `key_name`, and `ACM_CERT_ARN_REPLACE`.
4. Run:
```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```
5. Copy outputs (`rds_endpoint`, ALB DNS) and fill `.env` files.
6. Upload `.env` files and build tarballs to S3 paths.
7. When done:
```bash
cd infra/terraform
terraform destroy
```

⚠️ Terraform does **not** bake the AMI, upload `.env` files, or build app artifacts.  
Do Part 1 prep first, then apply Terraform.
