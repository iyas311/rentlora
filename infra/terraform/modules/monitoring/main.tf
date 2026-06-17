resource "aws_cloudwatch_log_group" "backend_logs" {
  name              = "/${var.project_name}/${var.environment}/backend"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "frontend_logs" {
  name              = "/${var.project_name}/${var.environment}/frontend"
  retention_in_days = 14

  tags = {
    Environment = var.environment
    Application = var.project_name
  }
}

# =============================================================
# CLOUDWATCH ALARMS
# =============================================================

# --- Backend 5xx Error Spike ---
resource "aws_cloudwatch_metric_alarm" "backend_5xx" {
  alarm_name          = "${var.project_name}-${var.environment}-backend-5xx"
  alarm_description   = "Backend is returning more than 10 server errors in 5 minutes"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "HTTPCode_Target_5XX_Count"
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.int_alb_arn_suffix
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# --- Backend Unhealthy Hosts ---
resource "aws_cloudwatch_metric_alarm" "backend_unhealthy" {
  alarm_name          = "${var.project_name}-${var.environment}-unhealthy-hosts"
  alarm_description   = "One or more backend targets are unhealthy"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "UnHealthyHostCount"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    TargetGroup  = var.backend_tg_arn_suffix
    LoadBalancer = var.int_alb_arn_suffix
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# --- High ALB Latency (p99 > 3s) ---
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${var.project_name}-${var.environment}-high-latency"
  alarm_description   = "API p99 latency exceeds 3 seconds"
  namespace           = "AWS/ApplicationELB"
  metric_name         = "TargetResponseTime"
  extended_statistic  = "p99"
  period              = 300
  evaluation_periods  = 2
  threshold           = 3
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.int_alb_arn_suffix
  }

  alarm_actions = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# --- RDS CPU Utilization > 80% ---
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-cpu-high"
  alarm_description   = "RDS CPU utilization exceeds 80%"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.sns_topic_arn]
  ok_actions    = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# --- RDS Free Storage < 2 GB ---
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-storage-low"
  alarm_description   = "RDS free storage space is below 2 GB"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 2000000000 # 2 GB in bytes
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# --- RDS Connections > 80 ---
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-connections-high"
  alarm_description   = "RDS active connections exceed 80"
  namespace           = "AWS/RDS"
  metric_name         = "DatabaseConnections"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }

  alarm_actions = [var.sns_topic_arn]

  tags = {
    Environment = var.environment
  }
}

# =============================================================
# CLOUDWATCH DASHBOARD
# =============================================================

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # --- Row 1: ALB Request Metrics ---
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title   = "API Request Count"
          region  = "us-east-1"
          period  = 300
          stat    = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.int_alb_arn_suffix],
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.ext_alb_arn_suffix],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title   = "API Latency (p50 / p95 / p99)"
          region  = "us-east-1"
          period  = 300
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.int_alb_arn_suffix, { stat = "p50", label = "p50" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.int_alb_arn_suffix, { stat = "p95", label = "p95" }],
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", var.int_alb_arn_suffix, { stat = "p99", label = "p99" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title   = "Error Rates (4xx / 5xx)"
          region  = "us-east-1"
          period  = 300
          stat    = "Sum"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", "LoadBalancer", var.int_alb_arn_suffix, { label = "4xx", color = "#ff9900" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", var.int_alb_arn_suffix, { label = "5xx", color = "#d13212" }],
          ]
        }
      },
      # --- Row 2: Target Health + RDS ---
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "ALB Healthy / Unhealthy Hosts"
          region  = "us-east-1"
          period  = 60
          stat    = "Maximum"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount", "TargetGroup", var.backend_tg_arn_suffix, "LoadBalancer", var.int_alb_arn_suffix, { label = "Healthy", color = "#2ca02c" }],
            ["AWS/ApplicationELB", "UnHealthyHostCount", "TargetGroup", var.backend_tg_arn_suffix, "LoadBalancer", var.int_alb_arn_suffix, { label = "Unhealthy", color = "#d13212" }],
          ]
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "RDS CPU Utilization"
          region  = "us-east-1"
          period  = 300
          stat    = "Average"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_id],
          ]
          yAxis = { left = { min = 0, max = 100 } }
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title   = "RDS Connections & Free Storage"
          region  = "us-east-1"
          period  = 300
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Maximum", label = "Connections" }],
            ["AWS/RDS", "FreeStorageSpace", "DBInstanceIdentifier", var.rds_instance_id, { stat = "Minimum", label = "Free Storage (bytes)", yAxis = "right" }],
          ]
        }
      },
    ]
  })
}
