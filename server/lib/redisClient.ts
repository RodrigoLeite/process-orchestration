import { createClient } from 'redis';

let redisClient: any;
let useInMemory = true; // Default to in-memory
let clientInitialized = false;
let redisErrorLogged = false;

// In-memory fallback storage for development
const inMemoryStore = new Map<string, { value: string; expiresAt: number }>();

export function initializeRedisClient() {
  if (clientInitialized) return;
  clientInitialized = true;

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        connectTimeout: 1000,
      },
    });

    redisClient.on('error', (err: any) => {
      if (!redisErrorLogged) {
        console.log('Redis unavailable, using in-memory storage for session tokens');
        redisErrorLogged = true;
      }
      useInMemory = true;
    });
    
    redisClient.on('connect', () => {
      console.log('Connected to Redis');
      useInMemory = false;
      redisErrorLogged = false;
    });

    // Try to connect in the background (non-blocking)
    redisClient.connect().catch(() => {
      if (!redisErrorLogged) {
        console.log('Redis unavailable, using in-memory storage for session tokens');
        redisErrorLogged = true;
      }
      useInMemory = true;
    });
  } catch (error) {
    console.log('Redis unavailable, using in-memory storage for session tokens');
    useInMemory = true;
    redisClient = null;
  }
}

export async function setRefreshToken(
  refreshTokenId: string,
  userId: string,
  tenantId: string,
  expiresInDays = 30
): Promise<void> {
  const key = `refresh:${refreshTokenId}`;
  const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
  const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
  
  // Always store in-memory
  inMemoryStore.set(key, { value, expiresAt });
  
  // Try to also store in Redis if available
  if (!useInMemory && redisClient) {
    try {
      const ttl = expiresInDays * 24 * 60 * 60;
      await redisClient.setEx(key, ttl, value);
    } catch (error) {
      console.warn('Failed to set refresh token in Redis, but in-memory backup exists');
    }
  }
}

export async function getRefreshToken(refreshTokenId: string): Promise<{ userId: string; tenantId: string } | null> {
  const key = `refresh:${refreshTokenId}`;
  
  // Always check in-memory store
  const stored = inMemoryStore.get(key);
  if (stored) {
    // Check if expired
    if (stored.expiresAt < Date.now()) {
      inMemoryStore.delete(key);
      return null;
    }
    
    try {
      return JSON.parse(stored.value);
    } catch {
      return null;
    }
  }
  
  // If not in-memory and Redis is available, try Redis
  if (!useInMemory && redisClient) {
    try {
      const value = await redisClient.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
    } catch (error) {
      console.warn('Failed to get refresh token from Redis');
    }
  }
  
  return null;
}

export async function deleteRefreshToken(refreshTokenId: string): Promise<void> {
  const key = `refresh:${refreshTokenId}`;
  
  // Delete from in-memory store
  inMemoryStore.delete(key);
  
  // Try to delete from Redis if available
  if (!useInMemory && redisClient) {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.warn('Failed to delete refresh token from Redis');
    }
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
