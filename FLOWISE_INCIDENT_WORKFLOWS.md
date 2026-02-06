# Flowise Incident Management Workflows

Practical, production-ready Flowise chatflows for LinkedEye ITSM platform.

---

## Quick Start

```bash
# 1. Start Flowise with Docker Compose
docker-compose -f docker-compose.flowise.yml up -d

# 2. Access Flowise UI
open http://localhost:3000

# 3. Login
Username: admin
Password: Change_Me_In_Production_123!

# 4. Import workflows
# (Use the JSON configurations below)
```

---

## Workflow 1: Incident Classification Bot

### Purpose
Automatically classify incoming incidents by severity and category.

### Workflow Configuration

**Nodes**:
1. **Chat Model** (OpenAI GPT-4o-mini - cost-effective)
2. **Prompt Template** (System prompt)
3. **JSON Output Parser**
4. **Buffer Memory** (remember conversation context)

### JSON Export

```json
{
  "nodes": [
    {
      "id": "chatOpenAI_1",
      "type": "ChatOpenAI",
      "data": {
        "label": "ChatOpenAI",
        "name": "chatOpenAI",
        "category": "Chat Models",
        "inputs": {
          "modelName": "gpt-4o-mini",
          "temperature": 0.3,
          "maxTokens": 500,
          "topP": 1,
          "frequencyPenalty": 0,
          "presencePenalty": 0
        }
      }
    },
    {
      "id": "promptTemplate_1",
      "type": "PromptTemplate",
      "data": {
        "label": "System Prompt",
        "name": "promptTemplate",
        "inputs": {
          "template": "You are an expert ITSM incident classifier for LinkedEye platform.\n\nAnalyze incident reports and classify them:\n\nSEVERITY:\n- P1 (Critical): Complete system outage, data loss, security breach, affecting >1000 users\n- P2 (High): Major functionality broken, significant performance degradation, affecting >100 users\n- P3 (Medium): Partial functionality issues, workarounds available, affecting <100 users\n- P4 (Low): Minor issues, cosmetic problems, feature requests, no user impact\n\nCATEGORY:\n- Infrastructure: Servers, networks, storage, compute resources\n- Application: Software bugs, crashes, errors, code issues\n- Security: Vulnerabilities, access issues, breaches, auth problems\n- Performance: Slowness, timeouts, resource exhaustion, degradation\n- Data: Database issues, data integrity, backups, replication\n\nRespond ONLY in JSON format:\n{\n  \"severity\": \"P1|P2|P3|P4\",\n  \"category\": \"Infrastructure|Application|Security|Performance|Data\",\n  \"reasoning\": \"Brief explanation of classification\",\n  \"suggested_actions\": [\"Action 1\", \"Action 2\", \"Action 3\"],\n  \"estimated_impact\": \"Number of users/services affected\",\n  \"sla_breach_risk\": true|false\n}\n\nIncident Report:\n{input}"
        }
      }
    },
    {
      "id": "jsonOutputParser_1",
      "type": "JsonOutputParser",
      "data": {
        "label": "JSON Output Parser",
        "name": "jsonOutputParser"
      }
    },
    {
      "id": "bufferMemory_1",
      "type": "BufferMemory",
      "data": {
        "label": "Buffer Memory",
        "name": "bufferMemory",
        "inputs": {
          "memoryKey": "chat_history",
          "inputKey": "input",
          "sessionId": "{sessionId}"
        }
      }
    }
  ],
  "edges": [
    {
      "source": "promptTemplate_1",
      "target": "chatOpenAI_1"
    },
    {
      "source": "chatOpenAI_1",
      "target": "jsonOutputParser_1"
    },
    {
      "source": "bufferMemory_1",
      "target": "chatOpenAI_1"
    }
  ]
}
```

### Test Cases

**Test 1: Critical Incident**
```
Input: "Production database cluster is completely down. All API requests
are failing with 'Connection refused'. This started 5 minutes ago and
affects all customers globally. Revenue processing is halted."

Expected Output:
{
  "severity": "P1",
  "category": "Infrastructure",
  "reasoning": "Complete database outage with global customer impact and revenue loss qualifies as P1.",
  "suggested_actions": [
    "Initiate failover to standby database cluster",
    "Page on-call DBA and SRE teams immediately",
    "Start customer communication via status page",
    "Begin incident war room with leadership"
  ],
  "estimated_impact": "All users (10,000+)",
  "sla_breach_risk": true
}
```

**Test 2: Medium Incident**
```
Input: "Some users reporting slow page load times on the dashboard.
Response time is 5-8 seconds instead of usual 1-2 seconds. About 50
users affected. Functionality still works, just slower."

Expected Output:
{
  "severity": "P3",
  "category": "Performance",
  "reasoning": "Performance degradation with limited user impact and workaround (wait longer) suggests P3.",
  "suggested_actions": [
    "Check application and database performance metrics",
    "Review recent code deployments",
    "Monitor for increasing impact"
  ],
  "estimated_impact": "50 users",
  "sla_breach_risk": false
}
```

### API Usage

```bash
# Create incident classification
curl -X POST http://localhost:3000/api/v1/prediction/incident-classifier \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Database connection pool exhausted. All new connections timing out.",
    "overrideConfig": {
      "sessionId": "session-123"
    }
  }'
```

### Integration with LinkedEye Backend

```python
# In LinkedEye backend: app/services/ai_classification_service.py
import requests
from app.core.config import settings

class AIClassificationService:
    def __init__(self):
        self.flowise_url = settings.flowise_url
        self.chatflow_id = "incident-classifier-id"

    async def classify_incident(self, description: str) -> dict:
        """Classify incident using Flowise AI"""
        response = requests.post(
            f"{self.flowise_url}/api/v1/prediction/{self.chatflow_id}",
            json={
                "question": description,
                "overrideConfig": {
                    "sessionId": f"classify-{uuid.uuid4()}"
                }
            },
            timeout=10
        )
        return response.json()

# Usage in incident creation endpoint
classification = await ai_service.classify_incident(incident_data.description)
incident.priority = classification['severity']
incident.category = classification['category']
incident.ai_reasoning = classification['reasoning']
```

---

## Workflow 2: RAG-Based Incident Troubleshooting Assistant

### Purpose
Answer "How do I troubleshoot X?" questions using runbook knowledge base.

### Architecture

```
User Question
     │
     ▼
[Embed Question (OpenAI)] → [Vector Search (Qdrant)] → [Retrieve Top 5]
                                                              │
                                                              ▼
                                      [Build Context with Retrieved Docs]
                                                              │
                                                              ▼
                                      [Generate Answer (GPT-4o)]
                                                              │
                                                              ▼
                                      [Return Answer + Sources]
```

### Setup Instructions

#### Step 1: Prepare Knowledge Base

Create `runbooks/` folder with markdown files:

**Example: `high-cpu-troubleshooting.md`**
```markdown
# High CPU Troubleshooting Runbook

## Severity: P2 - High

## Symptoms
- CPU usage > 90% sustained for 5+ minutes
- Server slow to respond
- Application timeouts

## Immediate Actions

1. **Identify the culprit process**
   ```bash
   top -o %CPU
   # or
   htop
   ```

2. **Check if legitimate load**
   - Review Grafana dashboards for traffic spike
   - Check application logs for errors
   - Verify recent deployments

3. **Collect diagnostic data**
   ```bash
   # CPU info
   mpstat -P ALL 1 5

   # Process tree
   ps auxf | less

   # System load
   uptime
   ```

## Resolution Steps

### If Runaway Process
```bash
# Gracefully stop service
systemctl stop <service-name>

# If unresponsive, force kill
kill -9 <PID>

# Restart service
systemctl start <service-name>
```

### If Legitimate High Load
- Scale horizontally (add more instances)
- Optimize code (profile and fix hot paths)
- Review recent changes

## Root Cause Analysis
- Memory leak causing excessive GC
- Infinite loop in code
- Database query without proper indexing
- External API calls timing out

## Prevention
- Set up CPU usage alerts (>80% for 5 min)
- Regular performance testing
- Code profiling in staging
```

#### Step 2: Ingest Documents into Qdrant

**Ingestion Chatflow**:
1. **Folder Document Loader**
   - Path: `/path/to/runbooks`
   - File Types: `md,txt`

2. **Recursive Character Text Splitter**
   - Chunk Size: `1000`
   - Chunk Overlap: `200`

3. **OpenAI Embeddings**
   - Model: `text-embedding-3-small`

4. **Qdrant Upsert**
   - URL: `http://flowise-qdrant:6333`
   - Collection: `incident_runbooks`
   - Dimension: `1536`

Click "Upsert" to index all runbooks.

#### Step 3: Create RAG Chatflow

**Nodes**:
1. **Qdrant** (Vector Store Retriever)
2. **Conversational Retrieval QA Chain**
3. **ChatOpenAI** (GPT-4o)
4. **Redis Backed Chat Memory**

**Configuration**:

```json
{
  "qdrant": {
    "topK": 5,
    "scoreThreshold": 0.75
  },
  "conversationalRetrievalQA": {
    "systemMessage": "You are a helpful incident response assistant for LinkedEye ITSM.\n\nUse the provided runbook documentation to answer troubleshooting questions.\n\nGuidelines:\n- Always cite the source runbook you're referencing\n- If the answer is not in the documentation, say so honestly\n- Provide step-by-step instructions\n- Include command examples when applicable\n- Warn about any destructive operations\n\nFormat your response as:\n1. Brief summary\n2. Step-by-step instructions\n3. Source citation",
    "returnSourceDocuments": true
  },
  "chatOpenAI": {
    "modelName": "gpt-4o",
    "temperature": 0.3
  },
  "redisMemory": {
    "redisURL": "redis://flowise-redis:6379",
    "sessionTTL": 3600
  }
}
```

### Test Queries

**Query 1**:
```
How do I troubleshoot high CPU on a production server?
```

**Expected Response**:
```
Based on the high-cpu-troubleshooting.md runbook:

**Summary**: High CPU (>90% sustained) requires immediate investigation to identify if it's a runaway process or legitimate load.

**Step-by-Step Instructions**:

1. **Identify the Process**
   Run `top -o %CPU` or `htop` to see which process is consuming CPU.

2. **Determine if Legitimate**
   - Check Grafana for traffic spikes
   - Review application logs
   - Verify recent deployments

3. **Collect Diagnostics**
   ```bash
   mpstat -P ALL 1 5  # CPU stats
   ps auxf | less     # Process tree
   uptime             # System load
   ```

4. **Resolution**
   - If runaway process: `systemctl stop <service>` then investigate
   - If legitimate load: Scale horizontally or optimize code

5. **Root Cause Analysis**
   Common causes: Memory leaks, infinite loops, slow queries, API timeouts

**Source**: high-cpu-troubleshooting.md (Incident Response Runbooks)

**⚠️ Warning**: Always collect diagnostics before killing processes. Use `kill -9` only as last resort.
```

### API Integration

```python
# In LinkedEye backend: app/services/ai_troubleshooting_service.py
class AITroubleshootingService:
    def __init__(self):
        self.flowise_url = settings.flowise_url
        self.chatflow_id = "rag-troubleshooting-assistant-id"

    async def get_troubleshooting_advice(
        self,
        query: str,
        session_id: str
    ) -> dict:
        """Get AI-powered troubleshooting advice from runbooks"""
        response = requests.post(
            f"{self.flowise_url}/api/v1/prediction/{self.chatflow_id}",
            json={
                "question": query,
                "overrideConfig": {
                    "sessionId": session_id
                }
            },
            timeout=30
        )

        data = response.json()
        return {
            "answer": data.get("text"),
            "sources": [
                {
                    "content": doc["pageContent"],
                    "metadata": doc["metadata"]
                }
                for doc in data.get("sourceDocuments", [])
            ]
        }

# Usage in incidents API
advice = await ai_service.get_troubleshooting_advice(
    query=f"How to troubleshoot: {incident.title}",
    session_id=f"incident-{incident.id}"
)

# Add as incident comment
comment = IncidentComment(
    incident_id=incident.id,
    user_id=None,  # System comment
    content=f"AI Assistant Suggestion:\n\n{advice['answer']}",
    is_internal=True,
    comment_type="ai_suggestion"
)
db.add(comment)
```

---

## Workflow 3: Intelligent On-Call Assistant (Agent)

### Purpose
Multi-capability assistant that can search docs, create incidents, query metrics, and more.

### Agent Configuration

**Tools**:
1. **Search Runbooks** (RAG)
2. **Create Incident** (API call)
3. **Query Prometheus** (Metrics)
4. **Get Similar Incidents** (Vector search)
5. **Get On-Call Schedule** (API call)

### Tool Implementations

#### Tool 1: Create Incident

```javascript
// In Flowise Custom Tool
const axios = require('axios');

async function createIncident(params) {
    const { title, description, priority, category } = JSON.parse(params);

    try {
        const response = await axios.post(
            process.env.LINKEDEYE_API_URL + '/api/v1/incidents',
            {
                title,
                description,
                priority: priority || 'P3',
                category: category || 'General',
                impact: 'MEDIUM',
                urgency: 'MEDIUM',
                source: 'AI Assistant'
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.LINKEDEYE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 5000
            }
        );

        return JSON.stringify({
            success: true,
            incident_number: response.data.number,
            incident_id: response.data.id,
            message: `Incident ${response.data.number} created successfully`
        });
    } catch (error) {
        return JSON.stringify({
            success: false,
            error: error.message
        });
    }
}

module.exports = { nodeClass: CustomTool, createIncident };
```

#### Tool 2: Query Prometheus

```javascript
async function queryPrometheus(params) {
    const { query } = JSON.parse(params);

    try {
        const response = await axios.get(
            process.env.PROMETHEUS_URL + '/api/v1/query',
            {
                params: { query },
                timeout: 5000
            }
        );

        const results = response.data.data.result;
        const formatted = results.map(r => ({
            metric: r.metric,
            value: r.value[1]
        }));

        return JSON.stringify({
            query,
            results: formatted,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return JSON.stringify({
            error: error.message
        });
    }
}
```

### Conversation Examples

**Example 1: Diagnose and Create Incident**

**User**: "We're seeing errors on the API gateway. Can you check what's happening and create an incident?"

**Agent**:
"Let me investigate. I'll query Prometheus for API gateway metrics..."

*[Calls query_prometheus tool]*
*Query: `rate(http_requests_total{job="api-gateway", status=~"5.."}[5m])`*

"I see a spike in 500 errors - currently 42 errors/min (normal is <1/min). Let me check for similar past incidents..."

*[Calls search_similar_incidents tool]*
*Query: "API gateway 500 errors"*

"I found 2 similar incidents:
- INC-003421: Rate limiter misconfiguration (resolved)
- INC-002987: Database connection pool exhausted (resolved)

Both were P2 incidents. I'll create a P2 incident for this now..."

*[Calls create_incident tool]*

"Created incident **INC-004567** (P2 - High Priority).

**Recommended immediate actions:**
1. Check database connection pool status
2. Review recent API gateway configuration changes
3. Check rate limiter settings

Would you like me to search the runbooks for API gateway troubleshooting steps?"

---

## Workflow 4: Postmortem Generator

### Purpose
Auto-generate incident postmortem reports from incident data.

### Prompt Template

```
You are writing an incident postmortem report for LinkedEye ITSM.

Generate a comprehensive postmortem in markdown format.

# Incident Postmortem: {incident_title}

## Incident Summary
- **Incident Number**: {incident_number}
- **Severity**: {priority}
- **Duration**: {started_at} to {resolved_at} ({duration})
- **Impact**: {impact_description}

## Timeline
{timeline_events}

## Root Cause
{root_cause_analysis}

## Resolution
{resolution_steps}

## What Went Well
- Positive aspects of the response

## What Could Be Improved
- Areas for improvement

## Action Items
- [ ] Action item 1 (Owner: TBD, Due: TBD)
- [ ] Action item 2 (Owner: TBD, Due: TBD)

## Appendix
- Grafana Dashboard: {dashboard_url}
- Slack Thread: {slack_url}
- Incident Ticket: {incident_url}

---
Generated by LinkedEye AI Assistant on {generated_date}
```

---

## Integration Checklist

**After deploying Flowise workflows**:

- [ ] Configure API endpoints in LinkedEye backend
- [ ] Add Flowise webhook URLs to incident creation flow
- [ ] Set up LangSmith monitoring
- [ ] Configure alerts for high error rates
- [ ] Train support team on AI assistant capabilities
- [ ] Create internal documentation
- [ ] Set up feedback mechanism (thumbs up/down)
- [ ] Monitor token usage and costs
- [ ] Schedule monthly review of AI performance
- [ ] Plan for continuous improvement (add more runbooks, tune prompts)

---

## Monitoring Dashboard

Track AI assistant performance:

```
┌────────────────────────────────────────────────────┐
│  Flowise AI Metrics - Last 24 Hours                │
├────────────────────────────────────────────────────┤
│                                                     │
│  Incident Classifier:                              │
│  - Requests: 342                                   │
│  - Avg Latency: 1.2s                               │
│  - Accuracy: 94% (manual review sample)            │
│                                                     │
│  RAG Troubleshooting:                              │
│  - Requests: 156                                   │
│  - Avg Latency: 2.8s                               │
│  - User Satisfaction: 89% 👍                       │
│                                                     │
│  On-Call Assistant:                                │
│  - Conversations: 47                               │
│  - Tool Calls: 132                                 │
│  - Incidents Created: 23                           │
│                                                     │
│  Cost Analysis:                                     │
│  - Total Tokens: 1.2M                              │
│  - Estimated Cost: $18.50                          │
│  - Cost per Incident: $0.054                       │
└────────────────────────────────────────────────────┘
```

---

**Ready to deploy?** Start with Workflow 1 (Incident Classifier) and gradually add more workflows as you gain confidence! 🚀
