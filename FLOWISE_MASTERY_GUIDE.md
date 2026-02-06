# Flowise AI Mastery Guide - Complete Curriculum

**Goal**: Master Flowise from beginner to advanced level and build production-ready AI workflows for incident management, RAG systems, and intelligent automation.

**Focus Area**: LinkedEye ITSM Platform - Incident Management Automation

---

## Table of Contents

1. [Introduction to Flowise](#1-introduction-to-flowise)
2. [How to Install Flowise Locally](#2-how-to-install-flowise-locally)
3. [Flowise UI Walkthrough](#3-flowise-ui-walkthrough)
4. [Self-Hosting Flowise AI](#4-self-hosting-flowise-ai)
5. [Building My First Chatflow](#5-building-my-first-chatflow)
6. [File Loader in Flowise](#6-file-loader-in-flowise)
7. [Text Splitter in Flowise](#7-text-splitter-in-flowise)
8. [Embeddings in Flowise](#8-embeddings-in-flowise)
9. [Vector Stores in Flowise](#9-vector-stores-in-flowise)
10. [RAG Chatbot using Flowise](#10-rag-chatbot-using-flowise)
11. [Vector Store Ingest in Pinecone](#11-vector-store-ingest-in-pinecone)
12. [Document Stores in Flowise](#12-document-stores-in-flowise)
13. [Prompt Chaining in Flowise](#13-prompt-chaining-in-flowise)
14. [Output Parser in Flowise](#14-output-parser-in-flowise)
15. [Tools, Marketplace, Credentials](#15-tools-marketplace-credentials)
16. [Analyze Chatflow with LangSmith](#16-analyze-chatflow-with-langsmith)
17. [Important Flowise Features](#17-important-flowise-features)
18. [Building a Personal AI Assistant](#18-building-a-personal-ai-assistant)
19. [Analyzing Personal Assistant with LangSmith](#19-analyzing-personal-assistant-with-langsmith)
20. [Redis Memory in Flowise](#20-redis-memory-in-flowise)
21. [Chatflow Overview & Optimization](#21-chatflow-overview-optimization)

---

## 1. Introduction to Flowise

### What is Flowise?

Flowise is an open-source, low-code/no-code UI-based tool for building LangChain-powered AI applications. It allows you to create production-ready AI workflows through a visual drag-and-drop interface.

**Key Features**:
- Visual flow builder for LLM applications
- Built on LangChain and LangGraph
- Support for multiple LLM providers (OpenAI, Anthropic, Ollama, etc.)
- RAG (Retrieval Augmented Generation) capabilities
- Vector database integrations
- Prompt engineering tools
- Agent and tool calling support
- API endpoints for each chatflow
- Self-hostable and scalable

### Why Flowise for ITSM Incident Management?

**Use Cases**:
1. **Incident Triage Bot**: Auto-classify and prioritize incidents
2. **Knowledge Base RAG**: Answer support questions from documentation
3. **Runbook Automation**: Guide engineers through resolution steps
4. **Alert Analysis**: Correlate multiple alerts into single incidents
5. **Postmortem Generator**: Auto-generate incident reports
6. **On-Call Assistant**: Help on-call engineers diagnose issues

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Flowise Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │  Chatflows   │   │   API Keys   │   │  Vector DBs  │   │
│  │  (Workflows) │   │ (Credentials)│   │  (Storage)   │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    LangChain Core                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   LLMs   │  │ Vector   │  │  Tools   │  │ Memories │  │
│  │ Providers│  │  Stores  │  │ Functions│  │ Sessions │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. How to Install Flowise Locally

### Prerequisites

- Node.js v18+ (LTS recommended)
- npm v9+ or yarn
- 2GB+ RAM
- PostgreSQL or MySQL (optional, for production)

### Installation Methods

#### Method 1: NPM Installation (Quickest)

```bash
# Install globally
npm install -g flowise

# Start Flowise
npx flowise start

# Access UI at http://localhost:3000
```

#### Method 2: Docker Compose (Recommended for Production)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  flowise:
    image: flowiseai/flowise:latest
    container_name: flowise
    restart: always
    environment:
      - PORT=3000
      - FLOWISE_USERNAME=admin
      - FLOWISE_PASSWORD=admin123
      - DATABASE_TYPE=postgres
      - DATABASE_PORT=5432
      - DATABASE_HOST=postgres
      - DATABASE_NAME=flowise
      - DATABASE_USER=flowise_user
      - DATABASE_PASSWORD=flowise_pass
      - APIKEY_PATH=/root/.flowise
      - SECRETKEY_PATH=/root/.flowise
      - LOG_LEVEL=info
      - LOG_PATH=/root/.flowise/logs
      # Ollama integration
      - OLLAMA_BASE_URL=http://host.docker.internal:11434
      # LinkedEye ITSM integration
      - LINKEDEYE_API_URL=http://linkedeye-backend.incident-linkedeye-itsm.svc.cluster.local:8000
    ports:
      - "3000:3000"
    volumes:
      - flowise_data:/root/.flowise
    depends_on:
      - postgres
    networks:
      - flowise-network

  postgres:
    image: postgres:15-alpine
    container_name: flowise-postgres
    restart: always
    environment:
      - POSTGRES_DB=flowise
      - POSTGRES_USER=flowise_user
      - POSTGRES_PASSWORD=flowise_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - flowise-network

  # Optional: Redis for session memory
  redis:
    image: redis:7-alpine
    container_name: flowise-redis
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - flowise-network

volumes:
  flowise_data:
  postgres_data:
  redis_data:

networks:
  flowise-network:
    driver: bridge
```

**Start Flowise**:
```bash
docker-compose up -d
```

#### Method 3: From Source (For Development)

```bash
# Clone repository
git clone https://github.com/FlowiseAI/Flowise.git
cd Flowise

# Install dependencies
npm install

# Build
npm run build

# Start development server
npm run dev

# Production build
npm run start
```

### Environment Configuration

Create `.env` file:

```bash
# Server
PORT=3000
HOST=0.0.0.0

# Database (Production - PostgreSQL)
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=flowise
DATABASE_USER=flowise_user
DATABASE_PASSWORD=your_secure_password

# Authentication
FLOWISE_USERNAME=admin
FLOWISE_PASSWORD=Change_Me_In_Production_123!

# API Keys Storage
APIKEY_PATH=./secrets
SECRETKEY_PATH=./secrets

# Logging
LOG_LEVEL=info
LOG_PATH=./logs

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Ollama (Local LLM)
OLLAMA_BASE_URL=http://localhost:11434

# LinkedEye ITSM Integration
LINKEDEYE_API_URL=http://localhost:8000
LINKEDEYE_API_KEY=your_linkedeye_api_key

# Vector Databases
PINECONE_API_KEY=your_pinecone_key
PINECONE_ENVIRONMENT=us-east-1-aws

# Redis (For session memory)
REDIS_URL=redis://localhost:6379
```

### Verify Installation

```bash
# Check Flowise is running
curl http://localhost:3000/api/v1/stats

# Expected response:
{
  "status": "ok",
  "version": "1.x.x",
  "totalChatflows": 0,
  "totalTools": 150+
}
```

---

## 3. Flowise UI Walkthrough

### Main Interface Components

```
┌────────────────────────────────────────────────────────────┐
│  [Flowise Logo]  Chatflows | Tools | Credentials | Docs   │  Header
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  + Create New Chatflow                                │ │  Chatflows List
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  📊 Incident Triage Bot          [Edit] [API] [Del]  │ │
│  │  Last modified: 2 hours ago                          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  🔍 Knowledge Base RAG           [Edit] [API] [Del]  │ │
│  │  Last modified: 1 day ago                            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Chatflow Canvas (Visual Builder)

```
┌────────────────────────────────────────────────────────────────┐
│  Incident Triage Bot                          [Save] [Test]   │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────┐ │
│  │  Document   │────────►│  Embeddings │────────►│ Pinecone│ │
│  │  Loader     │         │  OpenAI     │         │  Store  │ │
│  └─────────────┘         └─────────────┘         └─────────┘ │
│                                                        │        │
│                                                        ▼        │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────┐ │
│  │  Chat Model │◄────────│  Retrieval  │◄────────│         │ │
│  │  GPT-4      │         │  QA Chain   │                     │
│  └─────────────┘         └─────────────┘                     │
│       │                                                        │
│       ▼                                                        │
│  ┌─────────────┐                                              │
│  │  Output     │                                              │
│  └─────────────┘                                              │
│                                                                 │
│  [Nodes Panel] ────────────────────────────────────────────── │
│  • Chat Models                                                 │
│  • Chains                                                      │
│  • Agents                                                      │
│  • Tools                                                       │
│  • Memory                                                      │
│  • Document Loaders                                            │
│  • Text Splitters                                              │
│  • Vector Stores                                               │
└────────────────────────────────────────────────────────────────┘
```

### Key UI Elements

1. **Nodes Panel (Left Sidebar)**:
   - Categories of components (LLMs, Vector Stores, Tools, etc.)
   - Search functionality
   - Drag-and-drop to canvas

2. **Canvas (Center)**:
   - Visual workflow builder
   - Connect nodes with lines/edges
   - Zoom, pan, auto-layout

3. **Node Configuration (Right Sidebar)**:
   - Opens when clicking a node
   - Configure parameters
   - Test individual nodes

4. **Top Toolbar**:
   - Save chatflow
   - Test chatflow (opens chat interface)
   - View API endpoint
   - Share/Export
   - Settings

### Testing Interface

Click "Test Chatflow" to open embedded chat:

```
┌──────────────────────────────────────────────┐
│  Test Chatflow: Incident Triage Bot         │
├──────────────────────────────────────────────┤
│                                               │
│  Bot: Hello! I can help analyze incidents.   │
│       What can I help you with?              │
│                                               │
│  You: We're seeing high CPU on prod server   │
│                                               │
│  Bot: I found relevant documentation about   │
│       high CPU issues. Based on your alert,  │
│       this is a P2 incident. Here are the    │
│       recommended steps...                   │
│                                               │
│  [Type your message...]            [Send]    │
│                                               │
└──────────────────────────────────────────────┘
```

### API Endpoint Access

Each chatflow gets a unique API endpoint:

```bash
# Get chatflow API details
GET http://localhost:3000/api/v1/chatflows/{chatflow-id}

# Execute chatflow
POST http://localhost:3000/api/v1/prediction/{chatflow-id}
Content-Type: application/json

{
  "question": "How do I troubleshoot high CPU?",
  "overrideConfig": {
    "sessionId": "user-123"
  }
}
```

---

## 4. Self-Hosting Flowise AI

### Production Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (NGINX)                  │
│                    https://flowise.company.com              │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   ┌────▼────┐           ┌────▼────┐
   │ Flowise │           │ Flowise │  (Multiple replicas)
   │  Pod 1  │           │  Pod 2  │
   └────┬────┘           └────┬────┘
        │                     │
        └──────────┬──────────┘
                   │
        ┌──────────▼──────────┐
        │  PostgreSQL Cluster │  (Primary + Replicas)
        │  (Persistent Data)  │
        └─────────────────────┘
                   │
        ┌──────────▼──────────┐
        │   Redis Cluster     │  (Session Memory)
        │   (Cache Layer)     │
        └─────────────────────┘
```

### Kubernetes Deployment

Create `k8s/flowise-deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: flowise

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: flowise-config
  namespace: flowise
data:
  PORT: "3000"
  DATABASE_TYPE: "postgres"
  DATABASE_HOST: "postgresql-svc.fs-linkedeye.svc.cluster.local"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "flowise"
  LOG_LEVEL: "info"
  OLLAMA_BASE_URL: "http://host.docker.internal:11434"
  LINKEDEYE_API_URL: "http://linkedeye-backend.incident-linkedeye-itsm.svc.cluster.local:8000"

---
apiVersion: v1
kind: Secret
metadata:
  name: flowise-secrets
  namespace: flowise
type: Opaque
stringData:
  FLOWISE_USERNAME: "admin"
  FLOWISE_PASSWORD: "Change_Me_In_Production_123!"
  DATABASE_USER: "flowise_user"
  DATABASE_PASSWORD: "your_secure_db_password"
  OPENAI_API_KEY: "sk-..."
  ANTHROPIC_API_KEY: "sk-ant-..."
  LINKEDEYE_API_KEY: "your_api_key"

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flowise
  namespace: flowise
spec:
  replicas: 2
  selector:
    matchLabels:
      app: flowise
  template:
    metadata:
      labels:
        app: flowise
    spec:
      containers:
      - name: flowise
        image: flowiseai/flowise:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: flowise-config
        - secretRef:
            name: flowise-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/v1/stats
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/stats
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
        volumeMounts:
        - name: flowise-data
          mountPath: /root/.flowise
      volumes:
      - name: flowise-data
        persistentVolumeClaim:
          claimName: flowise-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: flowise-svc
  namespace: flowise
spec:
  selector:
    app: flowise
  ports:
  - port: 3000
    targetPort: 3000
  type: ClusterIP

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flowise-ingress
  namespace: flowise
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - flowise.finspot.in
    secretName: flowise-tls
  rules:
  - host: flowise.finspot.in
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: flowise-svc
            port:
              number: 3000

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: flowise-pvc
  namespace: flowise
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

**Deploy**:
```bash
kubectl apply -f k8s/flowise-deployment.yaml
kubectl get pods -n flowise
kubectl logs -n flowise -l app=flowise -f
```

### Security Best Practices

1. **Authentication**:
   - Set strong `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`
   - Use environment variables, never hardcode
   - Rotate credentials regularly

2. **API Keys**:
   - Store in Kubernetes secrets
   - Use separate keys for dev/staging/prod
   - Implement API key rotation

3. **Network Security**:
   - Use TLS/SSL for HTTPS (cert-manager + Let's Encrypt)
   - Restrict ingress to specific IPs if possible
   - Use network policies to isolate Flowise

4. **Database Security**:
   - Use encrypted connections (SSL)
   - Restrict database access to Flowise pods only
   - Regular backups with encryption

---

## 5. Building My First Chatflow

### Tutorial: Incident Classification Chatbot

**Goal**: Build a chatbot that classifies incoming incidents by severity and category.

**Step-by-Step**:

#### Step 1: Create New Chatflow

1. Click "Create New Chatflow"
2. Name: "Incident Classifier"
3. Description: "Classifies incidents by severity and category"

#### Step 2: Add Chat Model

1. Drag "Chat OpenAI" (or "ChatOllama" for local) from left panel
2. Configure:
   - Model: `gpt-4o` (or `llama3.1` for Ollama)
   - Temperature: `0.3` (lower = more deterministic)
   - Max Tokens: `500`

#### Step 3: Add System Prompt

1. Drag "Prompt Template" node
2. Connect to Chat Model
3. Configure template:

```
You are an expert ITSM incident classifier for LinkedEye platform.

Analyze incident reports and classify them:

SEVERITY:
- P1 (Critical): Complete system outage, data loss, security breach
- P2 (High): Major functionality broken, significant performance degradation
- P3 (Medium): Partial functionality issues, workarounds available
- P4 (Low): Minor issues, cosmetic problems, feature requests

CATEGORY:
- Infrastructure: Servers, networks, storage
- Application: Software bugs, crashes, errors
- Security: Vulnerabilities, access issues, breaches
- Performance: Slowness, timeouts, resource exhaustion
- Data: Database issues, data integrity, backups

Respond in JSON format:
{
  "severity": "P1|P2|P3|P4",
  "category": "Infrastructure|Application|Security|Performance|Data",
  "reasoning": "Brief explanation",
  "suggested_actions": ["Action 1", "Action 2"]
}

Incident Report:
{incident_description}
```

#### Step 4: Add Conversation Memory

1. Drag "Buffer Memory" node
2. Connect to Chat Model
3. Configure:
   - Session ID: `{sessionId}` (from API request)
   - Memory Key: `chat_history`

#### Step 5: Add Output Parser

1. Drag "JSON Output Parser" node
2. Connect from Chat Model output
3. This will parse the JSON response

#### Step 6: Test the Chatflow

Click "Test Chatflow" and try:

**Input**:
```
Production database is completely down. All users are getting
"Connection refused" errors. This started 5 minutes ago after
a routine maintenance window.
```

**Expected Output**:
```json
{
  "severity": "P1",
  "category": "Infrastructure",
  "reasoning": "Complete database outage affecting all users is a critical incident requiring immediate response.",
  "suggested_actions": [
    "Check database service status",
    "Review maintenance logs",
    "Initiate failover to standby database",
    "Page on-call DBA immediately"
  ]
}
```

#### Step 7: Save and Get API Endpoint

1. Click "Save" (top right)
2. Click "API" to see endpoint:

```bash
curl -X POST http://localhost:3000/api/v1/prediction/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Production database is down...",
    "overrideConfig": {
      "sessionId": "incident-session-001"
    }
  }'
```

---

## 6. File Loader in Flowise

### Document Loaders Overview

Flowise supports 20+ document loaders:

| Loader Type | Use Case | Formats |
|-------------|----------|---------|
| **File Upload** | Upload docs via UI | PDF, TXT, DOCX, CSV, JSON |
| **Folder** | Bulk load from directory | All formats |
| **Git** | Load from Git repos | Code, markdown, docs |
| **Confluence** | Load from Confluence | Confluence pages |
| **Notion** | Load from Notion | Notion pages/databases |
| **Google Drive** | Load from GDrive | Docs, Sheets, PDFs |
| **S3** | Load from AWS S3 | All formats |
| **API** | Fetch from APIs | JSON, XML |
| **Web Scraper** | Scrape websites | HTML |
| **Sitemap** | Load from sitemap.xml | HTML pages |

### Tutorial: Load Incident Runbooks

**Scenario**: Load incident resolution runbooks from a folder.

#### Step 1: Prepare Documents

Create folder `runbooks/`:
```
runbooks/
├── high-cpu-troubleshooting.md
├── database-recovery.md
├── network-outage-response.md
├── security-incident-playbook.md
└── application-crash-debug.md
```

#### Step 2: Add Folder Loader Node

1. Drag "Folder" document loader
2. Configure:
   - Folder Path: `/path/to/runbooks`
   - File Types: `md,txt,pdf`
   - Recursive: `true`

#### Step 3: Configure File Metadata

Add metadata extraction:
```javascript
// Metadata function (optional)
{
  "metadata": {
    "source": "{filename}",
    "type": "runbook",
    "last_updated": "{file_modified_date}"
  }
}
```

#### Step 4: Connect to Text Splitter

(Covered in next section)

### Alternative: API Document Loader

Load incidents from LinkedEye API:

1. Add "API Loader" node
2. Configure:
   - URL: `http://linkedeye-backend:8000/api/v1/incidents`
   - Headers: `{"Authorization": "Bearer TOKEN"}`
   - Method: `GET`
   - JSON Path: `$.items[*].description`

This dynamically loads resolved incidents for RAG context.

---

## 7. Text Splitter in Flowise

### Why Text Splitting?

Large documents exceed LLM context windows. Text splitters break documents into chunks while preserving semantic meaning.

### Text Splitter Types

| Splitter | Best For | How It Works |
|----------|----------|--------------|
| **Recursive Character** | General purpose | Splits by `\n\n`, then `\n`, then sentences |
| **Character** | Fixed-size chunks | Simple character count splitting |
| **Token** | LLM token limits | Splits based on tokenizer (tiktoken) |
| **Markdown** | Markdown docs | Preserves headers and structure |
| **Code** | Source code | Language-aware splitting (Python, JS, etc.) |
| **Semantic** | High quality RAG | Splits based on semantic similarity |

### Tutorial: Split Runbook Documents

#### Configuration

1. Drag "Recursive Character Text Splitter"
2. Connect from Document Loader
3. Configure:
   - **Chunk Size**: `1000` (characters)
   - **Chunk Overlap**: `200` (preserve context between chunks)
   - **Separator**: `\n\n` (paragraph boundaries)

**Visual Flow**:
```
[Folder Loader] → [Text Splitter] → [Embeddings] → [Vector Store]
  (Runbooks)       (1000 chars)      (OpenAI)        (Pinecone)
```

### Advanced: Semantic Splitter

For higher quality RAG:

1. Use "Semantic Splitter" node
2. Configure:
   - Embeddings: OpenAI `text-embedding-3-small`
   - Breakpoint Type: `percentile`
   - Breakpoint Threshold: `95`

This splits documents at natural semantic boundaries instead of arbitrary character counts.

### Code Splitter Example

For loading incident resolution scripts:

```javascript
// Python script for database recovery
"""
This script performs database backup and recovery.

Usage:
    python db_recovery.py --mode backup
    python db_recovery.py --mode restore --backup-id 123

Requirements:
    - PostgreSQL 15+
    - psql client
"""

import subprocess
import argparse

def backup_database():
    # Backup logic here
    pass

def restore_database(backup_id):
    # Restore logic here
    pass
```

**Code Splitter** would split by functions, preserving complete code blocks.

---

## 8. Embeddings in Flowise

### What are Embeddings?

Embeddings convert text into numerical vectors (arrays of numbers) that capture semantic meaning. Similar texts have similar vectors.

**Example**:
```
"Database is down" → [0.1, 0.8, 0.3, ..., 0.5]  (1536 dimensions)
"DB outage"        → [0.1, 0.7, 0.4, ..., 0.6]  (very similar!)
"Weather is nice"  → [0.9, 0.2, 0.1, ..., 0.3]  (completely different)
```

### Embedding Providers

| Provider | Model | Dimensions | Cost | Speed |
|----------|-------|------------|------|-------|
| **OpenAI** | text-embedding-3-small | 1536 | $0.02/1M tokens | Fast |
| **OpenAI** | text-embedding-3-large | 3072 | $0.13/1M tokens | Slower |
| **Cohere** | embed-english-v3.0 | 1024 | $0.10/1M tokens | Fast |
| **Ollama** | nomic-embed-text | 768 | Free (local) | Medium |
| **HuggingFace** | sentence-transformers | 384-1024 | Free (local) | Slow |

### Tutorial: Configure Embeddings

#### Option 1: OpenAI Embeddings (Cloud)

1. Drag "OpenAI Embeddings" node
2. Configure:
   - API Key: `{OPENAI_API_KEY}` (from credentials)
   - Model: `text-embedding-3-small`
   - Batch Size: `512` (for performance)

#### Option 2: Ollama Embeddings (Local)

1. Pull embedding model locally:
```bash
ollama pull nomic-embed-text
```

2. Add "Ollama Embeddings" node
3. Configure:
   - Base URL: `http://localhost:11434`
   - Model: `nomic-embed-text`

**Recommendation**: Use Ollama for development, OpenAI for production (better quality).

### Embeddings Flow

```
[Document Loader] → [Text Splitter] → [Embeddings] → [Vector Store]
                                          │
                                          ▼
                                    Convert text
                                    to vectors
                                    [0.1, 0.8, ...]
```

---

## 9. Vector Stores in Flowise

### What is a Vector Store?

A database optimized for storing and searching embeddings using similarity search (cosine similarity, dot product).

### Supported Vector Stores

| Vector Store | Type | Best For | Complexity |
|--------------|------|----------|------------|
| **Pinecone** | Cloud | Production, scalable | Low |
| **Qdrant** | Self-hosted | Production, privacy | Medium |
| **Chroma** | Local | Development, testing | Low |
| **Weaviate** | Self-hosted | Advanced features | High |
| **Milvus** | Self-hosted | Large scale | High |
| **PostgreSQL (pgvector)** | SQL extension | Existing Postgres infra | Low |
| **Redis** | Cache + vector | High-speed retrieval | Medium |

### Tutorial: Qdrant Vector Store (Self-Hosted)

**Why Qdrant?** Open-source, fast, self-hostable, production-ready.

#### Step 1: Start Qdrant

```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage:z \
  qdrant/qdrant
```

#### Step 2: Add Qdrant Node in Flowise

1. Drag "Qdrant" node
2. Configure:
   - URL: `http://localhost:6333`
   - Collection Name: `incident_runbooks`
   - Vector Dimension: `1536` (matches OpenAI embeddings)

#### Step 3: Connect Flow

```
[Folder Loader]  →  [Text Splitter]  →  [Embeddings]  →  [Qdrant]
 (Runbooks)          (1000 chars)        (OpenAI)          (Store)
```

#### Step 4: Upsert Documents

Click "Upsert" button on Qdrant node to index all documents.

**What happens**:
1. Documents loaded from folder
2. Split into chunks
3. Each chunk embedded (text → vector)
4. Vectors stored in Qdrant with metadata

### Verify in Qdrant UI

Visit `http://localhost:6333/dashboard` to see:
- Collection: `incident_runbooks`
- Vectors: 150 chunks
- Dimension: 1536

---

## 10. RAG Chatbot using Flowise

### What is RAG?

**Retrieval Augmented Generation**: Combine external knowledge (documents) with LLM to answer questions with accurate, up-to-date information.

**RAG Flow**:
```
User Question
     │
     ▼
[Embed Question] → [Search Vector Store] → [Retrieve Top K Docs]
     │                                              │
     │                                              ▼
     └─────────────►[Combine Question + Context]───►[LLM]───►Answer
```

### Tutorial: Incident Troubleshooting RAG Bot

**Goal**: Answer "How do I troubleshoot X?" using runbook knowledge base.

#### Step 1: Create Retrieval Chain

1. Add "Conversational Retrieval QA Chain" node
2. This is the core RAG component

#### Step 2: Connect Components

```
[Qdrant Vector Store] ──► [Conversational Retrieval QA Chain] ◄── [ChatGPT]
                                        │
                                        ▼
                                   [Output]
```

#### Step 3: Configure Chain

**Conversational Retrieval QA Chain settings**:
- **Vector Store**: Qdrant (incident_runbooks)
- **Chat Model**: ChatGPT-4
- **Return Source Documents**: `true` (show which runbooks used)
- **System Message**:
```
You are a helpful incident response assistant for LinkedEye ITSM.
Use the provided runbook documentation to answer questions.

If the answer is not in the documentation, say so honestly.
Always cite the source runbook you're referencing.
```

#### Step 4: Advanced Settings

- **Top K**: `5` (retrieve 5 most relevant chunks)
- **Score Threshold**: `0.7` (minimum similarity score)
- **Chain Type**: `stuff` (combine all docs into single prompt)

#### Step 5: Test RAG Bot

**Question 1**:
```
How do I troubleshoot high CPU on a production server?
```

**Answer**:
```
Based on the high-cpu-troubleshooting.md runbook:

1. Identify the process consuming CPU:
   top -o %CPU

2. Check if it's a legitimate process or runaway:
   ps aux | grep <process>

3. If it's a legitimate service under load:
   - Check application logs for errors
   - Review monitoring dashboard for traffic spikes
   - Consider horizontal scaling

4. If it's a runaway process:
   - Gracefully restart: systemctl restart <service>
   - If unresponsive: kill -9 <PID>

5. Root cause analysis:
   - Review recent deployments
   - Check for memory leaks
   - Analyze slow queries if database-related

Source: high-cpu-troubleshooting.md (Section 3: Production Response)
```

**Question 2**:
```
What should I do if the database won't start?
```

**Answer**:
```
Based on database-recovery.md:

Database startup failures can have several causes:

1. Check disk space: df -h /var/lib/postgresql
2. Review database logs: tail -f /var/log/postgresql/postgresql.log
3. Verify configuration: pg_config --check
4. Check for corrupted data files
5. Attempt recovery mode start

If corruption detected:
- Restore from most recent backup
- Apply transaction logs for point-in-time recovery

Follow the detailed steps in database-recovery.md Section 2.

Source: database-recovery.md
```

---

(Character limit reached - continuing in next section...)

