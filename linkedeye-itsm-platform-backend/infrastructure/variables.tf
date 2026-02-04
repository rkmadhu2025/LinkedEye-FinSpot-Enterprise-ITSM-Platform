# Terraform Variables for Kubernetes Infrastructure
# Environment: Production

# Cluster Configuration
variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "Kubernetes cluster name"
  type        = string
  default     = "fs-le-dev1"
}

# Namespace Configuration
variable "namespace_name" {
  description = "Kubernetes namespace for ITSM platform"
  type        = string
  default     = "incident-linkedeye-itsm"
}

# Database Configuration
variable "database_host" {
  description = "PostgreSQL host"
  type        = string
  default     = "postgres-service"
}

variable "database_port" {
  description = "PostgreSQL port"
  type        = number
  default     = 5432
}

variable "database_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "linkedeye_itsm"
}

variable "db_user" {
  description = "Database username"
  type        = string
  default     = "linkedeye_user"
}

variable "db_password" {
  description = "Database password (use environment variable in production)"
  type        = string
  default     = ""
  sensitive   = true
}

# Redis Configuration
variable "redis_host" {
  description = "Redis host"
  type        = string
  default     = "redis-service"
}

variable "redis_port" {
  description = "Redis port"
  type        = number
  default     = 6379
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  default     = ""
  sensitive   = true
}

# Application Configuration
variable "backend_image" {
  description = "Backend container image"
  type        = string
  default     = "registry.gitlab.com/finspot-le-dev/fs-le-dev-finspot-incident-tool/backend:latest"
}

variable "frontend_image" {
  description = "Frontend container image"
  type        = string
  default     = "registry.gitlab.com/finspot-le-dev/fs-le-dev-finspot-incident-tool/frontend:latest"
}

variable "jwt_secret" {
  description = "JWT secret key for authentication"
  type        = string
  default     = ""
  sensitive   = true
}

# Domain Configuration
variable "frontend_domain" {
  description = "Frontend domain name"
  type        = string
  default     = "fs-le-dev-inc.finspot.in"
}

variable "backend_domain" {
  description = "Backend API domain name"
  type        = string
  default     = "fs-le-dev-inc.api.finspot.in"
}

# Resource Limits
variable "backend_replicas" {
  description = "Number of backend replicas"
  type        = number
  default     = 3
}

variable "backend_resources" {
  description = "Backend container resource limits"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "250m"
      memory = "512Mi"
    }
    limits = {
      cpu    = "1000m"
      memory = "2Gi"
    }
  }
}

variable "frontend_replicas" {
  description = "Number of frontend replicas"
  type        = number
  default     = 2
}

variable "frontend_resources" {
  description = "Frontend container resource limits"
  type = object({
    requests = object({
      cpu    = string
      memory = string
    })
    limits = object({
      cpu    = string
      memory = string
    })
  })
  default = {
    requests = {
      cpu    = "100m"
      memory = "128Mi"
    }
    limits = {
      cpu    = "500m"
      memory = "512Mi"
    }
  }
}

# Monitoring
variable "enable_monitoring" {
  description = "Enable monitoring annotations"
  type        = bool
  default     = true
}

# Security
variable "enable_pod_security" {
  description = "Enable pod security policies"
  type        = bool
  default     = true
}
