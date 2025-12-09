
# Get existing DynamoDB table
data "aws_dynamodb_table" "bookstore" {
  name = var.dynamodb_table_name
}

# Get JWT secret from Secrets Manager (same as backend)
data "aws_secretsmanager_secret" "jwt_secret" {
  name = var.jwt_secret_name
}

data "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id = data.aws_secretsmanager_secret.jwt_secret.id
}

# Get current AWS account and region
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ============================================================================
# S3 BUCKET FOR KNOWLEDGE BASE DOCUMENTS
# ============================================================================

resource "aws_s3_bucket" "chatbot_kb" {
  bucket = "${var.project_name}-chatbot-kb-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "${var.project_name}-chatbot-kb"
    Environment = var.environment
    Purpose     = "Bedrock Knowledge Base documents"
  }
}

resource "aws_s3_bucket_versioning" "chatbot_kb" {
  bucket = aws_s3_bucket.chatbot_kb.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "chatbot_kb" {
  bucket = aws_s3_bucket.chatbot_kb.id

  rule {
    id     = "delete-old-versions"
    status = "Enabled"

    filter {}  # Empty filter applies to all objects

    noncurrent_version_expiration {
      noncurrent_days = 90
    }
  }
}

# ============================================================================
# IAM ROLE FOR LAMBDA FUNCTIONS
# ============================================================================

resource "aws_iam_role" "chatbot_lambda" {
  name = "${var.project_name}-chatbot-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-chatbot-lambda-role"
  }
}

# Policy for Lambda to write logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.chatbot_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for Chatbot Lambda
resource "aws_iam_role_policy" "chatbot_lambda" {
  name = "${var.project_name}-chatbot-lambda-policy"
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
      # Bedrock access
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = "arn:aws:bedrock:${data.aws_region.current.name}::foundation-model/*"
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
          aws_s3_bucket.chatbot_kb.arn,
          "${aws_s3_bucket.chatbot_kb.arn}/*"
        ]
      },
      # API Gateway Management API (send messages back)
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
  name              = "/aws/lambda/${var.project_name}-chatbot-connect"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "lambda_disconnect" {
  name              = "/aws/lambda/${var.project_name}-chatbot-disconnect"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "lambda_send_message" {
  name              = "/aws/lambda/${var.project_name}-chatbot-send-message"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "lambda_upload_document" {
  name              = "/aws/lambda/${var.project_name}-chatbot-upload-document"
  retention_in_days = 7
}

# ============================================================================
# LAMBDA FUNCTIONS
# ============================================================================

# Package Lambda code (in practice, run: cd lambda/connect && npm install && cd ../..)
data "archive_file" "lambda_connect" {
  type        = "zip"
  source_dir  = "${path.module}/../../chatbot/lambda/connect"
  output_path = "${path.module}/../../chatbot/lambda/connect.zip"
  excludes    = ["node_modules", "package-lock.json", "*.zip"]
}

data "archive_file" "lambda_disconnect" {
  type        = "zip"
  source_dir  = "${path.module}/../../chatbot/lambda/disconnect"
  output_path = "${path.module}/../../chatbot/lambda/disconnect.zip"
  excludes    = ["node_modules", "package-lock.json", "*.zip"]
}

data "archive_file" "lambda_send_message" {
  type        = "zip"
  source_dir  = "${path.module}/../../chatbot/lambda/send-message"
  output_path = "${path.module}/../../chatbot/lambda/send-message.zip"
  excludes    = ["node_modules", "package-lock.json", "*.zip"]
}

data "archive_file" "lambda_upload_document" {
  type        = "zip"
  source_dir  = "${path.module}/../../chatbot/lambda/upload-document"
  output_path = "${path.module}/../../chatbot/lambda/upload-document.zip"
  excludes    = ["node_modules", "package-lock.json", "*.zip"]
}

data "archive_file" "lambda_shared" {
  type        = "zip"
  source_dir  = "${path.module}/../../chatbot/lambda/shared"
  output_path = "${path.module}/../../chatbot/lambda/shared.zip"
}

# Lambda Layer for shared code
resource "aws_lambda_layer_version" "chatbot_shared" {
  filename            = data.archive_file.lambda_shared.output_path
  layer_name          = "${var.project_name}-chatbot-shared"
  compatible_runtimes = ["nodejs18.x", "nodejs20.x"]
  source_code_hash    = data.archive_file.lambda_shared.output_base64sha256

  description = "Shared utilities for chatbot Lambda functions"
}

# Lambda: Connect Handler
resource "aws_lambda_function" "chatbot_connect" {
  filename         = data.archive_file.lambda_connect.output_path
  function_name    = "${var.project_name}-chatbot-connect"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_connect.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 10
  memory_size     = 256

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      AWS_REGION = data.aws_region.current.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_connect]
}

# Lambda: Disconnect Handler
resource "aws_lambda_function" "chatbot_disconnect" {
  filename         = data.archive_file.lambda_disconnect.output_path
  function_name    = "${var.project_name}-chatbot-disconnect"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_disconnect.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 10
  memory_size     = 256

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME = var.dynamodb_table_name
      AWS_REGION = data.aws_region.current.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_disconnect]
}

# Lambda: Send Message Handler (Main logic)
resource "aws_lambda_function" "chatbot_send_message" {
  filename         = data.archive_file.lambda_send_message.output_path
  function_name    = "${var.project_name}-chatbot-send-message"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_send_message.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 1024

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME         = var.dynamodb_table_name
      JWT_SECRET         = data.aws_secretsmanager_secret_version.jwt_secret.secret_string
      AWS_REGION         = data.aws_region.current.name
      KNOWLEDGE_BASE_ID  = var.knowledge_base_id
      APIGW_ENDPOINT     = "${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}"
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_send_message]
}

# Lambda: Upload Document Handler
resource "aws_lambda_function" "chatbot_upload_document" {
  filename         = data.archive_file.lambda_upload_document.output_path
  function_name    = "${var.project_name}-chatbot-upload-document"
  role            = aws_iam_role.chatbot_lambda.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_upload_document.output_base64sha256
  runtime         = "nodejs18.x"
  timeout         = 60
  memory_size     = 512

  layers = [aws_lambda_layer_version.chatbot_shared.arn]

  environment {
    variables = {
      TABLE_NAME         = var.dynamodb_table_name
      JWT_SECRET         = data.aws_secretsmanager_secret_version.jwt_secret.secret_string
      AWS_REGION         = data.aws_region.current.name
      KB_BUCKET_NAME     = aws_s3_bucket.chatbot_kb.id
      KNOWLEDGE_BASE_ID  = var.knowledge_base_id
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda_upload_document]
}

# ============================================================================
# API GATEWAY WEBSOCKET
# ============================================================================

resource "aws_apigatewayv2_api" "chatbot" {
  name                       = "${var.project_name}-chatbot-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"

  tags = {
    Name = "${var.project_name}-chatbot-websocket"
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
    Name = "${var.project_name}-chatbot-prod"
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
