# Chatbot Module - COMPLETE IMPLEMENTATION
# Lambda + API Gateway WebSocket + Bedrock Integration

data "aws_region" "current" {}
data "aws_caller_identity" "current" {}

# Get DynamoDB table
data "aws_dynamodb_table" "bookstore" {
  name = var.dynamodb_table_name
}

# Get JWT secret
data "aws_secretsmanager_secret" "jwt_secret" {
  name = var.jwt_secret_name
}

data "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = data.aws_secretsmanager_secret.jwt_secret.id
}

# ============================================================================
# S3 BUCKET FOR KNOWLEDGE BASE
# ============================================================================

resource "aws_s3_bucket" "kb" {
  bucket = "${var.project_name}-${var.environment}-chatbot-kb-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-${var.environment}-chatbot-kb"
    Environment = var.environment
    Purpose     = "Bedrock Knowledge Base documents"
  }
}

resource "aws_s3_bucket_versioning" "kb" {
  bucket = aws_s3_bucket.kb.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "kb" {
  bucket = aws_s3_bucket.kb.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ============================================================================
# IAM ROLE FOR LAMBDA
# ============================================================================

resource "aws_iam_role" "chatbot_lambda" {
  name = "${var.project_name}-${var.environment}-chatbot-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })

  tags = {
    Name = "${var.project_name}-${var.environment}-chatbot-lambda-role"
  }
}

# Basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.chatbot_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for chatbot
resource "aws_iam_role_policy" "chatbot_lambda" {
  name = "${var.project_name}-${var.environment}-chatbot-lambda-policy"
  role = aws_iam_role.chatbot_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # DynamoDB access
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          data.aws_dynamodb_table.bookstore.arn,
          "${data.aws_dynamodb_table.bookstore.arn}/index/*"
        ]
      },
      # Bedrock access (multi-region: ap-southeast-1 + us-east-1)
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/*",
          "arn:aws:bedrock:us-east-1::foundation-model/*"  # Add us-east-1 for full model access
        ]
      },
      # Bedrock Agent Runtime (for Knowledge Base)
      {
        Effect = "Allow"
        Action = [
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate"
        ]
        Resource = "*"
      },
      # S3 access for Knowledge Base
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.kb.arn,
          "${aws_s3_bucket.kb.arn}/*"
        ]
      },
      # API Gateway Management (send messages back)
      {
        Effect = "Allow"
        Action = [
          "execute-api:ManageConnections"
        ]
        Resource = "arn:aws:execute-api:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:${aws_apigatewayv2_api.chatbot.id}/*"
      },
      # Secrets Manager (read JWT secret)
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = data.aws_secretsmanager_secret.jwt_secret.arn
      }
    ]
  })
}

# ============================================================================
# CLOUDWATCH LOG GROUPS
# ============================================================================

resource "aws_cloudwatch_log_group" "lambda_connect" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-chatbot-connect"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "lambda_disconnect" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-chatbot-disconnect"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "lambda_send_message" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-chatbot-send-message"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "lambda_upload_document" {
  name              = "/aws/lambda/${var.project_name}-${var.environment}-chatbot-upload-document"
  retention_in_days = 7
}

# ============================================================================
# LAMBDA PACKAGES
# ============================================================================

data "archive_file" "lambda_connect" {
  type        = "zip"
  source_dir  = "${var.lambda_source_dir}/connect"
  output_path = "${var.lambda_source_dir}/connect.zip"
  excludes    = ["package-lock.json", "*.zip"]
}

data "archive_file" "lambda_disconnect" {
  type        = "zip"
  source_dir  = "${var.lambda_source_dir}/disconnect"
  output_path = "${var.lambda_source_dir}/disconnect.zip"
  excludes    = ["package-lock.json", "*.zip"]
}

data "archive_file" "lambda_send_message" {
  type        = "zip"
  source_dir  = "${var.lambda_source_dir}/send-message"
  output_path = "${var.lambda_source_dir}/send-message.zip"
  excludes    = ["package-lock.json", "*.zip"]
}

data "archive_file" "lambda_upload_document" {
  type        = "zip"
  source_dir  = "${var.lambda_source_dir}/upload-document"
  output_path = "${var.lambda_source_dir}/upload-document.zip"
  excludes    = ["package-lock.json", "*.zip"]
}

# Lambda Layer source (pre-built by build-layer.ps1 script)
# Run: chatbot/lambda/build-layer.ps1 to create shared-layer.zip


# ============================================================================
# LAMBDA LAYER
# ============================================================================

# Lambda Layer (pre-built with dependencies)
resource "aws_lambda_layer_version" "chatbot_shared" {
  filename            = "${var.lambda_source_dir}/shared-layer.zip"
  layer_name          = "${var.project_name}-${var.environment}-chatbot-shared"
  compatible_runtimes = ["nodejs20.x"]
  source_code_hash    = filebase64sha256("${var.lambda_source_dir}/shared-layer.zip")

  description = "Shared utilities for ${var.environment} chatbot (includes jsonwebtoken)"
}

# ============================================================================
# LAMBDA FUNCTIONS
# ============================================================================

# Lambda: Connect Handler
resource "aws_lambda_function" "chatbot_connect" {
  filename         = data.archive_file.lambda_connect.output_path
  function_name    = "${var.project_name}-${var.environment}-chatbot-connect"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_connect.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256

  # No layer needed - shared code bundled in function

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      # AWS_REGION removed - Lambda sets this automatically (reserved key)
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_connect]
}

# Lambda: Disconnect Handler
resource "aws_lambda_function" "chatbot_disconnect" {
  filename         = data.archive_file.lambda_disconnect.output_path
  function_name    = "${var.project_name}-${var.environment}-chatbot-disconnect"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_disconnect.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 10
  memory_size     = 256

  # No layer needed - shared code bundled in function

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      # AWS_REGION removed - Lambda sets this automatically (reserved key)
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_disconnect]
}

# Lambda: Send Message Handler (Main logic with Bedrock)
resource "aws_lambda_function" "chatbot_send_message" {
  filename         = data.archive_file.lambda_send_message.output_path
  function_name    = "${var.project_name}-${var.environment}-chatbot-send-message"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_send_message.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 60    # Increased for Bedrock API calls
  memory_size     = 1024

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME         = var.dynamodb_table_name
      JWT_SECRET         = data.aws_secretsmanager_secret_version.jwt_secret.secret_string
      # AWS_REGION removed - Lambda sets this automatically (reserved key)
      KNOWLEDGE_BASE_ID  = var.knowledge_base_id
      APIGW_ENDPOINT     = "${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_send_message
  ]
}

# Lambda: Upload Document Handler (Admin only)
resource "aws_lambda_function" "chatbot_upload_document" {
  filename         = data.archive_file.lambda_upload_document.output_path
  function_name    = "${var.project_name}-${var.environment}-chatbot-upload-document"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_upload_document.output_base64sha256
  runtime         = "nodejs20.x"
  timeout         = 60
  memory_size     = 512

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME         = var.dynamodb_table_name
      JWT_SECRET         = data.aws_secretsmanager_secret_version.jwt_secret.secret_string
      # AWS_REGION removed - Lambda sets this automatically (reserved key)
      KB_BUCKET_NAME     = aws_s3_bucket.kb.id
      KNOWLEDGE_BASE_ID  = var.knowledge_base_id
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_upload_document
  ]
}

# ============================================================================
# API GATEWAY WEBSOCKET
# ============================================================================

resource "aws_apigatewayv2_api" "chatbot" {
  name                       = "${var.project_name}-${var.environment}-chatbot-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"

  tags = {
    Name        = "${var.project_name}-${var.environment}-chatbot-websocket"
    Environment = var.environment
  }
}

# Integrations
resource "aws_apigatewayv2_integration" "connect" {
  api_id           = aws_apigatewayv2_api.chatbot.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.chatbot_connect.invoke_arn
}

resource "aws_apigatewayv2_integration" "disconnect" {
  api_id           = aws_apigatewayv2_api.chatbot.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.chatbot_disconnect.invoke_arn
}

resource "aws_apigatewayv2_integration" "send_message" {
  api_id           = aws_apigatewayv2_api.chatbot.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.chatbot_send_message.invoke_arn
}

# Routes
resource "aws_apigatewayv2_route" "connect" {
  api_id    = aws_apigatewayv2_api.chatbot.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.connect.id}"
}

resource "aws_apigatewayv2_route" "disconnect" {
  api_id    = aws_apigatewayv2_api.chatbot.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.disconnect.id}"
}

resource "aws_apigatewayv2_route" "default" {
  api_id    = aws_apigatewayv2_api.chatbot.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.send_message.id}"
}

# Stage
resource "aws_apigatewayv2_stage" "prod" {
  api_id      = aws_apigatewayv2_api.chatbot.id
  name        = "prod"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 500
    throttling_rate_limit  = 100
  }

  tags = {
    Name        = "${var.project_name}-${var.environment}-chatbot-prod"
    Environment = var.environment
  }
}

# ============================================================================
# LAMBDA PERMISSIONS FOR API GATEWAY
# ============================================================================

resource "aws_lambda_permission" "apigw_connect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot_connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chatbot.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_disconnect" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot_disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chatbot.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_send_message" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.chatbot_send_message.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.chatbot.execution_arn}/*/*"
}
