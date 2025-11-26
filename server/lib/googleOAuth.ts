import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

export const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

export interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Generate the OAuth2 authorization URL
 */
export function getAuthUrl(state?: string, redirectUri?: string): string {
  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  // Create a temporary client with the correct redirect URI for this request
  const client = new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    redirectUri || GOOGLE_REDIRECT_URI
  );

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state || undefined,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  try {
    console.log('[GOOGLE OAUTH] Exchanging code for tokens, code:', code.substring(0, 20) + '...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('[GOOGLE OAUTH] Got tokens:', { hasIdToken: !!tokens.id_token, hasAccessToken: !!tokens.access_token });
    return tokens;
  } catch (error) {
    console.error('[GOOGLE OAUTH] Error getting tokens from code:', error);
    throw error;
  }
}

/**
 * Get user profile from ID token or access token
 */
export async function getProfileFromIdToken(idToken: string): Promise<GoogleProfile> {
  try {
    console.log('[GOOGLE OAUTH] Verifying ID token with audience:', GOOGLE_CLIENT_ID);
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid token payload');

    console.log('[GOOGLE OAUTH] ID token verified, email:', payload.email);
    return {
      id: payload.sub!,
      email: payload.email!,
      name: payload.name || '',
      picture: payload.picture,
      given_name: payload.given_name,
      family_name: payload.family_name,
    };
  } catch (error) {
    console.error('[GOOGLE OAUTH] Error verifying ID token:', error);
    throw error;
  }
}

/**
 * Get user info from access token
 */
export async function getUserInfoFromAccessToken(accessToken: string): Promise<GoogleProfile> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) throw new Error('Failed to fetch user info');

    const userInfo = await response.json();
    return {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name || '',
      picture: userInfo.picture,
      given_name: userInfo.given_name,
      family_name: userInfo.family_name,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    throw error;
  }
}
