output "jwt_secret_arn" {
  description = "JWT secret ARN"
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "db_uri_arn" {
  description = "Database URI secret ARN"
  value       = aws_secretsmanager_secret.db_uri.arn
}

output "aws_access_key_arn" {
  description = "AWS access key secret ARN"
  value       = aws_secretsmanager_secret.aws_access_key.arn
}

output "aws_secret_key_arn" {
  description = "AWS secret key ARN"
  value       = aws_secretsmanager_secret.aws_secret_key.arn
}

output "s3_bucket_arn" {
  description = "S3 bucket name secret ARN"
  value       = aws_secretsmanager_secret.s3_bucket.arn
}

output "cloudfront_url_arn" {
  description = "CloudFront URL secret ARN"
  value       = aws_secretsmanager_secret.cloudfront_url.arn
}

# Output for ECS task definition secrets configuration
output "secret_arns_for_ecs" {
  description = "List of secret ARNs formatted for ECS task definition"
  value = [
    { name = "DB_URI", valueFrom = aws_secretsmanager_secret.db_uri.arn },
    { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
    { name = "AWS_ACCESS_KEY_ID", valueFrom = aws_secretsmanager_secret.aws_access_key.arn },
    { name = "AWS_SECRET_ACCESS_KEY", valueFrom = aws_secretsmanager_secret.aws_secret_key.arn },
    { name = "S3_BUCKET_NAME", valueFrom = aws_secretsmanager_secret.s3_bucket.arn },
    { name = "CLOUDFRONT_URL", valueFrom = aws_secretsmanager_secret.cloudfront_url.arn }
  ]
}
