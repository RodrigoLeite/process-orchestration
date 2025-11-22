# 📊 Observabilidade de Logs da Orquestração

Seu sistema agora possui páginas completas para visualizar e analisar execuções do grafo de orquestração em tempo real, sem qualquer menção a ferramentas externas.

---

## 📁 Arquivos Criados

### Frontend Pages
```
client/src/pages/
├─ ai-logs.tsx              ⭐ Lista de execuções (novo)
└─ ai-logs-detail.tsx       ⭐ Detalhes de uma execução (novo)
```

### Backend APIs
```
server/routes.ts
├─ GET /api/ai/logs         ⭐ Listar execuções
└─ GET /api/ai/logs/:id     ⭐ Detalhes de execução
```

### Rotas Registradas
```
client/src/App.tsx
├─ /app/ai/logs             → AILogsPage (lista)
└─ /app/ai/logs/:id         → AILogsDetailPage (detalhes)
```

---

## 🎯 Página 1: `/app/ai/logs` - Lista de Execuções

**Funcionalidades:**
- ✅ Lista todas as execuções do grafo
- ✅ Mostra: demandId, timestamp, duração, status
- ✅ Agente executado (orchestrateFromDatabase)
- ✅ Workflow gerado (se houver)
- ✅ Sorting: Mais Recentes / Mais Lentos
- ✅ Estatísticas KPI
- ✅ Atualização automática a cada 10 segundos

**Dados Exibidos:**

```
📊 Estatísticas (Cards no topo)
├─ Total de Execuções: N
├─ Taxa de Sucesso: X%
└─ Duração Média: Xms/s

📋 Lista de Execuções (Cards clicáveis)
├─ Status (✓ Sucesso / ✗ Erro)
├─ Duração (⏱ XXms/Xs)
├─ Demanda ID
├─ Workflow Gerado (título)
├─ Timestamp
└─ Metadados (primeiras 150 chars)
```

**Funcionalidades de UX:**
- Clique em qualquer card para ver detalhes completos
- Cores: Verde (sucesso) / Vermelho (erro)
- Icons: CheckCircle2, AlertCircle, Zap
- Responsive: Mobile, Tablet, Desktop
- Data-testid em todos os elementos interativos

---

## 🎯 Página 2: `/app/ai/logs/:id` - Detalhes da Execução

**Seções:**

### 1. Informações da Execução
```
Status:     ✓ Sucesso / ✗ Erro
Duração:    XX.Xs / XXms
Agente:     orchestrateFromDatabase
Timestamp:  DD/MM/YYYY HH:MM:SS
ID:         execution-uuid
```

### 2. Demanda Processada
```
Título:        (texto da demanda)
ID:            uuid
Prioridade:    crítica / alta / média / baixa
Área:          TECH / SALES / etc
Descrição:     (texto completo)
```

### 3. Workflows Gerados
```
Para cada workflow:
├─ Título
├─ Descrição
└─ ID (UUID)
```

### 4. Gargalos Identificados
```
Para cada gargalo:
├─ Workflow afetado
├─ Severity (crítica / alta / média / baixa)
├─ Lista de gargalos:
│  ├─ Stage
│  ├─ Motivo
│  └─ Ação recomendada
└─ Timestamp de detecção
```

### 5. Insights & Recomendações
```
Para cada insight:
├─ Workflow analisado
├─ 🎯 Insights Principais
├─ 💡 Recomendações
├─ ⚠️ Fatores de Risco
├─ 🚀 Oportunidades de Otimização
└─ Timestamp de geração
```

---

## 🔌 API Endpoints

### GET /api/ai/logs

**Query Parameters:**
```
?limit=50     (default: 50, max: 500)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "executionId": "uuid",
      "demandId": "demand-123",
      "timestamp": "2025-11-22T21:45:30.000Z",
      "duration_ms": 18500,
      "status": "success",
      "agentExecuted": "orchestrateFromDatabase",
      "metadata": { ... },
      "workflow": {
        "id": "wf-123",
        "title": "Workflow Title"
      }
    },
    ...
  ],
  "total": 5
}
```

---

### GET /api/ai/logs/:executionId

**Response:**
```json
{
  "success": true,
  "data": {
    "executionId": "uuid",
    "demandId": "demand-123",
    "demandData": {
      "id": "uuid",
      "title": "Demand Title",
      "description": "Description",
      "priority": "alta",
      "status": "processing",
      "area": "TECH"
    },
    "execution": {
      "timestamp": "2025-11-22T21:45:30.000Z",
      "duration_ms": 18500,
      "status": "success",
      "agentKey": "orchestrateFromDatabase",
      "metadata": { ... }
    },
    "workflows": [
      {
        "id": "wf-123",
        "title": "Workflow Title",
        "description": "Description"
      }
    ],
    "bottlenecks": [
      {
        "id": "bn-123",
        "workflow": "Workflow Title",
        "severity": "alta",
        "bottlenecks": [ ... ],
        "detectedAt": "2025-11-22T21:45:40.000Z"
      }
    ],
    "insights": [
      {
        "id": "in-123",
        "workflow": "Workflow Title",
        "insights": {
          "key_insights": [...],
          "recommendations": [...],
          "risk_factors": [...],
          "optimization_opportunities": [...]
        },
        "generatedAt": "2025-11-22T21:45:50.000Z"
      }
    ]
  }
}
```

---

## 🎨 Design & Componentes

### Componentes Utilizados
- **Card** - Containers principais
- **Button** - Navegação e sorting
- **Badge** - Status, prioridade, duração
- **Icons** - Activity, CheckCircle2, AlertCircle, Zap, Target, Lightbulb

### Cores
- ✅ **Verde** - Sucesso
- ❌ **Vermelho** - Erro
- 🟠 **Laranja** - Alta severidade
- 🔵 **Azul** - Informação
- 💛 **Amarelo** - Insights
- 🟣 **Roxo** - Agente executado

### Responsividade
- Mobile: 1 coluna
- Tablet: 2-3 colunas
- Desktop: 3+ colunas

---

## 📊 Dados Persistidos

Os logs são carregados de:
1. **systemEvents** - Execuções do grafo
2. **demands** - Demandas processadas
3. **workflows** - Workflows gerados
4. **bottleneckReports** - Gargalos identificados
5. **insightsReports** - Insights gerados

Todos salvos automaticamente pela orquestração (`POST /api/ai/orchestrate`).

---

## 🔄 Fluxo Completo

```
1. User executa: POST /api/ai/orchestrate
                 └─ orchestrationGraph executa
                    └─ Salva em: workflows, bottleneckReports, insightsReports
                    └─ Log em: systemEvents

2. User navega para: /app/ai/logs
                     └─ GET /api/ai/logs
                        └─ Retorna lista de execuções

3. User clica em execução:
                     └─ Navega para: /app/ai/logs/:id
                        └─ GET /api/ai/logs/:id
                           └─ Retorna todos os detalhes:
                              ├─ Demand
                              ├─ Workflows
                              ├─ Bottlenecks
                              └─ Insights
```

---

## 🧪 Testando

### Teste 1: Listar Logs
```bash
curl http://localhost:5000/api/ai/logs
```

### Teste 2: Detalhes de uma Execução
```bash
curl http://localhost:5000/api/ai/logs/{executionId}
```

### Teste 3: UI - Lista de Logs
```
Navegue para: http://localhost:5000/app/ai/logs
```

### Teste 4: UI - Detalhes
```
Clique em qualquer card na lista de logs
```

---

## 🔐 Segurança

✅ **Não expõe ferramentas externas** - Apenas logs locais do sistema
✅ **Sem LangSmith visível** - Todas as execuções rastreadas internamente
✅ **Sem dados sensíveis** - Apenas informações de execução e workflow
✅ **Sem stack traces de erro** - Mensagens limpas e user-friendly
✅ **Error handling completo** - Graceful fallbacks se dados não existirem

---

## ✨ Features Principais

✅ **Tempo Real** - Auto-refresh a cada 10 segundos
✅ **Sorting** - Mais recentes ou mais lentos
✅ **Statísticas** - KPI cards no topo
✅ **Navegação Intuitiva** - Clique para detalhes
✅ **Responsive** - Funciona em todos os devices
✅ **Data-testid** - Todos os elementos testáveis
✅ **Sem dependências externas** - Apenas dados locais
✅ **Integração completa** - Com o pipeline de orquestração

---

## 📱 Navegação

### Menu Sugerido
Adicione à barra lateral/navegação:
```
📊 Logs de Orquestração
└─ /app/ai/logs
```

### Breadcrumb
```
Home / AI / Logs
Home / AI / Logs / #{id}
```

---

## 🚀 Próximos Passos (Opcionais)

1. **Export** - Adicionar botão para exportar logs (CSV/JSON)
2. **Filtros** - Filtrar por status, prioridade, duração
3. **Busca** - Buscar por demandId ou workflow
4. **Gráficos** - Dashboard com gráficos de performance
5. **Alerts** - Notificações de erros/gargalos
6. **Retry** - Botão para reexecutar uma orquestração

---

## ✅ Checklist de Implementação

- [x] Página `/app/ai/logs` - Lista de execuções
- [x] Página `/app/ai/logs/:id` - Detalhes completos
- [x] API `GET /api/ai/logs` - Listar com paginação
- [x] API `GET /api/ai/logs/:executionId` - Detalhes
- [x] Rotas registradas em App.tsx
- [x] Componentes e styling completos
- [x] Data-testid em todos os elementos
- [x] Auto-refresh funcionando
- [x] Responsividade móvel/tablet/desktop
- [x] Error handling completo
- [x] Sem menção a ferramentas externas
- [x] Dados persistidos corretamente
- [x] Integração com orchestration endpoint

---

## 📖 Documentação de Referência

Para mais detalhes sobre os endpoints de orquestração, veja:
- `ORCHESTRATION_ENDPOINT.md` - Endpoint `/api/ai/orchestrate`
- `LANGGRAPH_ORCHESTRATION.md` - Detalhes do pipeline LangGraph
- `LANGSMITH_TELEMETRY.md` - Telemetry backend (não exposto no UI)

---

**Pronto para usar! 🎉**
