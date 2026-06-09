# --- EXTERNAL ALB (Internet Facing) ---
resource "aws_lb" "external" {
  name               = "${var.project_name}-ext-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.ext_alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name = "${var.project_name}-ext-alb"
  }
}

resource "aws_lb_target_group" "frontend" {
  name     = "${var.project_name}-frontend-tg"
  port     = 80
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
  }
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
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# --- INTERNAL ALB (Private Facing) ---
resource "aws_lb" "internal" {
  name               = "${var.project_name}-int-alb"
  internal           = true
  load_balancer_type = "application"
  security_groups    = [var.int_alb_sg_id]
  subnets            = var.frontend_subnet_ids

  tags = {
    Name = "${var.project_name}-int-alb"
  }
}

resource "aws_lb_target_group" "backend_properties" {
  name     = "${var.project_name}-properties-tg"
  port     = 8001
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
  }
}

resource "aws_lb_target_group" "backend_bookings" {
  name     = "${var.project_name}-bookings-tg"
  port     = 8002
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
  }
}

resource "aws_lb_target_group" "backend_ai" {
  name     = "${var.project_name}-ai-tg"
  port     = 8003
  protocol = "HTTP"
  vpc_id   = var.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    timeout             = 5
    interval            = 10
  }
}

# Internal Listener & Path-based Routing Rules
resource "aws_lb_listener" "internal_http" {
  load_balancer_arn = aws_lb.internal.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "application/json"
      message_body = "{\"error\": \"Not Found\"}"
      status_code  = "404"
    }
  }
}

resource "aws_lb_listener_rule" "route_properties" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 10

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_properties.arn
  }

  condition {
    path_pattern {
      values = ["/api/properties*", "/api/search*", "/api/reviews*"]
    }
  }
}

resource "aws_lb_listener_rule" "route_bookings" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 20

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_bookings.arn
  }

  condition {
    path_pattern {
      values = ["/api/bookings*", "/api/auth*", "/api/users*"]
    }
  }
}

resource "aws_lb_listener_rule" "route_ai" {
  listener_arn = aws_lb_listener.internal_http.arn
  priority     = 30

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend_ai.arn
  }

  condition {
    path_pattern {
      values = ["/api/ai*"]
    }
  }
}

# --- SSM PARAMETER STORE ---
# For the frontend NGINX and any services that need to know the Internal ALB DNS
resource "aws_ssm_parameter" "internal_alb_dns" {
  name        = "/rentlora/${var.environment}/internal-alb-dns"
  description = "The DNS name of the Internal ALB"
  type        = "String"
  value       = aws_lb.internal.dns_name
}
