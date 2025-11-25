# JWT OAuth2 Implementation Guide

Este documento descreve a implementação completa de autenticação com Google OAuth2 usando JWT tokens e Redis para refresh tokens.

## Arquitetura

```
Frontend (Vite + React)
├── Login Page (/login)
│   └── Botão "Continue with Google"
├── Onboarding Page (/onboarding)
│   └── Configure workspace
└── useAuth Hook
    └── Gerencia sessão do usuário

Backend (Express + TypeScript)
├── Google OAuth Routes (/api/auth/google)
│   ├── GET /api/auth/google → redirect para Google
│   ├── GET /api/auth/google/callback → troca code por tokens
│   ├── POST /api/auth/refresh → rotate refresh token
│   ├── POST /api/auth/logout → invalida refresh token
│   └── GET /api/auth/session → retorna dados da sessão
├── Services
│   ├── googleOAuth.ts → cliente OAuth2
│   ├── jwt.ts → sign/verify tokens JWT
│   ├── redisClient.ts → wrapper Redis
│   └── authService.ts → business logic
└── Middleware
    ├── jwtMiddleware.ts → valida JWT
    └── Integrado em app.ts
```

## Setup

### 1. Variáveis de Ambiente

Crie um arquivo `.env` com:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/demands

# Redis (para refresh tokens)
REDIS_URL=redis://localhost:6379

# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SIGNING_KEY=sua-chave-super-secreta-aqui

# URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
PORT=5000
```

### 2. Setup do Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto
3. Ative "Google+ API"
4. Vá em "Credentials" → "Create OAuth 2.0 Client ID"
5. Escolha "Web application"
6. Adicione URIs autorizadas:
   - `http://localhost:5000/api/auth/google/callback` (desenvolvimento)
   - `https://seu-dominio.com/api/auth/google/callback` (produção)
7. Copie Client ID e Client Secret

### 3. Instale Dependências

As dependências já estão instaladas:
- `redis` - cliente Redis
- `jose` - JWT signing/verification
- `google-auth-library` - OAuth2 client
- `cookie-parser` - parsing de cookies

Se precisar reinstalar:
```bash
npm install redis jose google-auth-library cookie-parser
```

### 4. Database

A migração deve ser executada para adicionar os campos necessários:

```bash
npm run db:push
```

Isso criará:
- Campo `is_configured` em `tenants` table
- Campo `metadata` (opcional) em `tenants` table

## Fluxo de Autenticação

### Login Flow

1. **Usuário clica "Continue with Google"** na página de login
   ```
   GET /api/auth/google
   → Redireciona para Google consent screen
   ```

2. **Usuário autoriza a aplicação**
   - Google redireciona para `/api/auth/google/callback` com `code`

3. **Backend troca `code` por tokens**
   ```
   GET /api/auth/google/callback?code=...&state=...
   ```
   - Valida `state` (CSRF protection)
   - Chama Google API para trocar `code` por `id_token` e `access_token`
   - Extrai profile do `id_token`

4. **Cria ou atualiza usuário**
   - Procura usuário por `googleId`
   - Se não encontra, procura por `email`
   - Se não encontra, cria novo usuário

5. **Garante que usuário tem tenant**
   - Se novo usuário, cria `tenant` automático
   - Nome do tenant: "Workspace de {firstName}" ou prefixo do email
   - Cria `tenant_user` com role "owner"

6. **Emite tokens JWT**
   - Access token JWT com TTL 15 minutos
   - Refresh token UUID gerado e salvo no Redis com TTL 30 dias
   - Ambos salvos em httpOnly cookies

7. **Redireciona para frontend**
   - Se tenant não configurado: `/onboarding?tenant=<tenantId>`
   - Se tenant configurado: `/app`

### Refresh Token Flow

```
POST /api/auth/refresh
```

1. Cliente envia refresh token (do cookie)
2. Backend valida no Redis
3. Verifica se usuário e tenant ainda existem
4. Emite novo par de tokens
5. **Rotaciona** refresh token (cria novo, deleta antigo do Redis)
6. Atualiza cookies

### Logout Flow

```
POST /api/auth/logout
```

1. Deleta refresh token do Redis
2. Limpa cookies
3. Retorna sucesso

## Componentes

### Backend

#### `server/lib/googleOAuth.ts`
- `getAuthUrl()` - Gera URL para Google consent
- `getTokensFromCode()` - Troca authorization code por tokens
- `getProfileFromIdToken()` - Extrai profile do ID token
- `getUserInfoFromAccessToken()` - Fetch user info via access token

#### `server/lib/jwt.ts`
- `signAccessToken(payload)` - Assina JWT com 15 min TTL
- `verifyAccessToken(token)` - Verifica e decodifica JWT
- `decodeAccessToken(token)` - Decodifica sem verificar (unsafe, use apenas se necessário)

#### `server/lib/redisClient.ts`
- `getRedisClient()` - Retorna cliente Redis singleton
- `setRefreshToken()` - Salva refresh token com TTL
- `getRefreshToken()` - Recupera refresh token
- `deleteRefreshToken()` - Invalida refresh token

#### `server/lib/authService.ts`
- `createOrUpdateUserFromGoogle()` - Cria/atualiza usuário do Google profile
- `ensureTenantForUser()` - Garante que usuário tem pelo menos um tenant
- `issueTokensForUser()` - Emite JWT + refresh token

#### `server/middleware/jwtMiddleware.ts`
- `jwtMiddleware` - Middleware que valida JWT e popula `req.user`
- `requireAuth` - Middleware que requer autenticação
- `requireRole(role)` - Middleware que requer role específico

#### `server/routes/authRoutes.ts`
- `GET /api/auth/google` - Inicia OAuth
- `GET /api/auth/google/callback` - Callback do OAuth
- `POST /api/auth/refresh` - Refresh tokens
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Retorna sessão atual

### Frontend

#### `client/src/hooks/useAuth.ts`
```typescript
const { 
  session,        // { authenticated, user, tenant, role }
  isLoading,      // boolean
  isAuthenticated, // boolean
  user,           // User info
  tenant,         // Tenant info
  role,           // User role
  login,          // () => void - redireciona para Google
  logout,         // async () => void
} = useAuth();
```

Uso:
```tsx
import { useAuth } from '@/hooks/useAuth';

export function App() {
  const { isAuthenticated, login } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={login}>Login with Google</button>;
  }

  return <Dashboard />;
}
```

#### `client/src/pages/Login.tsx`
- Página de login com botão Google
- Redireciona para `/app` se já autenticado

#### `client/src/pages/Onboarding.tsx`
- Formulário para configurar workspace
- Chama `POST /api/tenant/update`
- Redireciona para `/app` após configuração

## Segurança

### Proteção CSRF
- `state` parameter armazenado em cookie com TTL 10 min
- Validado no callback

### Cookies Seguros
- `httpOnly` - Não acessível via JavaScript
- `secure` - Apenas HTTPS em produção
- `sameSite=strict` - Proteção CSRF adicional

### Token Expiration
- Access token: 15 minutos
- Refresh token: 30 dias (no Redis)

### Rotação de Refresh Token
- Refresh token é deletado do Redis ao usar `/api/auth/refresh`
- Novo refresh token é emitido
- Impede replay attacks

## Endpoints

### GET /api/auth/google
Inicia OAuth2 flow.

**Resposta**: Redireciona para Google consent screen

### GET /api/auth/google/callback
Callback do OAuth2. Cria usuário, tenant e emite tokens.

**Query params**:
- `code` - Authorization code do Google
- `state` - CSRF protection token

**Resposta**: Redireciona para `/app` ou `/onboarding`

**Cookies setados**:
- `access_token` - JWT com user info
- `refresh_token` - UUID para refresh
- `oauth_state` - Deletado

### POST /api/auth/refresh
Rotaciona refresh token e emite novo par.

**Body** (opcional):
```json
{
  "refreshToken": "uuid-string"
}
```

**Resposta**:
```json
{
  "accessToken": "jwt-string",
  "refreshToken": "new-uuid"
}
```

**Cookies setados**:
- `access_token` - Novo JWT
- `refresh_token` - Novo UUID

### POST /api/auth/logout
Invalida refresh token e limpa cookies.

**Resposta**:
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/session
Retorna informações de sessão atual.

**Headers**:
- `Authorization: Bearer <token>` (opcional)

**Resposta** (autenticado):
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "image": "https://..."
  },
  "tenant": {
    "id": "uuid",
    "name": "Workspace Name",
    "isConfigured": true
  },
  "role": "owner"
}
```

**Resposta** (não autenticado):
```json
{
  "authenticated": false
}
```

### POST /api/tenant/update
Atualiza informações do tenant (requer autenticação).

**Body**:
```json
{
  "tenantId": "uuid",
  "name": "New Workspace Name",
  "isConfigured": true
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Workspace Name",
    "isConfigured": "true",
    ...
  }
}
```

## Testando Localmente

1. **Inicie Redis**:
```bash
redis-server
```

2. **Configure .env**:
```bash
cp .env.example .env
# Adicione suas credenciais do Google
```

3. **Execute migrations**:
```bash
npm run db:push
```

4. **Inicie backend**:
```bash
npm run dev
```

5. **Inicie frontend** (em outro terminal):
```bash
npm run dev --prefix client
```

6. **Acesse**:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

7. **Teste login**:
- Clique em "Continue with Google"
- Autorize a aplicação
- Deve ser redirecionado para `/onboarding`
- Configure workspace
- Deve ser redirecionado para `/app`

## Troubleshooting

### "Missing GOOGLE_CLIENT_ID"
- Verificar se .env tem as variáveis
- Verificar se os valores estão corretos no Google Cloud Console

### "Invalid state parameter"
- Cookies estão desabilitados?
- Verificar configurações de SameSite do navegador

### "Failed to get tokens"
- Verificar GOOGLE_CLIENT_SECRET
- Verificar GOOGLE_CALLBACK_URL matches Google Cloud Console

### Refresh token inválido
- Redis está rodando?
- Verificar REDIS_URL
- Refresh token expirou (TTL 30 dias)?

### Sem reflex na interface
- Verificar console do navegador
- Verificar se JWT é válido: decode em jwt.io
- Verificar se cookies estão sendo setados

## Próximos Passos

1. **Adicionar email verification** se necessário
2. **Adicionar mais providers OAuth** (GitHub, Microsoft, etc.)
3. **Implementar 2FA** para segurança adicional
4. **Audit logging** de eventos de autenticação
5. **Rate limiting** no endpoints de autenticação

## Referências

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [jose Library](https://github.com/panva/jose)
- [Redis Node.js Client](https://github.com/redis/node-redis)
- [Express.js Cookies](https://expressjs.com/en/api/req.html#req.cookies)
