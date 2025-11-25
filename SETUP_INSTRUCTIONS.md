# JWT OAuth2 Setup Instructions

Complete step-by-step guide to set up the Google OAuth2 authentication system with JWT tokens and Redis.

## Quick Start

### 1. Install Dependencies
All dependencies are already installed. If needed:
```bash
npm install redis jose google-auth-library cookie-parser
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Update with your actual values:
```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@neon.tech/database

# Redis (for refresh tokens)
REDIS_URL=redis://localhost:6379

# Google OAuth Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# JWT Secret (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SIGNING_KEY=your-super-secret-key-here

# URLs
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
PORT=5000
```

### 3. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Choose "Web application"
6. Add Authorized redirect URIs:
   - **Development**: `http://localhost:5000/api/auth/google/callback`
   - **Production**: `https://yourdomain.com/api/auth/google/callback`
7. Copy Client ID and Client Secret to `.env`

### 4. Set Up Database

Run migrations to add new fields to users and tenants tables:
```bash
npm run db:push
```

This adds:
- `is_configured` field to `tenants` table
- `metadata` field to `tenants` table

### 5. Start Services

**Terminal 1 - Redis:**
```bash
redis-server
```

**Terminal 2 - Backend:**
```bash
npm run dev
```

**Terminal 3 - Frontend** (optional, if developing frontend):
```bash
cd client && npm run dev
```

### 6. Test the System

1. Open http://localhost:5173 (frontend) or http://localhost:5000 (backend with static assets)
2. Click "Continue with Google"
3. Authorize the application
4. You should be redirected to onboarding page
5. Configure your workspace
6. You should be redirected to `/app`

## Architecture Overview

### Authentication Flow
```
User → Login Page → Google OAuth → Backend Callback → Create User/Tenant
                                        ↓
                              Emit JWT + Refresh Token
                                        ↓
                              Set httpOnly Cookies
                                        ↓
                              Redirect to /app or /onboarding
```

### Key Files

**Backend:**
- `server/routes/authRoutes.ts` - OAuth2 endpoints
- `server/lib/googleOAuth.ts` - Google OAuth2 client
- `server/lib/jwt.ts` - JWT signing/verification
- `server/lib/authService.ts` - User/tenant management
- `server/lib/redisClient.ts` - Redis refresh token storage
- `server/middleware/jwtMiddleware.ts` - JWT validation

**Frontend:**
- `client/src/pages/Login.tsx` - Login page
- `client/src/pages/Onboarding.tsx` - Workspace setup
- `client/src/hooks/useAuth.ts` - Auth state management

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google` | Start OAuth flow |
| GET | `/api/auth/google/callback` | OAuth callback (auto-redirect) |
| POST | `/api/auth/refresh` | Get new tokens |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/session` | Get current session |

### Protected Endpoints (require auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tenant/update` | Update workspace config |

## Security Features

- **CSRF Protection**: State parameter validation
- **Secure Cookies**: httpOnly, Secure, SameSite=strict
- **Token Rotation**: Refresh tokens rotated on each use
- **JWT Expiry**: Access tokens expire in 15 minutes
- **Role-Based Access**: user role tracked in token

## Troubleshooting

### "Failed to get tokens"
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Verify callback URL in Google Cloud Console matches `GOOGLE_CALLBACK_URL`

### "Invalid state parameter"
- Cookies might be disabled
- Clear browser cookies and try again
- Check Chrome DevTools → Application → Cookies

### "Redis connection failed"
- Ensure Redis is running: `redis-server`
- Check `REDIS_URL` is correct
- On macOS: `brew services start redis`

### "Invalid or expired token"
- Access token expires in 15 minutes
- Use refresh token to get new access token
- Clear browser cookies if issues persist

### "User not found after login"
- Check database: `SELECT * FROM users WHERE google_id = '...'`
- Check `DATABASE_URL` is correct
- Run `npm run db:push` again

## Testing with curl

### Start OAuth flow
```bash
curl -L http://localhost:5000/api/auth/google
```

### Refresh token
```bash
curl -X POST http://localhost:5000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -b "refresh_token=your-token-here"
```

### Get session
```bash
curl http://localhost:5000/api/auth/session \
  -b "access_token=your-token-here"
```

### Logout
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -b "refresh_token=your-token-here"
```

## Production Deployment

Before deploying to production:

1. **Update Environment Variables**
   - Use strong `JWT_SIGNING_KEY` (32+ random characters)
   - Update `GOOGLE_CALLBACK_URL` to production domain
   - Update `FRONTEND_URL` to production domain
   - Set `NODE_ENV=production`

2. **Database Migration**
   - Run `npm run db:push` on production database
   - Verify new fields exist

3. **Redis Setup**
   - Use Redis service like Upstash or AWS ElastiCache
   - Update `REDIS_URL` with production instance

4. **SSL/HTTPS**
   - All cookies will have `secure` flag in production
   - Ensure HTTPS is configured

5. **Rate Limiting** (optional)
   - Consider adding rate limiting to auth endpoints
   - Protect against brute force attacks

6. **Monitoring**
   - Monitor Redis memory usage
   - Check for stale refresh tokens (should auto-expire)
   - Log authentication events

## Next Steps

1. **Test complete login flow**
   - Verify user creation in database
   - Verify tenant creation
   - Verify tokens in browser cookies

2. **Customize onboarding**
   - Add logo upload
   - Add team member invitations
   - Add workspace preferences

3. **Add role management**
   - Implement invite system for team members
   - Add role assignment UI
   - Implement role-based access control across app

4. **Enhance security**
   - Add rate limiting
   - Add audit logging
   - Add 2FA support

## Support

For issues or questions:
1. Check `JWT_OAUTH_IMPLEMENTATION.md` for detailed documentation
2. Review API endpoint documentation
3. Check browser console and server logs
4. Verify environment variables are set correctly
