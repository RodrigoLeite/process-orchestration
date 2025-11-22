#!/bin/bash
echo "Testing LangGraph Orchestration..."
curl -s -X POST "http://localhost:5000/api/orchestration/process-demand" \
  -H "Content-Type: application/json" \
  -d '{
    "demand": {
      "titulo": "Implement real-time notification system",
      "descricao": "Create instant notifications for order updates",
      "area": "TECH",
      "urgencia": "alta",
      "resultadosEsperados": ["Instant notifications", "Email and SMS support"],
      "slaHoras": 32
    },
    "demand_id": "test-notifications-001"
  }' | jq .
