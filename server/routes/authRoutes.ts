import { Router, Request, Response } from 'express';
import { getAuthUrl, getTokensFromCode, getProfileFromIdToken, getUserInfoFromAccessToken } from '../lib/googleOAuth';
import { createOrUpdateUserFromGoogle, ensureTenantForUser, issueTokensForUser } from '../lib/authService';
import { deleteRefreshToken, getRefreshToken, setRefreshToken } from '../lib/redisClient';
import { jwtMiddleware, requireAuth } from '../middleware/jwtMiddleware';
import { signAccessToken } from '../lib/jwt';
import { randomUUID } from 'crypto';
import { storage } from '../storage';
import { users, tenants, tenantUsers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/auth/google
 * Initiates OAuth2 flow - redirects to Google consent screen
 */
router.get('/auth/google', (req: Request, res: Response) => {
  try {
    console.log('[OAUTH INITIATE] Starting Google OAuth flow');
    const state = randomUUID();
    res.cookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    // Get callback URL - use appropriate env var for environment
    const callbackUrl = process.env.NODE_ENV === 'production' 
      ? (process.env.GOOGLE_CALLBACK_URL || 'https://your-production-url.com/api/auth/google/callback')
      : (process.env.GOOGLE_CALLBACK_URL_DEV || 'http://localhost:5000/api/auth/google/callback');
    console.log('[OAUTH INITIATE] Using callback URL:', callbackUrl);

    const authUrl = getAuthUrl(state, callbackUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

/**
 * GET /api/auth/google/callback
 * OAuth2 callback - exchanges code for tokens and creates/updates user
 */
router.get('/auth/google/callback', async (req: Request, res: Response) => {
  try {
    console.log('[OAUTH CALLBACK] Starting callback handler');
    const { code, state } = req.query;
    const oauthState = (req as any).cookies?.oauth_state;

    if (!code) {
      console.error('[OAUTH CALLBACK] Missing authorization code');
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    // Verify state for CSRF protection
    if (state && oauthState && state !== oauthState) {
      console.error('[OAUTH CALLBACK] Invalid state parameter');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    // Exchange code for tokens - use appropriate env var for environment
    const cbUrl = process.env.NODE_ENV === 'production'
      ? (process.env.GOOGLE_CALLBACK_URL || 'https://your-production-url.com/api/auth/google/callback')
      : (process.env.GOOGLE_CALLBACK_URL_DEV || 'http://localhost:5000/api/auth/google/callback');
    console.log('[OAUTH CALLBACK] Exchanging code for tokens with callback URL:', cbUrl);
    const tokens = await getTokensFromCode(code as string, cbUrl);
    if (!tokens.id_token && !tokens.access_token) {
      console.error('[OAUTH CALLBACK] Failed to get tokens');
      return res.status(400).json({ error: 'Failed to get tokens' });
    }

    // Get user profile
    let profile;
    if (tokens.id_token) {
      console.log('[OAUTH CALLBACK] Verifying ID token');
      profile = await getProfileFromIdToken(tokens.id_token);
    } else if (tokens.access_token) {
      console.log('[OAUTH CALLBACK] Fetching user info from access token');
      profile = await getUserInfoFromAccessToken(tokens.access_token);
    } else {
      console.error('[OAUTH CALLBACK] No id_token or access_token');
      return res.status(400).json({ error: 'Could not retrieve user profile' });
    }

    console.log('[OAUTH CALLBACK] Got profile:', profile.email);

    // Create or update user
    console.log('[OAUTH CALLBACK] Creating/updating user');
    const user = await createOrUpdateUserFromGoogle(profile);
    console.log('[OAUTH CALLBACK] User created/updated:', user.id);

    // Ensure user has a tenant
    console.log('[OAUTH CALLBACK] Ensuring user has tenant');
    const { tenant, isNew } = await ensureTenantForUser(user);
    console.log('[OAUTH CALLBACK] Tenant:', tenant.id, 'isNew:', isNew, 'isConfigured:', tenant.isConfigured);

    // Get tenant user role
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, user.id))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    const role = tenantUser?.role || 'member';

    // Issue tokens
    console.log('[OAUTH CALLBACK] Issuing tokens');
    const tokenResponse = await issueTokensForUser(user, tenant, role);

    // Set secure httpOnly cookies
    console.log('[OAUTH CALLBACK] Setting cookies');
    res.cookie('access_token', tokenResponse.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', tokenResponse.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.clearCookie('oauth_state');

    // Redirect to frontend - use the same host the request came from
    const host = req.get('host');
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const baseUrl = `${protocol}://${host}`;
    console.log('[OAUTH CALLBACK] Redirect decision:', {
      isNew,
      tenantIsConfigured: tenant.isConfigured,
      condition: `isNew=${isNew} && tenant.isConfigured !== 'true' = ${isNew && tenant.isConfigured !== 'true'}`,
      baseUrl
    });
    const redirectUrl = isNew && tenant.isConfigured !== 'true'
      ? `${baseUrl}/onboarding?tenant=${tenant.id}`
      : `${baseUrl}/app/demands`;

    console.log('[OAUTH CALLBACK] Redirecting to:', redirectUrl);
    res.status(302).redirect(redirectUrl);
  } catch (error) {
    console.error('[OAUTH CALLBACK] Error:', error);
    res.status(500).json({ error: 'OAuth callback failed', details: String(error) });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/auth/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = (req as any).cookies?.refresh_token || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Missing refresh token' });
    }

    // Validate refresh token
    const tokenData = await getRefreshToken(refreshToken);
    if (!tokenData) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const { userId, tenantId } = tokenData;

    // Get user and tenant
    const user = await storage.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const tenant = await storage.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenant) {
      return res.status(401).json({ error: 'Tenant not found' });
    }

    // Get user role in tenant
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    const role = tenantUser?.role || 'member';

    // Issue new token pair
    const newAccessToken = await signAccessToken({
      sub: userId,
      tenantId,
      role,
      email: user.email || '',
    });

    // Rotate refresh token
    const newRefreshTokenId = randomUUID();
    await setRefreshToken(newRefreshTokenId, userId, tenantId, 30);
    await deleteRefreshToken(refreshToken);

    // Set new cookies
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRefreshTokenId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshTokenId,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user - invalidate refresh token and clear cookies
 */
router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = (req as any).cookies?.refresh_token;

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('oauth_state');

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

/**
 * GET /api/auth/session
 * Get current session info
 */
router.get('/auth/session', jwtMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.json({ authenticated: false });
    }

    const user = await storage.db
      .select()
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    const tenant = await storage.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, req.user.tenantId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    res.json({
      authenticated: true,
      user: {
        id: user?.id,
        email: user?.email,
        name: user?.name,
        image: user?.image,
      },
      tenant: {
        id: tenant?.id,
        name: tenant?.name,
        isConfigured: tenant?.isConfigured === 'true',
      },
      role: req.user.role,
    });
  } catch (error) {
    console.error('Session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

export default router;
