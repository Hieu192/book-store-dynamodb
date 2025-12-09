output "websocket_url" {
  description = "WebSocket URL for chatbot connections"
  value       = "${aws_apigatewayv2_api.chatbot.api_endpoint}/${aws_apigatewayv2_stage.prod.name}"
}

output "api_id" {
  description = "API Gateway WebSocket API ID"
  value       = aws_apigatewayv2_api.chatbot.id
}

output "kb_bucket_name" {
  description = "S3 bucket name for Knowledge Base documents"
  value       = aws_s3_bucket.kb.id
}

output "kb_bucket_arn" {
  description = "S3 bucket ARN for Knowledge Base"
  value       = aws_s3_bucket.kb.arn
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
