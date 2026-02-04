# Terraform Main Configuration for LinkedEye ITSM Platform
# This configuration manages Kubernetes resources as Infrastructure as Code

terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  # Configure remote state storage (optional - uncomment for production)
  # backend "remote" {
  #   hostname     = "app.terraform.io"
  #   organization = "your-organization"
  #   workspaces {
  #     name = "linkedeye-itsm"
  #   }
  # }

  required_version = ">= 1.0.0"
}

# Kubernetes Provider Configuration
provider "kubernetes" {
  config_path    = "~/.kube/config"
  config_context = var.cluster_name

  # Alternative: Use in-cluster config (for CI/CD runners)
  # config_path = null
  # host = var.k8s_host
  # token = var.k8s_token
  # certificate_authority = var.k8s_ca_cert
}

# Helm Provider Configuration
provider "helm" {
  kubernetes {
    config_path    = "~/.kube/config"
    config_context = var.cluster_name
  }
}

# Create Kubernetes Namespace
resource "kubernetes_namespace" "itsm_namespace" {
  metadata {
    name = var.namespace_name

    labels = {
      environment   = var.environment
      managed-by    = "terraform"
      project       = "linkedeye-itsm"
      organization  = "finspot"
    }

    annotations = {
      description = "LinkedEye ITSM Platform namespace"
      created_at  = timestamp()
    }
  }
}

# Create ConfigMap for Backend Configuration
resource "kubernetes_config_map" "backend_config" {
  metadata {
    name      = "itsm-backend-config"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  data = {
    DATABASE_HOST      = var.database_host
    DATABASE_PORT      = var.database_port
    DATABASE_NAME      = var.database_name
    ALLOWED_HOSTS      = "*"
    ALLOWED_ORIGINS    = "https://${var.frontend_domain}"
    RATE_LIMIT_ENABLED = "true"
    ENVIRONMENT        = var.environment
    DEBUG              = var.environment == "production" ? "false" : "true"
    CELERY_BROKER_URL  = "redis://:${var.redis_password}@${var.redis_host}:${var.redis_port}/1"
    CELERY_RESULT_BACKEND = "redis://:${var.redis_password}@${var.redis_host}:${var.redis_port}/2"
  }

  depends_on = [kubernetes_namespace.itsm_namespace]
}

# Create Secret for Backend (use external secrets in production)
resource "kubernetes_secret" "backend_secrets" {
  metadata {
    name      = "itsm-backend-secrets"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  data = {
    DATABASE_USER     = var.db_user
    DATABASE_PASSWORD = var.db_password
    REDIS_PASSWORD    = var.redis_password
    JWT_SECRET_KEY    = var.jwt_secret
  }

  type = "Opaque"

  depends_on = [kubernetes_namespace.itsm_namespace]
}

# Create Image Pull Secret for GitLab Registry
resource "kubernetes_secret" "gitlab_registry" {
  metadata {
    name      = "gitlab-registry-auth"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  type = "kubernetes.io/dockerconfigjson"

  # Base64 encoded docker config (generate with: kubectl create secret docker-registry)
  # data = filebase64("${path.module}/.gitlab-docker-config")

  depends_on = [kubernetes_namespace.itsm_namespace]
}

# Create Backend Deployment
resource "kubernetes_deployment" "backend" {
  metadata {
    name      = "linkedeye-backend"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
    labels = {
      app              = "linkedeye-backend"
      environment      = var.environment
      managed-by       = "terraform"
      version          = "1.0.0"
    }
  }

  spec {
    replicas = var.backend_replicas

    selector {
      match_labels = {
        app = "linkedeye-backend"
      }
    }

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge       = "25%"
        max_unavailable = "0"
      }
    }

    template {
      metadata {
        labels = {
          app              = "linkedeye-backend"
          environment      = var.environment
          managed-by       = "terraform"
          version          = "1.0.0"
        }

        annotations = var.enable_monitoring ? {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8000"
          "prometheus.io/path"   = "/metrics"
        } : {}
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.gitlab_registry.metadata[0].name
        }

        container {
          name  = "backend"
          image = var.backend_image

          image_pull_policy = "Always"

          port {
            container_port = 8000
            name           = "http"
          }

          env_from {
            config_map_ref {
              name = kubernetes_config_map.backend_config.metadata[0].name
            }
          }

          env_from {
            secret_ref {
              name = kubernetes_secret.backend_secrets.metadata[0].name
            }
          }

          resources {
            requests = {
              cpu    = var.backend_resources.requests.cpu
              memory = var.backend_resources.requests.memory
            }
            limits = {
              cpu    = var.backend_resources.limits.cpu
              memory = var.backend_resources.limits.memory
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8000
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/health"
              port = 8000
            }
            initial_delay_seconds = 10
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          startup_probe {
            http_get {
              path = "/health"
              port = 8000
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 3
            failure_threshold     = 30
          }

          volume_mount {
            name      = "logs"
            mount_path = "/app/logs"
          }
        }

        volume {
          name = "logs"
          empty_dir {}
        }

        termination_grace_period_seconds = 30

        affinity {
          pod_anti_affinity {
            preferred_during_scheduling_ignored_during_execution {
              weight = 100
              pod_affinity_term {
                label_selector {
                  match_labels = {
                    app = "linkedeye-backend"
                  }
                }
                topology_key = "kubernetes.io/hostname"
              }
            }
          }
        }
      }
    }
  }

  depends_on = [
    kubernetes_config_map.backend_config,
    kubernetes_secret.backend_secrets,
    kubernetes_secret.gitlab_registry
  ]
}

# Create Backend Service
resource "kubernetes_service" "backend" {
  metadata {
    name      = "linkedeye-backend"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  spec {
    selector = {
      app = "linkedeye-backend"
    }

    port {
      port        = 8000
      target_port = 8000
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_deployment.backend]
}

# Create Frontend Deployment
resource "kubernetes_deployment" "frontend" {
  metadata {
    name      = "linkedeye-frontend"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
    labels = {
      app              = "linkedeye-frontend"
      environment      = var.environment
      managed-by       = "terraform"
      version          = "1.0.0"
    }
  }

  spec {
    replicas = var.frontend_replicas

    selector {
      match_labels = {
        app = "linkedeye-frontend"
      }
    }

    strategy {
      type = "RollingUpdate"
    }

    template {
      metadata {
        labels = {
          app              = "linkedeye-frontend"
          environment      = var.environment
          managed-by       = "terraform"
          version          = "1.0.0"
        }
      }

      spec {
        image_pull_secrets {
          name = kubernetes_secret.gitlab_registry.metadata[0].name
        }

        container {
          name  = "frontend"
          image = var.frontend_image

          image_pull_policy = "Always"

          port {
            container_port = 80
            name           = "http"
          }

          env {
            name  = "API_BASE_URL"
            value = "https://${var.backend_domain}/api/v1"
          }

          resources {
            requests = {
              cpu    = var.frontend_resources.requests.cpu
              memory = var.frontend_resources.requests.memory
            }
            limits = {
              cpu    = var.frontend_resources.limits.cpu
              memory = var.frontend_resources.limits.memory
            }
          }

          liveness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 10
            period_seconds        = 30
            timeout_seconds       = 5
          }

          readiness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 5
            period_seconds        = 10
            timeout_seconds       = 3
          }
        }
      }
    }
  }

  depends_on = [kubernetes_secret.gitlab_registry]
}

# Create Frontend Service
resource "kubernetes_service" "frontend" {
  metadata {
    name      = "linkedeye-frontend"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  spec {
    selector = {
      app = "linkedeye-frontend"
    }

    port {
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }

  depends_on = [kubernetes_deployment.frontend]
}

# Create Ingress for Backend API
resource "kubernetes_ingress_v1" "backend" {
  metadata {
    name      = "linkedeye-backend-ingress"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                    = "nginx"
      "nginx.ingress.kubernetes.io/ssl-redirect"       = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size"    = "50m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout" = "300"
      "nginx.ingress.kubernetes.io/proxy-send-timeout" = "300"
    }
  }

  spec {
    rule {
      host = var.backend_domain
      http {
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.backend.metadata[0].name
              port {
                number = 8000
              }
            }
          }
        }
      }
    }

    tls {
      secret_name = "tls-certificate"
      hosts       = [var.backend_domain]
    }
  }

  depends_on = [kubernetes_service.backend]
}

# Create Ingress for Frontend
resource "kubernetes_ingress_v1" "frontend" {
  metadata {
    name      = "linkedeye-frontend-ingress"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                    = "nginx"
      "nginx.ingress.kubernetes.io/ssl-redirect"       = "true"
      "nginx.ingress.kubernetes.io/proxy-body-size"    = "50m"
      "nginx.ingress.kubernetes.io/use-regex"          = "true"
    }
  }

  spec {
    rule {
      host = var.frontend_domain
      http {
        path {
          path      = "/api"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.backend.metadata[0].name
              port {
                number = 8000
              }
            }
          }
        }
        path {
          path      = "/"
          path_type = "Prefix"
          backend {
            service {
              name = kubernetes_service.frontend.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    tls {
      secret_name = "tls-certificate"
      hosts       = [var.frontend_domain]
    }
  }

  depends_on = [kubernetes_service.frontend, kubernetes_service.backend]
}

# Horizontal Pod Autoscaler for Backend
resource "kubernetes_horizontal_pod_autoscaler" "backend" {
  metadata {
    name      = "linkedeye-backend-hpa"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  spec {
    min_replicas = 2
    max_replicas = 10

    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = "linkedeye-backend"
    }

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type               = "Utilization"
          average_utilization = 70
        }
      }
    }
  }

  depends_on = [kubernetes_deployment.backend]
}

# Pod Disruption Budget for Backend
resource "kubernetes_pod_disruption_budget" "backend" {
  metadata {
    name      = "linkedeye-backend-pdb"
    namespace = kubernetes_namespace.itsm_namespace.metadata[0].name
  }

  spec {
    max_unavailable = 1

    selector {
      match_labels = {
        app = "linkedeye-backend"
      }
    }
  }

  depends_on = [kubernetes_deployment.backend]
}
