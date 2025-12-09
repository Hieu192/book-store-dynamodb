# S3 backend configuration for Terraform state
# This is used by both dev and prod environments with different keys

terraform {
  backend "s3" {
    bucket         = "bookstore-tf-state-hieu192"
    # key will be set per environment:
    # - dev: "bookstore/dev/terraform.tfstate"
    # - prod: "bookstore/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
