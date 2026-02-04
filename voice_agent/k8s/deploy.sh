#!/bin/bash

set -e

# Voice Agent Kubernetes Deployment Script
# This script deploys all Kubernetes manifests in the correct order

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="voice-agent"
GITLAB_USERNAME=""
GITLAB_TOKEN=""
CLUSTER_ISSUER="letsencrypt-prod"
STORAGE_CLASS="local-path"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check if namespace exists (will be created if not)
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        log_warning "Namespace $NAMESPACE already exists"
    else
        log_info "Namespace $NAMESPACE will be created"
    fi
    
    # Check storage class
    if ! kubectl get storageclass $STORAGE_CLASS &> /dev/null; then
        log_warning "Storage class '$STORAGE_CLASS' not found. Available storage classes:"
        kubectl get storageclass
        log_info "Please update STORAGE_CLASS variable or PVC manifest"
    fi
    
    # Check NGINX ingress controller
    if ! kubectl get pods -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx &> /dev/null; then
        log_warning "NGINX Ingress Controller not found in 'ingress-nginx' namespace"
        log_info "Please ensure NGINX Ingress Controller is installed"
    fi
    
    # Check cert-manager
    if ! kubectl get pods -n cert-manager -l app.kubernetes.io/name=cert-manager &> /dev/null; then
        log_warning "Cert-Manager not found in 'cert-manager' namespace"
        log_info "Please ensure Cert-Manager is installed"
    fi
    
    # Check cluster issuer
    if ! kubectl get clusterissuer $CLUSTER_ISSUER &> /dev/null; then
        log_warning "ClusterIssuer '$CLUSTER_ISSUER' not found"
        log_info "Available ClusterIssuers:"
        kubectl get clusterissuer || log_warning "No ClusterIssuers found"
        log_info "Please update CLUSTER_ISSUER variable or ingress manifest"
    fi
    
    log_success "Prerequisites check completed"
}

create_gitlab_secret() {
    log_info "Creating GitLab registry secret..."
    
    if [[ -z "$GITLAB_USERNAME" || -z "$GITLAB_TOKEN" ]]; then
        log_warning "GitLab credentials not provided via environment variables"
        echo -n "Enter GitLab username: "
        read -r GITLAB_USERNAME
        echo -n "Enter GitLab access token (with read_registry permission): "
        read -s GITLAB_TOKEN
        echo
    fi
    
    # Create or update the secret
    kubectl create secret docker-registry gitlab-registry-secret \
        --docker-server=registry.gitlab.com \
        --docker-username="$GITLAB_USERNAME" \
        --docker-password="$GITLAB_TOKEN" \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "GitLab registry secret created/updated"
}

update_secrets() {
    log_info "Please update application secrets in 02-secrets.yaml"
    log_info "Current secrets are placeholders and need to be replaced with actual values"
    
    # Show how to encode secrets
    echo
    log_info "To encode your secrets, use:"
    echo "echo -n 'your-openai-key' | base64"
    echo "echo -n 'your-deepgram-key' | base64"
    echo "echo -n 'your-daily-key' | base64"
    echo "echo -n 'https://your-daily-domain.daily.co/your-room' | base64"
    echo
    
    read -p "Have you updated the secrets? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warning "Please update secrets before proceeding"
        exit 1
    fi
}

deploy_manifests() {
    log_info "Deploying Kubernetes manifests..."
    
    # List of manifests in order
    manifests=(
        "01-namespace.yaml"
        "02-secrets.yaml"
        "03-configmap.yaml"
        "04-pvc.yaml"
        "05-deployment.yaml"
        "06-service.yaml"
        "07-ingress.yaml"
        "08-monitoring.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        if [[ -f "$manifest" ]]; then
            log_info "Applying $manifest..."
            kubectl apply -f "$manifest"
            log_success "Applied $manifest"
        else
            log_warning "Manifest $manifest not found, skipping..."
        fi
    done
}

verify_deployment() {
    log_info "Verifying deployment..."
    
    # Wait for pods to be ready
    log_info "Waiting for pods to be ready..."
    kubectl wait --for=condition=ready pod -l app=voice-agent -n $NAMESPACE --timeout=300s
    
    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n $NAMESPACE
    
    # Check services
    log_info "Services:"
    kubectl get svc -n $NAMESPACE
    
    # Check ingress
    log_info "Ingress:"
    kubectl get ingress -n $NAMESPACE
    
    # Check PVC
    log_info "PersistentVolumeClaim:"
    kubectl get pvc -n $NAMESPACE
    
    log_success "Deployment verification completed"
}

show_next_steps() {
    log_info "Deployment completed successfully!"
    echo
    log_info "Next steps:"
    echo "1. Check application logs: kubectl logs -f deployment/voice-agent -n $NAMESPACE"
    echo "2. Monitor pod status: kubectl get pods -n $NAMESPACE"
    echo "3. Check ingress: kubectl get ingress -n $NAMESPACE"
    echo "4. Access your application at: https://voice.madhu.in"
    echo "5. Check health endpoint: https://voice.madhu.in/health"
    echo
    log_info "Troubleshooting:"
    echo "- If pods are in ImagePullBackOff: Check GitLab credentials"
    echo "- If PVC is pending: Check storage class configuration"
    echo "- If ingress doesn't work: Check DNS and NGINX controller logs"
    echo "- If certificate isn't issued: Check ClusterIssuer and cert-manager logs"
}

cleanup() {
    log_info "Cleaning up..."
    # Add any cleanup logic here if needed
}

# Main execution
main() {
    log_info "Starting Voice Agent Kubernetes deployment..."
    
    # Set up error handling
    trap cleanup EXIT
    
    # Check prerequisites
    check_prerequisites
    
    # Create GitLab secret
    create_gitlab_secret
    
    # Update secrets (interactive)
    update_secrets
    
    # Deploy manifests
    deploy_manifests
    
    # Verify deployment
    verify_deployment
    
    # Show next steps
    show_next_steps
    
    log_success "Deployment script completed successfully!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --gitlab-username)
            GITLAB_USERNAME="$2"
            shift 2
            ;;
        --gitlab-token)
            GITLAB_TOKEN="$2"
            shift 2
            ;;
        --cluster-issuer)
            CLUSTER_ISSUER="$2"
            shift 2
            ;;
        --storage-class)
            STORAGE_CLASS="$2"
            shift 2
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  --gitlab-username TEXT    GitLab username"
            echo "  --gitlab-token TEXT      GitLab access token"
            echo "  --cluster-issuer TEXT    ClusterIssuer name (default: letsencrypt-prod)"
            echo "  --storage-class TEXT     Storage class name (default: local-path)"
            echo "  --namespace TEXT         Namespace name (default: voice-agent)"
            echo "  --help                   Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
