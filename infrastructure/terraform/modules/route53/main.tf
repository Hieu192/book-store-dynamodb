# Route53 + ACM Module
# DNS records and SSL certificates

data "aws_route53_zone" "main" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

# ACM Certificate for CloudFront (must be in us-east-1)
resource "aws_acm_certificate" "cloudfront" {
  count = var.create_cloudfront_certificate ? 1 : 0

  provider          = aws.us_east_1  # CloudFront requires us-east-1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = var.subject_alternative_names

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-cloudfront-cert"
    Environment = var.environment
  }
}

# ACM Certificate for ALB (regional)
resource "aws_acm_certificate" "alb" {
  count = var.create_alb_certificate ? 1 : 0

  domain_name       = var.alb_domain_name != "" ? var.alb_domain_name : var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-alb-cert"
    Environment = var.environment
  }
}

# DNS Validation Records for CloudFront Certificate
resource "aws_route53_record" "cloudfront_cert_validation" {
  for_each = var.create_cloudfront_certificate ? {
    for dvo in aws_acm_certificate.cloudfront[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = data.aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# DNS Validation Records for ALB Certificate
resource "aws_route53_record" "alb_cert_validation" {
  for_each = var.create_alb_certificate ? {
    for dvo in aws_acm_certificate.alb[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id         = data.aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

# Certificate Validations
resource "aws_acm_certificate_validation" "cloudfront" {
  count = var.create_cloudfront_certificate ? 1 : 0

  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.cloudfront[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cloudfront_cert_validation : record.fqdn]
}

resource "aws_acm_certificate_validation" "alb" {
  count = var.create_alb_certificate ? 1 : 0

  certificate_arn         = aws_acm_certificate.alb[0].arn
  validation_record_fqdns = [for record in aws_route53_record.alb_cert_validation : record.fqdn]
}

# A Record for CloudFront (root domain)
resource "aws_route53_record" "frontend" {
  count = var.domain_name != "" && var.cloudfront_domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# A Record for CloudFront (www subdomain)
resource "aws_route53_record" "frontend_www" {
  count = var.domain_name != "" && var.cloudfront_domain_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "www.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.cloudfront_domain_name
    zone_id                = var.cloudfront_zone_id
    evaluate_target_health = false
  }
}

# A Record for ALB (API subdomain)
resource "aws_route53_record" "api" {
  count = var.alb_domain_name != "" && var.alb_dns_name != "" ? 1 : 0

  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = var.alb_domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
