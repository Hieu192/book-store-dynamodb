# ============================================================================
# CHATBOT VARIABLES AND OUTPUTS
# ============================================================================

# ============================================================================
# VARIABLES
# ============================================================================

variable "chatbot_enabled" {
  description = "Enable chatbot infrastructure deployment"
  type        = bool
  default     = true
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table (shared with backend)"
  type        = string
  default     = "BookStore"
}

variable "jwt_secret_name" {
  description = "Name of the Secrets Manager secret containing JWT secret"
  type        = string
  default     = "bookstore/jwt-secret"
}

variable "knowledge_base_id" {
  description = "Bedrock Knowledge Base ID (create manually first)"
  type        = string
  default     = ""  # Will be updated after creating KB
}

# ============================================================================
# OUTPUTS
# ============================================================================

output "chatbot_websocket_url" {
  description = "WebSocket URL for chatbot connections"
  value       = "wss://${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}"
}

output "chatbot_api_id" {
  description = "API Gateway WebSocket API ID"
  value       = aws_apigatewayv2_api.chatbot.id
}

output "chatbot_kb_bucket_name" {
  description = "S3 bucket name for Knowledge Base documents"
  value       = aws_s3_bucket.chatbot_kb.id
}

output "chatbot_kb_bucket_arn" {
  description = "S3 bucket ARN for Knowledge Base documents"
  value       = aws_s3_bucket.chatbot_kb.arn
}

output "lambda_connect_arn" {
  description = "Lambda Connect function ARN"
  value       = aws_lambda_function.chatbot_connect.arn
}

output "lambda_send_message_arn" {
  description = "Lambda Send Message function ARN"
  value       = aws_lambda_function.chatbot_send_message.arn
}

output "lambda_upload_document_arn" {
  description = "Lambda Upload Document function ARN"
  value       = aws_lambda_function.chatbot_upload_document.arn
}

# ============================================================================
# DEPLOYMENT INSTRUCTIONS
# ============================================================================

output "deployment_instructions" {
  description = "Next steps for chatbot deployment"
  value = <<-EOT
  
  ✅ Chatbot Infrastructure Deployed!
  
  📝 Next Steps:
  
  1. Install Lambda dependencies:
     cd ../../chatbot/lambda/connect && npm install
     cd ../disconnect && npm install
     cd ../send-message && npm install
     cd ../upload-document && npm install
  
  2. Create Bedrock Knowledge Base (manual):
     - Go to AWS Bedrock console
     - Create Knowledge Base
     - Use S3 bucket: ${aws_s3_bucket.chatbot_kb.id}
     - Update terraform.tfvars with KB ID
  
  3. Frontend Configuration:
     - Add to .env:
       REACT_APP_CHATBOT_WS_URL=wss://${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}
  
  4. Test WebSocket:
     wscat -c wss://${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}?temp=123
  
  EOT
}
