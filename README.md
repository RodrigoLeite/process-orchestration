# Central de Demandas IA

Sistema inteligente de classificação e roteamento de demandas entre departamentos usando IA (GPT-4).

## 🚀 Quick Start

### No Replit (Recomendado)

1. Clique no botão **Run** (canto superior)
2. Aguarde a compilação e inicialização
3. Acesse `http://localhost:5000` no navegador

### Localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm build

# Iniciar em produção
npm start
```

## 📋 Requisitos de Ambiente

Adicione as seguintes variáveis de ambiente no **Replit Secrets** (cadeado na barra lateral):

```
VITE_OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

Ou use variáveis de ambiente locais em `.env.local`:

```env
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=postgresql://user:pass@host:port/db
VITE_OPENAI_API_KEY=sk-proj-...
```

## 🏗️ Arquitetura

```
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/         # Páginas (Home, Demands, AllDemands)
│   │   ├── components/    # Componentes React
│   │   └── lib/           # Utilidades e tipos
│   └── index.html         # Template HTML
│
├── server/                # Backend (Express)
│   ├── routes.ts          # Rotas da API
│   ├── storage.ts         # Camada de dados (Drizzle ORM)
│   ├── parse-demand.ts    # Classificação IA
│   └── lib/
│       └── logger.ts      # Middleware de logging
│
├── shared/                # Código compartilhado
│   └── schema.ts          # Schema do banco (Drizzle)
│
└── package.json           # Scripts e dependências
```

## 🔌 Endpoints API

### POST /api/parse-demand
Classifica uma demanda usando IA

**Request:**
```json
{
  "text": "Precisamos ativar o novo cliente ACME..."
}
```

**Response:**
```json
{
  "id": "uuid-aqui",
  "parsed": {
    "area": "Vendas",
    "tipo": "solicitação",
    "prioridade": "alta",
    "descricao_estruturada": "...",
    "sugestao_proximo_passo": "..."
  },
  "route_to": "vendas"
}
```

### GET /api/demands
Lista todas as demandas

### PATCH /api/demands/:id
Atualiza status de uma demanda

```json
{
  "status": "in_progress"
}
```

## 📊 Banco de Dados

O projeto usa **PostgreSQL** com **Drizzle ORM**.

### Tabelas

- **demands**: Demandas com classificação IA
- **logs**: Histórico de requisições e erros
- **users**: Usuários (estrutura base)

### Migrações

```bash
# Aplicar schema
npm run db:push

# Forçar aplicação
npm run db:push --force
```

## 🎨 Design

- **Frontend**: React 19 + Tailwind CSS
- **UI Components**: shadcn/ui
- **Roteamento**: Wouter (lightweight router)
- **Gerenciamento de estado**: TanStack Query

## ✨ Funcionalidades

- ✅ Classificação automática de demandas com IA
- ✅ Roteamento inteligente para departamentos
- ✅ Gestão de status (pendente → roteado → em andamento → concluído)
- ✅ Logging de requisições e erros
- ✅ Visualização de demandas por departamento
- ✅ Dashboard em tempo real

## 🛠️ Scripts Disponíveis

```bash
npm run dev          # Dev (frontend + backend)
npm run build        # Build para produção
npm start            # Rodar em produção
npm run db:push      # Aplicar schema do banco
npm run check        # Type-check TypeScript
```

## 📝 Estrutura de Pastas

```
client/src/
├── pages/
│   ├── home.tsx           # Página inicial
│   ├── demands.tsx        # Criar demanda
│   ├── all-demands.tsx    # Visualizar todas
│   └── not-found.tsx      # 404
├── components/
│   ├── layout.tsx         # Layout principal
│   └── ui/                # Componentes shadcn
├── lib/
│   ├── supabase.ts        # Cliente Supabase
│   ├── types.ts           # Tipos TypeScript
│   ├── parse-demand.ts    # Classificação IA (client)
│   └── utils.ts           # Utilidades
└── index.css              # Tailwind + estilos

server/
├── routes.ts              # Rotas Express
├── storage.ts             # ORM + CRUD
├── parse-demand.ts        # IA (servidor)
├── lib/logger.ts          # Logging
├── app.ts                 # Setup Express
└── index-*.ts             # Entry points
```

## 🚨 Troubleshooting

### "Port 5000 já está em uso"
```bash
lsof -i :5000
kill -9 <PID>
```

### "OpenAI API error"
- Verifique se `OPENAI_API_KEY` está configurada nos Secrets
- Certifique-se de que tem créditos na OpenAI

### "Database connection failed"
- Verifique se `DATABASE_URL` está correto
- Teste a conexão com `npm run db:push`

## 📚 Recursos

- [Vite Docs](https://vitejs.dev/)
- [Express Docs](https://expressjs.com/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Tailwind CSS](https://tailwindcss.com/)
- [OpenAI API](https://platform.openai.com/docs)

## 📄 Licença

MIT
