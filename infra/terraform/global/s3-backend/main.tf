provider "aws" {
  region = "us-east-1"
}

# --- S3 BUCKET FOR TERRAFORM STATE ---
resource "aws_s3_bucket" "terraform_state" {
  bucket = "rentlora-terraform-state-dev" # This must be globally unique

  # Prevent accidental deletion of this S3 bucket
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = "Rentlora Terraform State"
    Environment = "dev"
  }
}

# Enable Versioning so we can recover deleted state files!
resource "aws_s3_bucket_versioning" "state_versioning" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Encrypt the state file (it contains sensitive secrets like DB passwords)
resource "aws_s3_bucket_server_side_encryption_configuration" "state_encryption" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "state_public_access" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- DYNAMODB TABLE FOR STATE LOCKING ---
resource "aws_dynamodb_table" "terraform_locks" {
  name         = "rentlora-terraform-locks-dev"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "Rentlora Terraform State Locks"
    Environment = "dev"
  }
}

output "state_bucket_name" {
  value = aws_s3_bucket.terraform_state.id
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.terraform_locks.name
}
