output "websocket_url" {
  description = "Chatbot WebSocket URL"
  value       = module.chatbot.websocket_url
}

output "api_id" {
  description = "API Gateway WebSocket API ID"
  value       = module.chatbot.api_id
}

output "kb_bucket_name" {
  description = "S3 bucket for Knowledge Base documents"
  value       = module.chatbot.kb_bucket_name
}

output "kb_bucket_arn" {
  description = "S3 bucket ARN"
  value       = module.chatbot.kb_bucket_arn
}

output "lambda_connect_arn" {
  description = "Lambda Connect function ARN"
  value       = module.chatbot.lambda_connect_arn
}

output "lambda_send_message_arn" {
  description = "Lambda Send Message function ARN"
  value       = module.chatbot.lambda_send_message_arn
}

output "lambda_upload_document_arn" {
  description = "Lambda Upload Document function ARN"
  value       = module.chatbot.lambda_upload_document_arn
}

output "deployment_summary" {
  description = "Next steps after deployment"
  value = <<-EOT
  
  ✅ Chatbot deployed successfully!
  
  📋 Next Steps:
  
  1️⃣  Save WebSocket URL:
     ${module.chatbot.websocket_url}
  
  2️⃣  Upload documents to Knowledge Base bucket:
     aws s3 cp your-doc.txt s3://${module.chatbot.kb_bucket_name}/docs/
  
  3️⃣  Create Bedrock Knowledge Base:
     URL: https://ap-southeast-1.console.aws.amazon.com/bedrock/home#/knowledge-bases
     S3 URI: s3://${module.chatbot.kb_bucket_name}/
  
  4️⃣  Update terraform.tfvars with KB ID:
     knowledge_base_id = "YOUR_KB_ID"
     terraform apply
  
  5️⃣  Test WebSocket:
     npm install -g wscat
     wscat -c "${module.chatbot.websocket_url}"
     Send: {"type":"message","message":"Hello","userId":"test"}
  
  📊 Resources Created:
  - 4 Lambda functions
  - 1 Lambda Layer
  - 1 API Gateway WebSocket
  - 1 S3 bucket for KB
  - CloudWatch Log Groups
  - IAM roles & policies
  
  💰 Estimated Cost: ~$3-7/month
  
  EOT
}
