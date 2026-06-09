output "ext_alb_sg_id" {
  value = aws_security_group.ext_alb.id
}

output "frontend_ec2_sg_id" {
  value = aws_security_group.frontend_ec2.id
}

output "int_alb_sg_id" {
  value = aws_security_group.int_alb.id
}

output "backend_ec2_sg_id" {
  value = aws_security_group.backend_ec2.id
}

output "rds_sg_id" {
  value = aws_security_group.rds.id
}

output "ec2_instance_profile_name" {
  value = aws_iam_instance_profile.ec2_profile.name
}
