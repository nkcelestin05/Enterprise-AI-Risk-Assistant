# =============================================================================
# Enterprise AI Risk Assessment Assistant - Terraform Variables
# =============================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (development, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "app_name" {
  description = "Application name used for resource naming"
  type        = string
  default     = "enterprise-risk-assistant"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "risk-assistant.example.com"
}

# Networking
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Database
variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "risk_assistant"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "dbadmin"
  sensitive   = true
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
}

# Container Configuration
variable "container_port" {
  description = "Port the container listens on"
  type        = number
  default     = 3000
}

variable "task_cpu" {
  description = "Fargate task CPU units (1024 = 1 vCPU)"
  type        = string
  default     = "512"
}

variable "task_memory" {
  description = "Fargate task memory in MiB"
  type        = string
  default     = "1024"
}

variable "desired_count" {
  description = "Desired number of running tasks"
  type        = number
  default     = 2
}

variable "max_capacity" {
  description = "Maximum number of tasks for auto-scaling"
  type        = number
  default     = 6
}

# Secrets
variable "nextauth_secret" {
  description = "NextAuth.js secret for JWT signing"
  type        = string
  sensitive   = true
}

variable "abacusai_api_key" {
  description = "Abacus.AI API key for LLM access"
  type        = string
  sensitive   = true
}
