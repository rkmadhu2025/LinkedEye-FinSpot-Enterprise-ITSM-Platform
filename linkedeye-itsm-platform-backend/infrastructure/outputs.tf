# Terraform Outputs for LinkedEye ITSM Platform

# Cluster Information
output "cluster_name" {
  description = "Kubernetes cluster name"
  value       = var.cluster_name
}

output "namespace" {
  description = "Kubernetes namespace"
  value       = kubernetes_namespace.itsm_namespace.metadata[0].name
}

# Deployment Information
output "backend_deployment_name" {
  description = "Backend deployment name"
  value       = kubernetes_deployment.backend.metadata[0].name
}

output "backend_service_name" {
  description = "Backend service name"
  value       = kubernetes_service.backend.metadata[0].name
}

output "frontend_deployment_name" {
  description = "Frontend deployment name"
  value       = kubernetes_deployment.frontend.metadata[0].name
}

output "frontend_service_name" {
  description = "Frontend service name"
  value       = kubernetes_service.frontend.metadata[0].name
}

# Scaling Information
output "backend_replicas" {
  description = "Number of backend replicas"
  value       = var.backend_replicas
}

output "frontend_replicas" {
  description = "Number of frontend replicas"
  value       = var.frontend_replicas
}

# Access Information
output "backend_api_url" {
  description = "Backend API URL"
  value       = "https://${var.backend_domain}/api/v1"
}

output "frontend_url" {
  description = "Frontend URL"
  value       = "https://${var.frontend_domain}"
}

# Resource Information
output "backend_resources" {
  description = "Backend resource allocation"
  value       = var.backend_resources
}

output "frontend_resources" {
  description = "Frontend resource allocation"
  value       = var.frontend_resources
}

# Service Endpoints
output "backend_endpoint" {
  description = "Backend service cluster IP"
  value       = kubernetes_service.backend.spec[0].cluster_ip
}

output "frontend_endpoint" {
  description = "Frontend service cluster IP"
  value       = kubernetes_service.frontend.spec[0].cluster_ip
}

# HPA Information
output "hpa_min_replicas" {
  description = "HPA minimum replicas"
  value       = kubernetes_horizontal_pod_autoscaler.backend.spec[0].min_replicas
}

output "hpa_max_replicas" {
  description = "HPA maximum replicas"
  value       = kubernetes_horizontal_pod_autoscaler.backend.spec[0].max_replicas
}
