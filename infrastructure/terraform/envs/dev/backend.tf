# Dev Environment Backend Configuration
# State file stored separately from prod

terraform {
  backend "s3" {
    bucket         = "bookstore-tf-state-hieu192"
    key            = "bookstore/dev/terraform.tfstate"  # Dev state
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
