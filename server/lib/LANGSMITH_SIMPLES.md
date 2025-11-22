# LangSmith - Guia Simples (Sem Criar Projeto)

## 🎯 A Boa Notícia

**Você NÃO precisa criar projeto manualmente!**

O LangSmith cria automaticamente quando começa a rastrear execuções.

---

## ✅ O Que Fazer

### **Passo 1: Obter API Key (Único Passo Manual)**

1. Vá para: https://smith.langchain.com/
2. Clique em seu **Avatar** (canto superior direito)
3. Clique em **Settings** (ou **Configurações**)
4. Clique em **API Keys**
5. Copie sua chave (começa com `lsv2_`)

> ⚠️ **Aviso**: Você já tem uma chave configurada no Replit!
> 
> Confira: Em Replit → **Secrets** → `LANGSMITH_API_KEY`
> 
> Se estiver OK, vá pro Passo 2

---

### **Passo 2: Reiniciar Servidor**

No Replit, clique em **Run** (ou na aba **Logs**, clique em reiniciar).

Procure por:
```
[LangSmith] Client initialized for project: process-orchestration
```

✅ Se ver isso = Está conectado!

---

### **Passo 3: Executar Agente**

Crie uma demanda no app (ou use a API).

Procure no output:
```
[AGENT:bottleneck_ai] LANGSMITH_RUN_CREATED
```

---

### **Passo 4: Ver no LangSmith**

Vá para: https://smith.langchain.com/

**No menu lateral**, procure por:
- **Projects** → **process-orchestration**

Se não aparecer ainda, espere 30 segundos e recarregue (F5).

> 💡 **Dica**: O projeto aparece automaticamente após a primeira execução!

---

## 🔍 Onde Ver os Dados

### **Se conseguir ver o projeto:**

1. Clique em **process-orchestration**
2. Clique em **Traces** (guia principal)
3. Veja os traces:
   - bottleneck_ai
   - insights_ai
   - workflow_builder
   - gargalo_detector

### **Se o projeto não aparecer:**

- Espere 1-2 minutos (às vezes demora)
- Recarregue a página (F5)
- Execute outro agente
- Verifique se a API Key está correta

---

## 🚨 Se Ainda Não Ver Nada

### **Verificar Chave**

No Replit, vá em **Secrets** e confirme:
- **Key**: `LANGSMITH_API_KEY`
- **Value**: Começa com `lsv2_`

Se está vazio ou errado:
1. Vá a https://smith.langchain.com/
2. Avatar → Settings → API Keys
3. Gere nova chave (clique em **+ New Key**)
4. Copie a chave
5. No Replit: Secrets → edite `LANGSMITH_API_KEY`
6. Cole a nova chave
7. Reinicie servidor

### **Verificar Projeto**

Após executar agente, vá a:
```
https://smith.langchain.com/projects
```

Procure por `process-orchestration` na lista.

Se não aparecer em 2 minutos:
- Recarregue a página (F5 / Cmd+R)
- Ou execute outro agente
- Ou aguarde até 5 minutos

---

## 📋 Checklist Rápido

- [ ] Tenho API Key do LangSmith (começa com `lsv2_`)
- [ ] Configurei em Replit → Secrets → `LANGSMITH_API_KEY`
- [ ] Reiniciei o servidor
- [ ] Vejo `[LangSmith] Client initialized` nos logs
- [ ] Executei pelo menos um agente
- [ ] Vejo `[AGENT:...] LANGSMITH_RUN_CREATED` nos logs
- [ ] Fui a https://smith.langchain.com/projects
- [ ] Vi projeto `process-orchestration`

**Se tudo OK = Funcionando!** ✅

---

## 💡 Resumo

```
1. Sua API Key já está configurada
2. Reinicie o servidor
3. Execute um agente (crie demanda)
4. Vá a smith.langchain.com
5. Procure por "process-orchestration"
6. Clique e veja os traces!

É isso!
```

---

## 📱 URLs Úteis

- **Dashboard**: https://smith.langchain.com/
- **Projetos**: https://smith.langchain.com/projects
- **Settings**: https://smith.langchain.com/settings
- **API Keys**: https://smith.langchain.com/settings/api-keys

