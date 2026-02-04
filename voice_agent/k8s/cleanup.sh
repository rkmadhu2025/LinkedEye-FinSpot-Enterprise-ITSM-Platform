#!/bin/bash

set -e

# Voice Agent Kubernetes Cleanup Script
# This script removes all deployed resources

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="voice-agent"

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

confirm_cleanup() {
    log_warning "This will delete ALL resources in namespace '$NAMESPACE'"
    log_warning "This action is irreversible!"
    echo
    read -p "Are you sure you want to continue? (Type 'yes' to confirm): " -r
    if [[ ! $REPLY =~ ^yes$ ]]; then
        log_info "Cleanup cancelled"
        exit 0
    fi
}

cleanup_resources() {
    log_info "Cleaning up Kubernetes resources..."
    
    # Delete all manifests in reverse order
    manifests=(
        "08-monitoring.yaml"
        "07-ingress.yaml"
        "06-service.yaml"
        "05-deployment.yaml"
        "04-pvc.yaml"
        "03-configmap.yaml"
        "02-secrets.yaml"
        "01-namespace.yaml"
    )
    
    for manifest in "${manifests[@]}"; do
        if [[ -f "$manifest" ]]; then
            log_info "Deleting resources from $manifest..."
            kubectl delete -f "$manifest" --ignore-not-found=true
            log_success "Deleted $manifest"
        else
            log_warning "Manifest $manifest not found, skipping..."
        fi
    done
    
    # Wait for namespace to be deleted
    log_info "Waiting for namespace to be fully deleted..."
    kubectl wait --for=delete namespace/$NAMESPACE --timeout=300s || true
    
    log_success "All resources cleaned up"
}

force_cleanup() {
    log_info "Performing force cleanup..."
    
    # Delete namespace forcefully
    kubectl delete namespace $NAMESPACE --force --grace-period=0 --ignore-not-found=true
    
    # Wait a bit for cleanup
    sleep 5
    
    # Check if namespace still exists
    if kubectl get namespace $NAMESPACE --no-headers &> /dev/null; then
        log_warning "Namespace still exists, performing additional cleanup..."
        
        # Delete all remaining resources in namespace
        kubectl delete all --all -n $NAMESPACE --force --grace-period=0 --ignore-not-found=true
        kubectl delete pvc --all -n $NAMESPACE --force --grace-period=0 --ignore-not-found=true
        kubectl delete secrets --all -n $NAMESPACE --force --grace-period=0 --ignore-not-found=true
        kubectl delete configmaps --all -n $NAMESPACE --force --grace-period=0 --ignore-not-found=true
        
        # Final namespace deletion
        kubectl delete namespace $NAMESPACE --force --grace-period=0 --ignore-not-found=true
    fi
    
    log_success "Force cleanup completed"
}

show_remaining_resources() {
    log_info "Checking for remaining resources..."
    
    # Check if namespace still exists
    if kubectl get namespace $NAMESPACE --no-headers &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' still exists"
        echo
        log_info "Remaining resources:"
        kubectl get all -n $NAMESPACE 2>/dev/null || true
        kubectl get pvc -n $NAMESPACE 2>/dev/null || true
        kubectl get secrets -n $NAMESPACE 2>/dev/null || true
        kubectl get configmaps -n $NAMESPACE 2>/dev/null || true
    else
        log_success "No resources found in namespace '$NAMESPACE'"
    fi
}

# Main execution
main() {
    log_info "Starting Voice Agent Kubernetes cleanup..."
    
    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if namespace exists
    if ! kubectl get namespace $NAMESPACE --no-headers &> /dev/null; then
        log_warning "Namespace '$NAMESPACE' does not exist"
        exit 0
    fi
    
    # Parse command line arguments
    FORCE=false
    while [[ $# -gt 0 ]]; do
        case $1 in
            --force)
                FORCE=true
                shift
                ;;
            --namespace)
                NAMESPACE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --force           Force delete resources without confirmation"
                echo "  --namespace TEXT  Namespace to clean up (default: voice-agent)"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Show current resources before cleanup
    log_info "Current resources in namespace '$NAMESPACE':"
    kubectl get all -n $NAMESPACE 2>/dev/null || true
    echo
    
    if [[ "$FORCE" == "true" ]]; then
        force_cleanup
    else
        confirm_cleanup
        cleanup_resources
    fi
    
    # Show remaining resources
    show_remaining_resources
    
    log_success "Cleanup script completed!"
}

# Run main function with all arguments
main "$@"
