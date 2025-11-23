# ElastiCache Redis for caching and sessions

# Subnet Group for Redis
resource "aws_elasticache_subnet_group" "redis" {
  name       = "${var.project_name}-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-redis-subnet-group"
  }
}

# Security Group for Redis
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-redis-sg"
  description = "Security group for Redis (only ECS access)"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    description     = "Redis from ECS tasks"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-redis-sg"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${var.project_name}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t4g.small"  # 1.5GB RAM, $24.48/month
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
  security_group_ids   = [aws_security_group.redis.id]

  # Maintenance window
  maintenance_window = "sun:05:00-sun:06:00"

  # Snapshot settings
  snapshot_retention_limit = 1
  snapshot_window          = "03:00-04:00"

  # Auto minor version upgrade
  auto_minor_version_upgrade = true

  # Note: Encryption và auth_token chỉ có trên Replication Group
  # Để nâng cấp bảo mật, cần chuyển sang aws_elasticache_replication_group

  tags = {
    Name = "${var.project_name}-redis"
  }
}

# Outputs
output "redis_endpoint" {
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
  description = "Redis endpoint"
}

output "redis_port" {
  value       = aws_elasticache_cluster.redis.port
  description = "Redis port"
}
