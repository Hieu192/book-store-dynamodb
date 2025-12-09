# Chatbot Module README

## Overview
This module creates the chatbot infrastructure with Lambda functions and API Gateway WebSocket.

## Full Implementation
For a complete chatbot module implementation, copy all resources from:
- `../../chatbot.tf` - All Lambda functions, integrations, routes, stage
- `../../chatbot-variables.tf` - All chatbot-specific variables

And apply environment-specific naming:
```hcl
name = "${var.project_name}-${var.environment}-chatbot-connect"
# Instead of: "${var.project_name}-chatbot-connect"
```

## Lambda Functions to Add
1. `chatbot_connect` - WebSocket connection handler
2. `chatbot_disconnect` - WebSocket disconnection handler
3. `chatbot_send_message` - Message processing with Bedrock
4. `chatbot_upload_document` - KB document upload (admin only)

## API Gateway Routes
- `$connect` → chatbot_connect Lambda
- `$disconnect` → chatbot_disconnect Lambda
- `$default` → chatbot_send_message Lambda

## Required Manual Steps
1. Create Bedrock Knowledge Base in AWS Console
2. Update `knowledge_base_id` variable
3. Upload documents to S3 bucket
4. Test WebSocket connection

## Usage in Environment
```hcl
module "chatbot" {
  source = "../../modules/chatbot"
  
  project_name         = var.project_name
  environment          = "dev"
  dynamodb_table_name  = var.dynamodb_table_name
  jwt_secret_name      = "bookstore/dev/jwt-secret"
  knowledge_base_id    = var.knowledge_base_id
}
```
