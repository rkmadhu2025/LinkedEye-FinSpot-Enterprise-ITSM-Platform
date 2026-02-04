#!/bin/bash
# =============================================================================
# Script to create GitLab Container Registry Secret
# Run this BEFORE applying 01-secrets.yaml
# =============================================================================

# Configuration - UPDATE THESE VALUES
GITLAB_USERNAME="rajkumarmadhu2024"
GITLAB_TOKEN="glpat-TKLNN-Xxbb8yvVO2WdW-F286MQp1Omo3bWx2Cw.01.120q4zo0r"  # Replace with your token
NAMESPACE="voice-agent"
SECRET_NAME="gitlab-registry-secret"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Creating GitLab Container Registry Secret${NC}"
echo "Namespace: $NAMESPACE"
echo "Secret Name: $SECRET_NAME"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    echo -e "${RED}Error: Namespace '$NAMESPACE' does not exist.${NC}"
    echo "Please create the namespace first: kubectl apply -f 00-namespace.yaml"
    exit 1
fi

# Delete existing secret if it exists
if kubectl get secret "$SECRET_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo -e "${YELLOW}Deleting existing secret...${NC}"
    kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE"
fi

# Create the docker-registry secret
kubectl create secret docker-registry "$SECRET_NAME" \
    --namespace="$NAMESPACE" \
    --docker-server=registry.gitlab.com \
    --docker-username="$GITLAB_USERNAME" \
    --docker-password="$GITLAB_TOKEN" \
    --docker-email="$GITLAB_USERNAME@users.noreply.gitlab.com"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Secret created successfully!${NC}"
    kubectl get secret "$SECRET_NAME" -n "$NAMESPACE"
else
    echo -e "${RED}Failed to create secret${NC}"
    exit 1
fi
