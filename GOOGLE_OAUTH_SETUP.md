# Google OAuth Implementation Guide

## Overview

Google OAuth authentication has been integrated into the system with multi-tenant support. Users can now sign in with their Google account, and a personal tenant is automatically created for first-time users.

## Architecture

### Key Components

1. **Authentication Middleware** (`server/middleware/authMiddleware.ts`)
   - Configures Passport.js with Google OAuth 2.0 Strategy
   - Sets up Express session management with PostgreSQL store
   - Manages user serialization/deserialization

2. **Auth Storage** (`server/lib/authStorage.ts`)
   - `createOrUpdateGoogleUser()` - Creates or updates users from Google profile

3. **Auth Routes** (`server/routes/auth.ts`)
   - `POST /api/auth/google` - Initiates OAuth flow
   - `GET /api/auth/google/callback` - OAuth callback handler
   - `GET /api/auth/logout` - Logs user out
   - `GET /api/auth/session` - Returns current session info
   - `POST /api/auth/switch-tenant` - Switches active tenant for user

4. **Login Page** (`client/src/pages/login.tsx`)
   - Simple login interface with Google button
   - Redirects to dashboard after successful login
   - Shows error messages if login fails

5. **Tenant Switcher** (`client/src/components/tenant-switcher.tsx`)
   - Displays user's accessible tenants
   - Allows switching between tenants
   - Shows user profile and logout option

### Database Schema

The `users` table has been updated to support OAuth:

```typescript
users:
  - id: UUID (primary key)
  - email: string (unique)
  - name: string (nullable, from Google profile)
  - googleId: string (nullable, Google user ID)
  - image: string (nullable, Google profile picture)
```

Sessions are stored in the `session` table managed by `connect-pg-simple`.

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Process Orchestration System")
3. Enable the Google+ API
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" > "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add Authorized redirect URIs:
     - Development: `http://localhost:5000/api/auth/google/callback`
     - Production: `https://yourdomain.com/api/auth/google/callback`
   - Copy the Client ID and Client Secret

### 2. Environment Variables

Set the following environment variables (use the Secrets tab in Replit):

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
SESSION_SECRET=generate_a_secure_random_string_here
```

**To generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Database Migration

Run the migration to ensure database schema is updated:

```bash
npm run db:push
```

This applies migrations including the `session` table for storing Express sessions.

### 4. Starting the Application

```bash
npm run dev
```

The app should now:
- Show a login page at `/login`
- Display a Google login button
- Redirect authenticated users to `/dashboard`
- Allow tenant switching via the tenant switcher component

## User Flow

### First Login
1. User visits `/login`
2. Clicks "Login with Google"
3. Redirected to Google OAuth consent screen
4. After consent, redirected back to callback URL
5. System creates:
   - User record in `users` table
   - Personal tenant in `tenants` table
   - Tenant membership in `tenant_users` table with "owner" role
6. User automatically logged in and redirected to dashboard

### Subsequent Logins
1. User's session is retrieved from `session` table
2. User automatically logged in if session exists
3. Dashboard displayed with their tenants

### Multi-Tenant Switching
1. User clicks tenant switcher component (top-left corner)
2. Selects different tenant they have access to
3. API call updates active tenant via `POST /api/auth/switch-tenant`
4. Dashboard reloads with selected tenant's data

## API Endpoints

All endpoints use standard HTTP methods. Session is maintained via HTTP-only cookies.

### Auth Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/google` | POST | Initiates Google OAuth flow |
| `/api/auth/google/callback` | GET | OAuth callback from Google |
| `/api/auth/logout` | GET | Logs user out and destroys session |
| `/api/auth/session` | GET | Returns current user and tenant info |
| `/api/auth/switch-tenant` | POST | Switches active tenant |

### Session Response Format

```typescript
{
  authenticated: boolean,
  user?: {
    id: string,
    email: string,
    name: string,
    image: string
  },
  tenant?: {
    id: string,
    name: string,
    plan: string
  },
  role?: "owner" | "admin" | "manager" | "member" | "readonly"
}
```

## Security Features

1. **Session Management**
   - HTTP-only cookies (not accessible via JavaScript)
   - PostgreSQL-backed session store for persistence
   - Automatic session timeout (configurable)

2. **Multi-Tenant Isolation**
   - Users can only access data from their tenants
   - Role-based access control (RBAC) enforced
   - `tenantMiddleware` injects tenant context from `x-tenant-id` header

3. **Audit Logging**
   - All authentication events are logged to `audit_logs` table
   - Tracks user logins, tenant switches, and other auth actions

## Troubleshooting

### Issue: "Missing GOOGLE_CLIENT_ID"
- Check that environment variables are set in Replit Secrets
- Ensure names exactly match: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

### Issue: "OAuth callback failed"
- Verify callback URL in Google Console matches `GOOGLE_CALLBACK_URL` env var
- For production: ensure HTTPS URL is registered

### Issue: Session not persisting
- Check `session` table exists: `SELECT * FROM session;`
- Verify DATABASE_URL is set correctly
- Check that Express session middleware is initialized before routes

### Issue: User created but not logged in
- Check browser cookies for session ID
- Verify session store is accessible to server
- Check auth middleware order in `server/app.ts`

## Frontend Integration

### Login Page Component
Located at `client/src/pages/login.tsx` - displayed at `/login` route

### Tenant Switcher Component
Located at `client/src/components/tenant-switcher.tsx` - embedded in Layout

### Protected Routes
All routes except `/login` require authentication. Routes are protected in:
- Frontend: `client/src/App.tsx` - Layout wraps protected routes
- Backend: `authMiddleware` in `server/middleware/authMiddleware.ts`

## Next Steps

1. Set up Google OAuth credentials in Google Cloud Console
2. Configure environment variables with credentials
3. Run database migrations
4. Start the application
5. Test login flow with Google account
6. Verify tenant switching works correctly

## Configuration Reference

### Passport Strategy Options
Edit `server/middleware/authMiddleware.ts` to modify:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `callbackURL`

### Session Store Options
Edit `server/app.ts` to modify:
- Session cookie settings
- Session timeout
- PostgreSQL session store configuration

### Multi-Tenant Defaults
Set `DEFAULT_TENANT_ID` env var to use non-standard UUID (default: `00000000-0000-0000-0000-000000000000`)

## Monitoring

Check `audit_logs` table for authentication events:
```sql
SELECT * FROM audit_logs 
WHERE entity_type = 'user' 
ORDER BY created_at DESC 
LIMIT 20;
```

Check active sessions:
```sql
SELECT * FROM session;
```
