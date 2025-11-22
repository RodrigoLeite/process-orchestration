# LangFlow Integration API Reference

Complete API documentation for the LangFlow gateway endpoints. All endpoints are located at `/api/langflow/*`.

---

## 📋 Overview

The LangFlow gateway provides a secure backend interface for importing, compiling, and executing LangFlow agents. Users design flows in the LangFlow UI, export them as JSON, and the backend handles validation, compilation, and execution.

**Key Features:**
- ✅ Flow validation with detailed error reporting
- ✅ Automatic code generation from LangFlow JSON
- ✅ Version control for compiled agents
- ✅ Safe execution sandboxing
- ✅ Zero direct user access to LangFlow API

---

## 🔌 Endpoints

### 1. List All Agents

**GET** `/api/langflow/list`

Returns all imported LangFlow agents.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "e45d1899-85a2-4987-9225-1e7d6de728e0",
      "name": "Demo Agent",
      "description": "Test LangFlow agent",
      "langflowJson": { /* full flow JSON */ },
      "compiledCode": null,
      "version": 1,
      "isActive": "true",
      "createdAt": "2025-11-22T21:14:00.000Z",
      "updatedAt": "2025-11-22T21:14:00.000Z"
    }
  ]
}
```

**Status Codes:**
- `200`: Success
- `500`: Server error

---

### 2. Get Agent Details

**GET** `/api/langflow/{id}`

Retrieves details of a specific agent.

**Parameters:**
- `id` (path): Agent UUID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "e45d1899-85a2-4987-9225-1e7d6de728e0",
    "name": "Demo Agent",
    "description": "Test LangFlow agent",
    "version": 1,
    "isActive": "true",
    "createdAt": "2025-11-22T21:14:00.000Z"
  }
}
```

**Status Codes:**
- `200`: Success
- `404`: Agent not found
- `500`: Server error

---

### 3. Import LangFlow Agent

**POST** `/api/langflow/import`

Imports a LangFlow agent from exported JSON. Validates structure before storing.

**Request Body:**
```json
{
  "name": "My Custom Agent",
  "description": "Optional description",
  "langflowJson": {
    "nodes": [
      {
        "id": "node-1",
        "type": "input",
        "data": { "label": "Input Data" }
      },
      {
        "id": "node-2",
        "type": "processor",
        "data": { "label": "Process Data" }
      },
      {
        "id": "node-3",
        "type": "output",
        "data": { "label": "Output Result" }
      }
    ],
    "edges": [
      { "source": "node-1", "target": "node-2" },
      { "source": "node-2", "target": "node-3" }
    ]
  }
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Agent imported successfully",
  "data": {
    "id": "new-uuid-here",
    "name": "My Custom Agent",
    "version": 1,
    "isActive": "true",
    "createdAt": "2025-11-22T21:14:00.000Z"
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid LangFlow JSON structure",
  "details": [
    "LangFlow JSON must contain 'nodes' or 'flows' property",
    "Node at index 0 is missing 'type' field"
  ]
}
```

**Status Codes:**
- `201`: Agent created successfully
- `400`: Invalid JSON or missing required fields
- `409`: Agent with this name already exists
- `500`: Server error

**Validation Rules:**
- `name`: Required, must be unique
- `langflowJson`: Required, must contain `nodes` or `flows`
- Each node must have `id` and `type`
- Each edge must have `source` and `target`
- At least one node required

---

### 4. Compile Agent

**POST** `/api/langflow/{id}/compile`

Compiles a LangFlow agent to executable TypeScript code. Creates a new version.

**Parameters:**
- `id` (path): Agent UUID

**Response:**
```json
{
  "success": true,
  "message": "Agent compiled successfully",
  "data": {
    "id": "e45d1899-85a2-4987-9225-1e7d6de728e0",
    "name": "My Custom Agent",
    "compiledCode": "// Generated code...",
    "version": 2,
    "updatedAt": "2025-11-22T21:15:00.000Z"
  },
  "version": 2
}
```

**Compilation Details:**
- Analyzes LangFlow JSON structure
- Generates executable TypeScript code
- Stores compiled code in database
- Auto-increments version number
- Previous versions retained for rollback

**Status Codes:**
- `200`: Success
- `400`: Compilation failed
- `404`: Agent not found
- `500`: Server error

---

### 5. Execute Agent

**POST** `/api/langflow/{id}/run`

Executes a compiled LangFlow agent with provided input.

**Parameters:**
- `id` (path): Agent UUID

**Request Body:**
```json
{
  "input": {
    "query": "How many users signed up today?",
    "context": "sales",
    "timestamp": "2025-11-22T21:14:00.000Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent executed successfully",
  "output": {
    "result": "42 new users signed up today",
    "confidence": 0.95,
    "source": "database_query",
    "executedAt": "2025-11-22T21:15:00.000Z"
  },
  "executionTime": 234
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Agent is not compiled. Call /compile endpoint first."
}
```

**Status Codes:**
- `200`: Execution successful
- `400`: Agent not compiled or execution error
- `404`: Agent not found
- `500`: Server error

**Execution Context:**
- Input object is passed to compiled function
- Execution happens in sandboxed context
- No file system access
- 30-second timeout (configurable)
- Returns execution time in milliseconds

---

### 6. Delete Agent

**DELETE** `/api/langflow/{id}`

Removes a LangFlow agent and all versions from the system.

**Parameters:**
- `id` (path): Agent UUID

**Response:**
```json
{
  "success": true,
  "message": "Agent deleted successfully"
}
```

**Status Codes:**
- `200`: Agent deleted successfully
- `404`: Agent not found
- `500`: Server error

---

## 📊 Complete Workflow Example

```bash
# Step 1: Import a new agent
curl -X POST http://localhost:5000/api/langflow/import \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sales Query Agent",
    "description": "Analyzes sales data and answers questions",
    "langflowJson": {
      "nodes": [...],
      "edges": [...]
    }
  }'

# Returns: {"success": true, "data": {"id": "abc-123"}}

# Step 2: Compile the agent
curl -X POST http://localhost:5000/api/langflow/abc-123/compile

# Returns: {"success": true, "data": {"compiledCode": "...", "version": 1}}

# Step 3: Execute the agent
curl -X POST http://localhost:5000/api/langflow/abc-123/run \
  -H "Content-Type: application/json" \
  -d '{"input": {"query": "Total sales yesterday?"}}'

# Returns: {"success": true, "output": {"result": "$15,000"}}

# Step 4: List all agents
curl http://localhost:5000/api/langflow/list

# Step 5: Delete when done
curl -X DELETE http://localhost:5000/api/langflow/abc-123
```

---

## 🔒 Security Considerations

1. **Validation**: All LangFlow JSON is validated before storage
2. **Compilation**: Code generation follows strict patterns, no user code execution
3. **Sandboxing**: Compiled code runs in isolated context without file system access
4. **Authentication**: Future implementation can add user/role-based access control
5. **Audit Trail**: All operations logged with timestamps and user context
6. **No Direct API**: Users cannot directly access LangFlow API - backend is the only gateway

---

## 🧪 Testing

### Test Import
```bash
curl -X POST http://localhost:5000/api/langflow/import \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "langflowJson": {
      "nodes": [{"id": "1", "type": "input"}],
      "edges": []
    }
  }'
```

### Test List
```bash
curl http://localhost:5000/api/langflow/list
```

### Test Execution (requires compile first)
```bash
curl -X POST http://localhost:5000/api/langflow/{agent-id}/run \
  -H "Content-Type: application/json" \
  -d '{"input": {}}'
```

---

## 📝 Notes

- All timestamps are in ISO 8601 format (UTC)
- Version numbers auto-increment on each compile
- Agents are soft-deleted (can add hard delete in future)
- Execution timeout is 30 seconds (configurable in compiled code)
- Request bodies must have `Content-Type: application/json`

---

## 🔄 Environment Variables

Optional configuration for future LangFlow cloud integration:

```bash
LANGFLOW_ENDPOINT=http://localhost:7860
LANGFLOW_API_KEY=your-api-key-here
```

Currently, these are optional and used only for `sendFlowToLangFlow()` function calls.
