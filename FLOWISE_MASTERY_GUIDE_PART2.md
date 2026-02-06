# Flowise AI Mastery Guide - Part 2 (Topics 11-21)

Continuation of comprehensive Flowise curriculum for LinkedEye ITSM Platform.

---

## 11. Vector Store Ingest in Pinecone

### Why Pinecone?

Pinecone is a fully managed vector database - no infrastructure to maintain, automatic scaling, high performance.

**Advantages**:
- Managed service (no DevOps needed)
- Sub-50ms latency at scale
- Automatic backups
- Built-in monitoring
- Metadata filtering

### Setup Pinecone Account

1. Sign up at https://pinecone.io
2. Create API key
3. Create index:
   - Name: `linkedeye-incidents`
   - Dimensions: `1536` (OpenAI embeddings)
   - Metric: `cosine`
   - Pod Type: `s1.x1` (Starter)

### Tutorial: Ingest Incident History

**Goal**: Index past resolved incidents for similarity search.

#### Step 1: Configure Pinecone in Flowise

1. Go to **Credentials** tab
2. Add "Pinecone API":
   - API Key: `your-pinecone-api-key`
   - Environment: `us-east-1-aws` (or your region)
   - Index Name: `linkedeye-incidents`

#### Step 2: Create Ingestion Chatflow

```
[API Loader] → [Text Splitter] → [OpenAI Embeddings] → [Pinecone Upsert]
  (LinkedEye      (500 chars)        (3-small)            (Ingest)
   Incidents)
```

**API Loader Config**:
```json
{
  "url": "http://linkedeye-backend:8000/api/v1/incidents?status=resolved&limit=1000",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "textProperty": "$.items[*].{id: id, title: title, description: description, resolution: resolution_notes, created: created_at}"
}
```

**Pinecone Metadata**:
```json
{
  "incident_id": "{id}",
  "title": "{title}",
  "created_at": "{created}",
  "source": "linkedeye_api",
  "type": "resolved_incident"
}
```

#### Step 3: Run Ingestion

Click "Upsert" on Pinecone node:
- Processes 1000 incidents
- Creates ~5000 vectors (chunked)
- Stored in Pinecone with metadata

#### Step 4: Verify in Pinecone Console

```bash
# Using Pinecone API
curl -X GET "https://linkedeye-incidents-abc123.svc.us-east-1-aws.pinecone.io/describe_index_stats" \
  -H "Api-Key: YOUR_API_KEY"

# Response:
{
  "dimension": 1536,
  "index_fullness": 0.05,
  "namespaces": {
    "": {
      "vector_count": 5000
    }
  }
}
```

### Incremental Updates

Schedule daily ingestion of new resolved incidents:

1. Create n8n workflow
2. Trigger: Every day at 2 AM
3. Action: Call Flowise chatflow API
4. Upsert only new incidents (filter by `created_at > last_run_date`)

---

## 12. Document Stores in Flowise

### What are Document Stores?

Document stores cache original documents alongside vectors for displaying source content.

**Without Document Store**:
```
Query → Retrieve Vector → Show only vector metadata
```

**With Document Store**:
```
Query → Retrieve Vector → Fetch full document → Show complete source
```

### Supported Document Stores

| Store | Use Case | Persistence |
|-------|----------|-------------|
| **In-Memory** | Development/testing | Lost on restart |
| **Redis** | Session-based caching | Temporary (configurable TTL) |
| **MongoDB** | Production document storage | Permanent |
| **PostgreSQL** | With existing Postgres | Permanent |

### Tutorial: Redis Document Store

**Why Redis?** Fast, distributed, perfect for caching recent incidents.

#### Step 1: Configure Redis

```yaml
# docker-compose.yml addition
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
```

#### Step 2: Add Redis Document Store in Flowise

1. Add "Redis Document Store" node
2. Configure:
   - Host: `localhost`
   - Port: `6379`
   - TTL: `86400` (24 hours)
   - Namespace: `incident_docs`

#### Step 3: Connect to Retrieval Chain

```
[Pinecone] ─────┬──► [Conversational Retrieval Chain]
                │
[Redis Store] ──┘
```

**Benefits**:
- Faster document retrieval (cached in Redis)
- Reduced Pinecone API calls
- Full document content in responses
- Automatic cache expiration

#### Step 4: Test with Source Documents

**Query**: "Show me incidents related to database outages last month"

**Response includes**:
```json
{
  "answer": "I found 3 database-related incidents last month...",
  "sourceDocuments": [
    {
      "pageContent": "Full incident description and resolution...",
      "metadata": {
        "incident_id": "INC-001234",
        "title": "PostgreSQL Primary Failover",
        "created_at": "2025-01-15T10:30:00Z",
        "source": "redis_cache"
      }
    }
  ]
}
```

---

## 13. Prompt Chaining in Flowise

### What is Prompt Chaining?

Execute multiple LLM calls in sequence, where each output becomes the next input.

**Use Case**: Multi-step incident analysis
1. Classify incident → 2. Find similar incidents → 3. Generate resolution plan

### Tutorial: Incident Analysis Chain

#### Chain Structure

```
User Input: "Database slow, queries timing out"
     │
     ▼
[Step 1: Classification]
     │
     ▼ Output: {severity: "P2", category: "Performance"}
     │
     ▼
[Step 2: Similar Incident Search]
     │
     ▼ Output: [Similar incidents from vector DB]
     │
     ▼
[Step 3: Resolution Plan]
     │
     ▼ Output: Detailed troubleshooting steps
```

#### Implementation

**Node 1: Classification Prompt**
```
Classify this incident:
{user_input}

Respond in JSON:
{
  "severity": "P1|P2|P3|P4",
  "category": "Infrastructure|Application|Security|Performance|Data",
  "keywords": ["keyword1", "keyword2"]
}
```

**Node 2: Search Prompt Template**
```
Search for similar incidents with these parameters:
Category: {category}
Keywords: {keywords}
```

**Node 3: Resolution Prompt**
```
Based on these similar resolved incidents:
{similar_incidents}

Generate a resolution plan for this new incident:
{user_input}

Include:
1. Immediate actions
2. Diagnostic steps
3. Resolution steps
4. Prevention measures
```

#### Connecting the Chain

```
[User Input]
     │
     ▼
[ChatGPT] ──► [JSON Parser] ──► [Extract category/keywords]
     │                                   │
     │                                   ▼
     │                          [Vector Store Search]
     │                                   │
     │                                   ▼
     └──────────────────────────► [ChatGPT] ──► [Final Output]
                                 (with context)
```

### Sequential Chain Node

Flowise has a built-in "Sequential Chain" node:

1. Add "Sequential Chain"
2. Configure chains:
   - Chain 1: Classification
   - Chain 2: Search
   - Chain 3: Resolution
3. Map outputs to next inputs

---

## 14. Output Parser in Flowise

### Why Output Parsers?

LLMs return unstructured text. Output parsers extract structured data for:
- API integrations
- Database writes
- Workflow triggers
- UI rendering

### Parser Types

| Parser | Input Format | Output Type | Use Case |
|--------|--------------|-------------|----------|
| **JSON** | JSON string | Object | Structured data extraction |
| **Structured** | Custom format | Schema-validated | Form data, API calls |
| **List** | Comma/newline separated | Array | Multiple items |
| **Datetime** | Natural language | ISO datetime | Scheduling, timestamps |
| **Custom** | Regex/function | Any | Complex parsing logic |

### Tutorial: Incident Report Parser

#### JSON Output Parser

**LLM Output**:
```json
{
  "incident_id": "INC-002345",
  "severity": "P1",
  "affected_services": ["API Gateway", "Auth Service"],
  "impact_estimate": "5000 users",
  "sla_breach": true,
  "recommended_actions": [
    "Failover to backup datacenter",
    "Page on-call SRE team",
    "Start customer communication"
  ]
}
```

**Parser Config**:
1. Add "JSON Output Parser"
2. Schema definition:
```json
{
  "type": "object",
  "properties": {
    "incident_id": {"type": "string"},
    "severity": {"type": "string", "enum": ["P1", "P2", "P3", "P4"]},
    "affected_services": {"type": "array", "items": {"type": "string"}},
    "impact_estimate": {"type": "string"},
    "sla_breach": {"type": "boolean"},
    "recommended_actions": {"type": "array", "items": {"type": "string"}}
  },
  "required": ["incident_id", "severity"]
}
```

**Parser validates and extracts** → Clean JSON object

#### Structured Output Parser

For more complex validation:

**Schema with Zod**:
```javascript
const incidentSchema = z.object({
  severity: z.enum(["P1", "P2", "P3", "P4"]),
  category: z.string(),
  title: z.string().min(10).max(255),
  description: z.string().min(50),
  assignedTo: z.string().uuid().optional(),
  tags: z.array(z.string()).default([])
});
```

**Benefits**:
- Type safety
- Automatic validation
- Default values
- Optional fields

### Integration with LinkedEye API

**Flow**:
```
[User describes incident]
     │
     ▼
[LLM classifies]
     │
     ▼
[JSON Parser]
     │
     ▼
[HTTP Request to LinkedEye API]
  POST /api/v1/incidents
  {parsed_json}
     │
     ▼
[Return incident number]
```

---

## 15. Tools, Marketplace, Credentials

### Tools in Flowise

Tools are functions LLMs can call to perform actions or retrieve information.

**Built-in Tools**:
- **Calculator**: Math operations
- **Search (SerpAPI, Google)**: Web search
- **Weather API**: Weather data
- **Wikipedia**: Encyclopedia lookups
- **Custom API**: HTTP requests to any API

### Tutorial: Create LinkedEye ITSM Tool

#### Step 1: Define Custom Tool

**Tool Name**: `create_linkedeye_incident`

**Description**:
```
Creates a new incident in LinkedEye ITSM platform.

Use this tool when the user wants to create or report an incident.

Input should be a JSON string with:
- title (string, required)
- description (string, required)
- priority (string: P1|P2|P3|P4)
- category (string)
```

**Implementation**:
```javascript
const axios = require('axios');

async function createIncident(input) {
  const { title, description, priority, category } = JSON.parse(input);

  const response = await axios.post(
    'http://linkedeye-backend:8000/api/v1/incidents',
    {
      title,
      description,
      priority: priority || 'P3',
      category: category || 'General',
      impact: 'MEDIUM',
      urgency: 'MEDIUM'
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.LINKEDEYE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return `Incident created successfully: ${response.data.number}`;
}
```

#### Step 2: Add to Flowise

1. Go to **Tools** tab
2. Click "Create Custom Tool"
3. Name: `LinkedEye Incident Creator`
4. Paste implementation code
5. Save

#### Step 3: Use in Agent

```
[ChatGPT with Tools]
   │
   ├─► Calculator Tool
   ├─► Wikipedia Tool
   └─► LinkedEye Incident Creator  ← Our custom tool
```

**Conversation Example**:

**User**: "Create a P1 incident: Production API is down"

**Agent**: "I'll create this incident for you..."
*[Calls create_linkedeye_incident tool]*

**Agent**: "Incident created successfully: INC-003456. The incident has been assigned priority P1 and the on-call team has been notified."

### Marketplace

Flowise Marketplace has 150+ pre-built chatflows:

**Popular Templates**:
- Customer Support Bot
- RAG Document Q&A
- SQL Query Agent
- Code Explanation Bot
- Resume Analyzer
- Meeting Scheduler

**Using Templates**:
1. Click "Marketplace"
2. Browse categories
3. Click "Use Template"
4. Customize for your use case

### Credentials Management

**Supported Credential Types**:
- API Keys (OpenAI, Anthropic, etc.)
- OAuth tokens
- Database connections
- Service account keys

**Best Practices**:
1. Never hardcode credentials
2. Use environment variables for sensitive data
3. Rotate keys quarterly
4. Use separate keys per environment (dev/prod)
5. Enable API key restrictions (IP whitelist, rate limits)

**Adding Credentials**:
1. Go to **Credentials** tab
2. Click "Add Credential"
3. Select type (e.g., "OpenAI API")
4. Enter key
5. Name it descriptively: `openai-prod-key`

---

## 16. Analyze Chatflow with LangSmith

### What is LangSmith?

LangSmith is LangChain's official observability platform for debugging, monitoring, and optimizing LLM applications.

**Features**:
- Request tracing (see every LLM call)
- Token usage tracking
- Latency monitoring
- Error debugging
- A/B testing
- Dataset management for evaluation

### Setup LangSmith

1. Sign up at https://smith.langchain.com
2. Create API key
3. Get Project name

**Configure in Flowise**:
```bash
# Environment variables
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_api_key
LANGCHAIN_PROJECT=linkedeye-flowise
LANGCHAIN_ENDPOINT=https://api.smith.langchain.com
```

### Tutorial: Monitor Incident Bot Performance

#### Step 1: Enable Tracing

Add to Flowise container:
```yaml
environment:
  - LANGCHAIN_TRACING_V2=true
  - LANGCHAIN_API_KEY=${LANGSMITH_API_KEY}
  - LANGCHAIN_PROJECT=incident-classifier
```

Restart Flowise.

#### Step 2: Generate Test Traffic

Execute 100 test queries:
```bash
for i in {1..100}; do
  curl -X POST http://localhost:3000/api/v1/prediction/incident-bot \
    -H "Content-Type: application/json" \
    -d "{\"question\": \"Test incident $i\"}"
  sleep 1
done
```

#### Step 3: Analyze in LangSmith

Visit LangSmith dashboard:

**Traces View**:
```
Request ID: trace-abc123
Duration: 2.3s
Tokens: 450 (input: 200, output: 250)
Cost: $0.008

Span Timeline:
├─ Vector Store Search (320ms)
├─ Document Retrieval (180ms)
└─ LLM Call (1800ms)
    ├─ Prompt tokens: 1200
    ├─ Completion tokens: 250
    └─ Model: gpt-4o
```

**Insights**:
- Average latency: 2.1s
- P95 latency: 3.5s
- Token usage: 18,500 tokens/day = $1.50/day
- Most expensive query: 3000 tokens ($0.05)

#### Step 4: Identify Bottlenecks

**Problem**: Vector search taking 800ms (too slow)

**Solution**:
- Reduce `top_k` from 10 to 5
- Add caching layer (Redis)
- Use smaller embeddings (768d instead of 1536d)

**Result**: Latency reduced to 1.2s

### Monitoring Dashboard

LangSmith provides production monitoring:

```
┌────────────────────────────────────────────┐
│  Incident Bot - Last 24 Hours              │
├────────────────────────────────────────────┤
│  Total Requests: 1,247                     │
│  Success Rate: 98.3%                       │
│  Avg Latency: 2.1s                         │
│  Total Tokens: 325,000                     │
│  Estimated Cost: $7.50                     │
└────────────────────────────────────────────┘

Errors (21):
- 15x: Vector store timeout
- 4x: LLM rate limit
- 2x: Invalid JSON response
```

---

## 17. Important Flowise Features

### 1. Streaming Responses

Enable real-time token streaming for better UX:

**Configuration**:
```javascript
// In Chat Model node
{
  "streaming": true,
  "callbacks": ["streamingCallback"]
}
```

**API Usage**:
```javascript
const response = await fetch('/api/v1/prediction/chatflow-id', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({question: "...", streaming: true})
});

const reader = response.body.getReader();
while (true) {
  const {done, value} = await reader.read();
  if (done) break;
  console.log(new TextDecoder().decode(value));
}
```

### 2. File Upload Support

Allow users to upload files directly in chat:

**Enable in Chatflow**:
1. Add "File Upload" node
2. Supported formats: PDF, DOCX, TXT, CSV, JSON
3. Configure max file size: 10MB

**Use Case**: User uploads incident screenshot for analysis

### 3. Variables & Overrides

Dynamic configuration per request:

```javascript
// Override LLM temperature per request
{
  "question": "Analyze this incident",
  "overrideConfig": {
    "temperature": 0.1,  // More deterministic
    "sessionId": "user-123",
    "returnSourceDocuments": true
  }
}
```

### 4. Webhooks

Trigger chatflows from external events:

**Setup**:
1. Enable webhook in chatflow settings
2. Get webhook URL: `https://flowise/api/v1/webhook/chatflow-id`

**Integration with LinkedEye**:
```python
# In LinkedEye backend
import requests

def analyze_incident_with_ai(incident):
    response = requests.post(
        'http://flowise:3000/api/v1/webhook/incident-analyzer',
        json={
            'incident_id': str(incident.id),
            'title': incident.title,
            'description': incident.description,
            'priority': incident.priority
        }
    )
    return response.json()
```

### 5. Multi-User Session Management

Isolate conversations per user:

```javascript
// Each user gets isolated memory
{
  "question": "What was my last incident?",
  "overrideConfig": {
    "sessionId": `user-${userId}`
  }
}
```

### 6. Rate Limiting

Protect against abuse:

```yaml
# In Flowise config
rateLimit:
  enabled: true
  windowMs: 60000  # 1 minute
  max: 10          # 10 requests per minute per IP
```

### 7. Caching

Cache LLM responses for identical queries:

```javascript
// Redis-based caching
{
  "caching": {
    "enabled": true,
    "ttl": 3600,  // 1 hour
    "keyPrefix": "flowise-cache:"
  }
}
```

**Benefits**:
- Faster responses
- Reduced API costs
- Lower latency

### 8. A/B Testing

Compare two different chatflows:

```javascript
// Route 50% to each variant
const chatflowId = Math.random() < 0.5
  ? 'chatflow-a-id'
  : 'chatflow-b-id';

const response = await fetch(`/api/v1/prediction/${chatflowId}`, {...});
```

Track performance in LangSmith to see which performs better.

---

## 18. Building a Personal AI Assistant

### Tutorial: On-Call Engineer AI Assistant

**Goal**: Build an AI assistant that helps on-call engineers diagnose and resolve incidents 24/7.

**Capabilities**:
1. Answer questions about incidents
2. Retrieve runbook documentation
3. Create incidents in LinkedEye
4. Query monitoring systems (Prometheus, Grafana)
5. Search past incidents
6. Generate postmortem reports

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│              On-Call Engineer AI Assistant                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Chat Model  │  │    Memory    │  │    Tools     │    │
│  │   (GPT-4)    │  │  (Redis)     │  │  (Custom)    │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐│
│  │                   Agent Tools                          ││
│  ├───────────────────────────────────────────────────────┤│
│  │  1. Search Incidents (RAG)                            ││
│  │  2. Create Incident (API)                             ││
│  │  3. Query Prometheus (Metrics)                        ││
│  │  4. Search Runbooks (Vector DB)                       ││
│  │  5. Calculator (Math)                                 ││
│  │  6. Get On-Call Schedule                              ││
│  └───────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
```

### Step-by-Step Build

#### Step 1: Create Agent Chatflow

1. Add "OpenAI Function Agent" node
2. Configure:
   - Model: `gpt-4o` (function calling support)
   - Temperature: `0.2` (consistent behavior)

#### Step 2: Add Tools

**Tool 1: Search Past Incidents**
```javascript
const searchIncidents = {
  name: "search_incidents",
  description: "Search for similar past incidents in the knowledge base. Use this to find how similar issues were resolved.",
  parameters: {
    type: "object",
    properties: {
      query: {type: "string", description: "Search query describing the incident"}
    },
    required: ["query"]
  },
  func: async (query) => {
    // Call Pinecone vector search
    const results = await vectorStore.similaritySearch(query, 5);
    return JSON.stringify(results);
  }
};
```

**Tool 2: Create Incident**
```javascript
const createIncident = {
  name: "create_incident",
  description: "Create a new incident in LinkedEye ITSM. Use when user reports a new issue.",
  parameters: {
    type: "object",
    properties: {
      title: {type: "string"},
      description: {type: "string"},
      priority: {type: "string", enum: ["P1", "P2", "P3", "P4"]}
    },
    required: ["title", "description"]
  },
  func: async (params) => {
    const response = await axios.post('http://linkedeye/api/v1/incidents', params);
    return `Created incident ${response.data.number}`;
  }
};
```

**Tool 3: Query Prometheus**
```javascript
const queryPrometheus = {
  name: "query_prometheus_metrics",
  description: "Query Prometheus for current metric values. Use to check CPU, memory, request rates, etc.",
  parameters: {
    type: "object",
    properties: {
      query: {type: "string", description: "PromQL query"}
    },
    required: ["query"]
  },
  func: async (query) => {
    const response = await axios.get(
      `http://prometheus:9090/api/v1/query?query=${encodeURIComponent(query)}`
    );
    return JSON.stringify(response.data.data.result);
  }
};
```

#### Step 3: Add Memory

1. Add "Redis-Backed Chat Memory"
2. Configure:
   - Redis URL: `redis://localhost:6379`
   - Session ID: `{sessionId}` (from request)
   - TTL: 86400 (24 hours)

#### Step 4: System Prompt

```
You are an expert on-call engineer assistant for LinkedEye ITSM platform.

Your role:
- Help diagnose and troubleshoot production incidents
- Search for similar past incidents and their resolutions
- Create new incidents when users report issues
- Query monitoring systems for current metrics
- Provide runbook guidance
- Stay calm and methodical during incidents

Guidelines:
- Always verify metrics before making conclusions
- Ask clarifying questions if incident description is vague
- Recommend creating P1 incidents for production outages
- Cite sources when referencing past incidents or runbooks
- If you don't know something, say so and suggest next steps

Available tools:
- search_incidents: Find similar past incidents
- create_incident: Create new incident ticket
- query_prometheus_metrics: Get current metric values
- search_runbooks: Find runbook documentation
- get_oncall_schedule: Check who is on-call

When troubleshooting:
1. Gather information (metrics, logs, symptoms)
2. Search for similar past incidents
3. Follow runbook procedures
4. Escalate if needed
5. Document resolution
```

#### Step 5: Test Scenarios

**Scenario 1: High CPU Alert**

**User**: "Getting alerts about high CPU on prod-api-01, what should I check?"

**Assistant**:
"Let me help you diagnose this. First, let me check the current metrics..."

*[Calls query_prometheus_metrics tool]*

"I see CPU usage is at 92% for the last 5 minutes. Let me search for similar incidents..."

*[Calls search_incidents tool]*

"I found 3 similar incidents from the past month. The most recent (INC-002341) was caused by a memory leak in the payment processing service. Let me get the runbook..."

*[Searches runbooks]*

"According to the high-cpu-troubleshooting runbook, here are the steps:

1. **Identify the process**: Run `top -o %CPU` on prod-api-01
2. **Check if legitimate load**: Review Grafana for traffic spikes
3. **Check recent deployments**: Any releases in last 2 hours?
4. **Review application logs**: Look for errors or slow queries

Should I create a P2 incident for tracking?"

**Scenario 2: Database Connection Errors**

**User**: "Users reporting database connection errors, can you create an incident?"

**Assistant**:
"Yes, I'll create an incident immediately. Let me gather some information first..."

*[Queries Prometheus]*

"I see database connection pool is at 100/100 (maxed out). This looks like a P1 incident - production impact. Creating now..."

*[Calls create_incident]*

"Created incident INC-003789 (P1 - Critical).

Immediate actions:
1. Check database server resources (CPU, memory, disk I/O)
2. Review slow query log
3. Check for connection leaks
4. Consider increasing connection pool size temporarily

I've found a similar incident (INC-002890) where connection pool exhaustion was caused by a runaway background job. Check if any jobs are stuck."

---

## 19. Analyzing Personal Assistant with LangSmith

### Evaluation Metrics

**Key Metrics for On-Call Assistant**:
1. **Accuracy**: Correct incident classification
2. **Relevance**: Quality of retrieved documents
3. **Latency**: Response time
4. **Tool Usage**: Are tools called correctly?
5. **User Satisfaction**: Thumbs up/down feedback

### Create Evaluation Dataset

**Sample Test Cases**:
```json
[
  {
    "input": "High CPU on prod server",
    "expected_output": {
      "severity": "P2",
      "tool_calls": ["query_prometheus_metrics", "search_incidents"],
      "contains": ["runbook", "similar incidents"]
    }
  },
  {
    "input": "Production database is completely down",
    "expected_output": {
      "severity": "P1",
      "tool_calls": ["create_incident"],
      "contains": ["immediate", "escalate"]
    }
  },
  {
    "input": "How do I restart nginx?",
    "expected_output": {
      "tool_calls": ["search_runbooks"],
      "contains": ["systemctl restart nginx", "sudo"]
    }
  }
]
```

### Run Evaluation in LangSmith

```python
from langsmith import Client
from langsmith.evaluation import evaluate

client = Client()

def run_assistant(input_text):
    response = requests.post(
        'http://flowise:3000/api/v1/prediction/oncall-assistant',
        json={"question": input_text}
    )
    return response.json()

# Run evaluation
results = evaluate(
    run_assistant,
    data="oncall-assistant-eval",  # Dataset name
    evaluators=[
        accuracy_evaluator,
        relevance_evaluator,
        latency_evaluator
    ],
    num_repetitions=3
)

print(f"Accuracy: {results['accuracy']:.2%}")
print(f"Avg Latency: {results['avg_latency']}s")
```

### Continuous Monitoring

**Production Metrics Dashboard**:
```
┌──────────────────────────────────────────────────────┐
│  On-Call Assistant - Last 7 Days                     │
├──────────────────────────────────────────────────────┤
│  Total Conversations: 247                            │
│  Unique Users: 23                                    │
│  Avg Messages per Conversation: 5.2                  │
│  Tool Call Success Rate: 94.3%                       │
│  User Satisfaction (👍): 87%                         │
│                                                       │
│  Most Common Queries:                                │
│  1. "How to troubleshoot high CPU" (42 times)       │
│  2. "Database connection issues" (31 times)          │
│  3. "Create incident for..." (28 times)              │
│                                                       │
│  Performance:                                         │
│  P50 Latency: 1.8s                                   │
│  P95 Latency: 4.2s                                   │
│  P99 Latency: 7.5s                                   │
│                                                       │
│  Cost Analysis:                                       │
│  Total Tokens: 2.3M                                  │
│  Estimated Cost: $52.15                              │
│  Cost per Conversation: $0.21                        │
└──────────────────────────────────────────────────────┘
```

---

## 20. Redis Memory in Flowise

### Why Redis for Memory?

**Benefits**:
- Distributed (works with multiple Flowise instances)
- Fast (in-memory)
- Persistent (can survive restarts)
- Scalable (cluster mode)
- TTL support (automatic cleanup)

### Memory Types

| Type | Use Case | Storage |
|------|----------|---------|
| **Buffer Memory** | Keep last N messages | Short conversations |
| **Summary Memory** | Summarize old messages | Long conversations |
| **Window Memory** | Sliding window of messages | Ongoing support chats |
| **Entity Memory** | Extract and remember entities | Track incident details |

### Tutorial: Implement Redis Memory

#### Step 1: Configure Redis

```yaml
# docker-compose.yml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --maxmemory 2gb
    --maxmemory-policy allkeys-lru
    --appendonly yes
    --appendfsync everysec
  volumes:
    - redis_data:/data
```

#### Step 2: Add Redis Memory in Flowise

1. Add "Redis-Backed Chat Memory" node
2. Configure:
   - Redis URL: `redis://redis:6379`
   - Session Key: `{sessionId}`
   - TTL: `3600` (1 hour for active chats)
   - Memory Size: `10` (last 10 messages)

#### Step 3: Memory Structure

**Redis Keys**:
```
flowise:session:user-123:messages → [msg1, msg2, msg3, ...]
flowise:session:user-123:metadata → {created_at, last_active, user_id}
```

**Message Format**:
```json
{
  "type": "human",
  "content": "What was that incident number again?",
  "timestamp": "2025-02-06T10:30:00Z"
}
{
  "type": "ai",
  "content": "The incident number is INC-003789 (P1 - Database Connection Failure).",
  "timestamp": "2025-02-06T10:30:02Z"
}
```

#### Step 4: Memory Retrieval

When user asks follow-up question:

**User**: "What was the resolution for that database incident?"

**Agent**:
1. Loads chat history from Redis (last 10 messages)
2. Finds context: "INC-003789 (Database Connection Failure)"
3. Searches vector store for that incident
4. Returns resolution details

### Advanced: Summary Memory

For very long conversations, use summary memory:

**Configuration**:
```javascript
{
  "memoryType": "summary",
  "llm": "gpt-4o-mini",  // Cheaper model for summaries
  "summaryPrompt": "Progressively summarize the incident troubleshooting conversation, focusing on key findings and actions taken."
}
```

**Example Summary**:
```
Summary of conversation so far:
- User reported high CPU on prod-api-01 (92% usage)
- Identified memory leak in payment service
- Applied temporary fix: increased connection pool
- Created incident INC-003789 (P2)
- Scheduled code review for permanent fix
```

### Session Management

**Cleanup Old Sessions**:
```bash
# Redis CLI
redis-cli
> KEYS flowise:session:*
> DEL flowise:session:inactive-user-456
```

**Automatic TTL**:
- Active conversations: 1 hour TTL (reset on each message)
- Inactive conversations: Expire after 1 hour
- Saves Redis memory

---

## 21. Chatflow Overview & Optimization

### Performance Optimization Techniques

#### 1. Reduce LLM Calls

**Problem**: Multiple LLM calls → slow + expensive

**Solution**: Combine prompts
```
❌ Bad:
Call 1: Classify incident
Call 2: Suggest actions
Call 3: Format response

✅ Good:
Single call: Classify + suggest actions + format in one prompt
```

#### 2. Use Smaller Models

**Strategy**:
- Simple tasks: GPT-4o-mini ($0.15/1M tokens vs $2.50/1M)
- Classification: Use fine-tuned small model
- Complex reasoning: GPT-4o only when needed

**Example**:
```
Simple classification → GPT-4o-mini
Complex incident analysis → GPT-4o
```

**Savings**: 85% cost reduction for simple tasks

#### 3. Implement Caching

**Cache Strategy**:
```
User query
   │
   ▼
[Check Redis cache]
   │
   ├─ Hit → Return cached response (10ms)
   │
   └─ Miss → Call LLM (2000ms) → Cache result
```

**Cache Key**: Hash of (query + system prompt + model)

**TTL**: 1 hour for dynamic content, 24 hours for static

#### 4. Optimize Vector Search

**Parameters**:
- `top_k`: Start with 3, increase only if needed
- `score_threshold`: Filter low-quality matches (>0.7)
- Embeddings: Use smaller dimensions if possible

**Before**:
```
top_k: 10
score_threshold: 0.5
Avg latency: 800ms
```

**After**:
```
top_k: 5
score_threshold: 0.75
Avg latency: 320ms
```

#### 5. Batch Processing

**For ingestion**:
```javascript
// Instead of processing 1000 docs individually
documents.forEach(doc => embedAndStore(doc));  // Slow

// Batch process
const batches = chunk(documents, 100);
for (const batch of batches) {
  await embedAndStoreBatch(batch);  // 10x faster
}
```

#### 6. Streaming Responses

Enable streaming for better UX:
- User sees response immediately (first token in ~500ms)
- Perceived latency much lower
- Don't wait for full response (5-10 seconds)

### Monitoring & Alerts

**Key Metrics**:
```
1. Latency:
   - P50: < 2s ✅
   - P95: < 5s ⚠️
   - P99: < 10s ❌

2. Cost:
   - Per conversation: < $0.50
   - Daily budget: $100
   - Alert if exceeding $120/day

3. Error Rate:
   - Overall: < 1% ✅
   - LLM timeouts: < 0.5%
   - Vector store errors: < 0.1%

4. User Satisfaction:
   - Thumbs up: > 80% ✅
   - Thumbs down: < 5%
```

### Production Checklist

**Before Going Live**:
- [ ] Authentication enabled (username/password)
- [ ] HTTPS configured (SSL/TLS)
- [ ] Rate limiting enabled
- [ ] Error handling implemented
- [ ] Logging configured (structured JSON)
- [ ] Monitoring set up (LangSmith + Prometheus)
- [ ] Backup strategy (database + vector store)
- [ ] API keys rotated and secured
- [ ] Load testing completed (1000 concurrent users)
- [ ] Documentation written
- [ ] Team trained on operations

---

## Summary

You've now mastered Flowise from beginner to advanced level!

**Key Takeaways**:
1. ✅ Installed and deployed Flowise (Docker + K8s)
2. ✅ Built RAG chatbots with vector stores
3. ✅ Created custom tools for LinkedEye ITSM integration
4. ✅ Implemented production-grade memory with Redis
5. ✅ Monitored performance with LangSmith
6. ✅ Optimized for cost and latency
7. ✅ Built an intelligent on-call assistant

**Next Steps**:
1. Deploy Flowise to LinkedEye K8s cluster
2. Integrate with existing incident management workflows
3. Load historical incidents into vector store
4. Train team on using AI assistant
5. Monitor and iterate based on feedback

**Production Architecture**:
```
┌─────────────────────────────────────────────────────┐
│              LinkedEye ITSM Platform                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Backend    │  │   Frontend   │  │  Flowise  │ │
│  │   (FastAPI)  │  │   (React)    │  │  (AI Bot) │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                 │                 │        │
│         └─────────────────┴─────────────────┘        │
│                           │                           │
│         ┌─────────────────┴─────────────────┐        │
│         │                                     │        │
│    ┌────▼─────┐  ┌──────────┐  ┌──────────┐ │
│    │PostgreSQL│  │  Qdrant  │  │  Redis   │ │
│    │   (DB)   │  │ (Vectors)│  │ (Memory) │ │
│    └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
```

**Congratulations!** You're now ready to build production-ready AI workflows! 🎉
