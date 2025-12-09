output "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront"
  value       = var.create_cloudfront_certificate ? aws_acm_certificate.cloudfront[0].arn : null
}

output "alb_certificate_arn" {
  description = "ACM certificate ARN for ALB"
  value       = var.create_alb_certificate ? aws_acm_certificate.alb[0].arn : null
}

output "zone_id" {
  description = "Route53 hosted zone ID"
  value       = var.domain_name != "" ? data.aws_route53_zone.main[0].zone_id : null
}

output "nameservers" {
  description = "Route53 nameservers"
  value       = var.domain_name != "" ? data.aws_route53_zone.main[0].name_servers : []
}
