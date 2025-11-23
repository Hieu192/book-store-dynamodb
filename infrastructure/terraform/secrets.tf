# AWS Secrets Manager for sensitive data

resource "aws_secretsmanager_secret" "db_uri" {
  name        = "${var.project_name}/db-uri-v4"
  description = "MongoDB connection string"

  tags = {
    Name = "${var.project_name}-db-uri"
  }
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "${var.project_name}/jwt-secret-v4"
  description = "JWT secret key"

  tags = {
    Name = "${var.project_name}-jwt-secret"
  }
}

resource "aws_secretsmanager_secret" "aws_access_key" {
  name        = "${var.project_name}/aws-access-key-v4"
  description = "AWS Access Key ID"

  tags = {
    Name = "${var.project_name}-aws-access-key"
  }
}

resource "aws_secretsmanager_secret" "aws_secret_key" {
  name        = "${var.project_name}/aws-secret-key-v4"
  description = "AWS Secret Access Key"

  tags = {
    Name = "${var.project_name}-aws-secret-key"
  }
}

resource "aws_secretsmanager_secret" "s3_bucket" {
  name        = "${var.project_name}/s3-bucket-v4"
  description = "S3 bucket name"

  tags = {
    Name = "${var.project_name}-s3-bucket"
  }
}

resource "aws_secretsmanager_secret" "cloudfront_url" {
  name        = "${var.project_name}/cloudfront-url-v4"
  description = "CloudFront distribution URL"

  tags = {
    Name = "${var.project_name}-cloudfront-url"
  }
}

# IAM Policy for accessing secrets
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "${var.project_name}-ecs-secrets-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = [
        aws_secretsmanager_secret.db_uri.arn,
        aws_secretsmanager_secret.jwt_secret.arn,
        aws_secretsmanager_secret.aws_access_key.arn,
        aws_secretsmanager_secret.aws_secret_key.arn,
        aws_secretsmanager_secret.s3_bucket.arn,
        aws_secretsmanager_secret.cloudfront_url.arn
      ]
    }]
  })
}
