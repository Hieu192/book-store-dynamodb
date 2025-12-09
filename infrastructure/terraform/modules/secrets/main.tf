# Secrets Manager Module
# Manages sensitive configuration (DB_URI, JWT_SECRET, AWS credentials, etc.)

# JWT Secret
resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/${var.environment}/jwt-secret"
  description = "JWT secret for authentication"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-jwt-secret"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  count = var.jwt_secret_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret_value
}

# Database URI
resource "aws_secretsmanager_secret" "db_uri" {
  name        = "${var.project_name}/${var.environment}/db-uri"
  description = "MongoDB/DynamoDB connection string"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-db-uri"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "db_uri" {
  count = var.db_uri_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.db_uri.id
  secret_string = var.db_uri_value
}

# AWS Access Key ID
resource "aws_secretsmanager_secret" "aws_access_key" {
  name        = "${var.project_name}/${var.environment}/aws-access-key-id"
  description = "AWS access key for S3/CloudFront"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-aws-access-key"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "aws_access_key" {
  count = var.aws_access_key_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.aws_access_key.id
  secret_string = var.aws_access_key_value
}

# AWS Secret Access Key
resource "aws_secretsmanager_secret" "aws_secret_key" {
  name        = "${var.project_name}/${var.environment}/aws-secret-access-key"
  description = "AWS secret access key for S3/CloudFront"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-aws-secret-key"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "aws_secret_key" {
  count = var.aws_secret_key_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.aws_secret_key.id
  secret_string = var.aws_secret_key_value
}

# S3 Bucket Name
resource "aws_secretsmanager_secret" "s3_bucket" {
  name        = "${var.project_name}/${var.environment}/s3-bucket-name"
  description = "S3 bucket name for file uploads"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-s3-bucket"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "s3_bucket" {
  count = var.s3_bucket_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.s3_bucket.id
  secret_string = var.s3_bucket_value
}

# CloudFront URL
resource "aws_secretsmanager_secret" "cloudfront_url" {
  name        = "${var.project_name}/${var.environment}/cloudfront-url"
  description = "CloudFront distribution URL"

  recovery_window_in_days = var.recovery_window_in_days

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront-url"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "cloudfront_url" {
  count = var.cloudfront_url_value != "" ? 1 : 0

  secret_id     = aws_secretsmanager_secret.cloudfront_url.id
  secret_string = var.cloudfront_url_value
}
