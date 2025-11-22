# LangSmith Integration - Setup & Troubleshooting Guide

## 🎯 O que você deve ver no LangSmith

### 1. **Criar Projeto no LangSmith** (se ainda não existe)

1. Acesse: https://smith.langchain.com/
2. Faça login com sua conta LangChain
3. No menu lateral, clique em **Projects** (ou **Projetos**)
4. Clique em **+ New Project** (ou **+ Novo Projeto**)
5. Nome do projeto: `process-orchestration` (exatamente assim!)
6. Clique em **Create** (ou **Criar**)

### 2. **Obter a API Key**

1. Na página do LangSmith, clique no seu **Avatar** (canto superior direito)
2. Selecione **Settings** (ou **Configurações**)
3. Clique em **API Keys** (ou **Chaves de API**)
4. Clique em **+ New Key** (ou **+ Nova Chave**)
5. Copie a chave completa
6. **Nunca compartilhe esta chave!**

### 3. **Adicionar a Chave ao Replit**

1. No Replit, vá para **Secrets** (ícone de cadeado)
2. Clique em **+ New Secret**
3. **Key**: `LANGSMITH_API_KEY`
4. **Value**: (cole a chave copiada)
5. Clique em **Add**
6. **Reinicie o servidor** (ou toda a aplicação)

---

## ✅ Como Verificar se Está Funcionando

### **Opção 1: Ver nos Logs**

Abra a aba **Logs** (ou output do servidor) e procure por:

```
[LangSmith] Client initialized for project: process-orchestration
```

✅ Se ver isso = Configuração OK!

```
[LangSmith] LANGSMITH_API_KEY not configured
```

❌ Se ver isso = Chave não está configurada

---

### **Opção 2: Executar Agente e Verificar no LangSmith**

1. **Execute um agente** (crie uma demanda ou use a API):
   ```bash
   curl -X POST http://localhost:5000/api/agents/run \
     -H "Content-Type: application/json" \
     -d '{
       "agent_key": "bottleneck_ai",
       "payload": {
         "workflowId": "test-001",
         "demandId": "demand-001"
       }
     }'
   ```

2. **Vá ao LangSmith** e procure:
   - Project: `process-orchestration`
   - Trace: `bottleneck_ai`

---

## 🔍 O Que Você Deve Ver no LangSmith

### **Layout do Dashboard LangSmith**

```
LangSmith (smith.langchain.com)
├── Projects
│   └── process-orchestration  ← SEU PROJETO
│       ├── Traces (guia principal)
│       │   ├── bottleneck_ai      ← Traces de execução
│       │   ├── insights_ai        ← Traces de execução
│       │   ├── workflow_builder   ← Traces de execução
│       │   └── gargalo_detector   ← Traces de execução
│       │
│       ├── Runs
│       │   └── (Cada execução fica aqui)
│       │
│       └── Sessions
│           └── (Sessões de execução)
```

---

## 📊 O Que Aparece para Cada Agente

### **Exemplo: bottleneck_ai**

Você verá algo como:

```json
{
  "run_id": "abc123def456...",
  "name": "bottleneck_ai",
  "run_type": "agent",
  "start_time": "2025-11-22T18:13:16.855Z",
  "end_time": "2025-11-22T18:13:16.899Z",
  "duration": "44ms",
  "status": "success",
  "inputs": {
    "workflowId": "workflow-gargalo-001",
    "demandId": "demand-gargalo-001",
    "etapa_analisada": "Aprovação Jurídica",
    "cardsNaEtapa": 12
  },
  "outputs": {
    "success": true,
    "bottlenecks": [...],
    "summary": {...}
  },
  "metadata": {
    "userId": "supervisor",
    "demandId": "demand-gargalo-001",
    "areaId": "juridico",
    "agentKey": "bottleneck_ai",
    "duration": "44ms"
  }
}
```

---

## 🚨 Troubleshooting

### **Problema 1: Não vejo nada no LangSmith**

**Causa**: Chave pode estar incorreta ou não configurada

**Solução**:
1. Verifique os logs do Replit (procure por `[LangSmith]`)
2. Confirme que `LANGSMITH_API_KEY` está em **Secrets** (não em env vars)
3. Reinicie o servidor
4. Execute um agente novamente

---

### **Problema 2: Vejo os logs `LANGSMITH_RUN_CREATED` mas não aparece no LangSmith**

**Causa**: Projeto pode ter nome diferente

**Solução**:
1. No código, o projeto padrão é: `process-orchestration`
2. Verifique se o projeto existe no LangSmith com esse nome
3. Se tiver nome diferente, mude:
   - Opção A: Crie novo projeto chamado `process-orchestration`
   - Opção B: Edite `server/lib/langsmith-config.ts` e mude para seu nome

---

### **Problema 3: Posso mudar o nome do projeto?**

**Sim!** Edite este arquivo:

**server/lib/langsmith-config.ts**:
```typescript
export const langsmithConfig = {
  projectName: "MEU_PROJETO_CUSTOMIZADO",  // ← Mude aqui
  apiKey: process.env.LANGSMITH_API_KEY || "",
  endpoint: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
};
```

Depois reinicie o servidor.

---

## 📈 Monitorando seus Agentes

### **No Dashboard, você pode**:

1. **Ver duração de execução**
   - Clique em um trace
   - Veja "Duration" em ms

2. **Ver inputs e outputs**
   - Inputs: O que foi passado ao agente
   - Outputs: O resultado da execução

3. **Ver metadata**
   - userId, demandId, areaId
   - agentKey, status, timestamp

4. **Filtrar por agente**
   - Clique no filtro (funnel icon)
   - Selecione `run_type: "agent"`
   - Selecione o agente específico

---

## 🔄 Fluxo de Execução Completo

```
1. Servidor inicia
   └─> [LangSmith] Client initialized for project: process-orchestration

2. Você chama um agente (por API ou scheduler)
   └─> [AGENT:bottleneck_ai] STARTED
       └─> [AGENT:bottleneck_ai] LANGSMITH_RUN_CREATED
           └─> [Trace criado no LangSmith]

3. Agente executa
   └─> [AGENT:bottleneck_ai] HANDLER_EXECUTING

4. Agente completa
   └─> [AGENT:bottleneck_ai] COMPLETED_SUCCESS - {"duration":"44ms"}
       └─> [Trace finalizado no LangSmith com status: success]
```

---

## 🎯 Exemplos de Traces que você Verá

### **Trace 1: Gargalo Detectado**
```
Name: gargalo_detector
Duration: 44ms
Status: success
Inputs:
  - etapa_analisada: "Aprovação Jurídica"
  - cardsNaEtapa: 12
Outputs:
  - gargaloDetectado: true
  - severity_score: 35
  - gargalos: [...]
```

### **Trace 2: Insights Gerados**
```
Name: insights_ai
Duration: 105ms
Status: success
Inputs:
  - demanda_id: "final-test-001"
  - workflow_id: "workflow-final-001"
Outputs:
  - insights: [...]
  - analysis_quality: "muito_boa"
  - metrics: {...}
```

### **Trace 3: Workflow Criado**
```
Name: workflow_builder
Duration: 200ms
Status: success
Inputs:
  - demanda_id: "demand-001"
  - area: "juridico"
Outputs:
  - stages: [...]
  - total_sla: "216h"
  - stage_count: 5
```

---

## 📱 URL Rápida

Depois de configurado, acesse diretamente:

```
https://smith.langchain.com/o/<sua-org>/projects/process-orchestration
```

Lá você verá todos os traces em tempo real! 🚀

---

## ⚡ Quick Checklist

- [ ] Criei projeto `process-orchestration` no LangSmith?
- [ ] Gerei API Key do LangSmith?
- [ ] Configurei `LANGSMITH_API_KEY` em Secrets no Replit?
- [ ] Reiniciei o servidor?
- [ ] Vejo `[LangSmith] Client initialized` nos logs?
- [ ] Executei um agente?
- [ ] Vejo os traces no dashboard do LangSmith?

**Se tudo marcado = Funcionando perfeitamente! ✅**

