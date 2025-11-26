import { createClient } from 'redis';

let redisClient: any;
let useInMemory = false;

// In-memory fallback storage for development
const inMemoryStore = new Map<string, { value: string; expiresAt: number }>();

export async function getRedisClient() {
  if (!redisClient) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    try {
      redisClient = createClient({
        url: REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
          connectTimeout: 3000,
        },
      });

      redisClient.on('error', (err: any) => {
        console.error('Redis Client Error', err);
        useInMemory = true;
      });
      redisClient.on('connect', () => {
        console.log('Connected to Redis');
        useInMemory = false;
      });

      await redisClient.connect();
    } catch (error) {
      console.warn('Redis unavailable, using in-memory storage:', error);
      useInMemory = true;
      redisClient = null;
    }
  }

  return redisClient;
}

export async function setRefreshToken(
  refreshTokenId: string,
  userId: string,
  tenantId: string,
  expiresInDays = 30
): Promise<void> {
  if (useInMemory) {
    const key = `refresh:${refreshTokenId}`;
    const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
    const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
    inMemoryStore.set(key, { value, expiresAt });
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client) {
      // Fallback to in-memory if Redis unavailable
      const key = `refresh:${refreshTokenId}`;
      const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
      const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
      inMemoryStore.set(key, { value, expiresAt });
      return;
    }
    
    const key = `refresh:${refreshTokenId}`;
    const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
    const ttl = expiresInDays * 24 * 60 * 60; // Convert to seconds
    await client.setEx(key, ttl, value);
  } catch (error) {
    console.warn('Failed to set refresh token in Redis, using in-memory:', error);
    const key = `refresh:${refreshTokenId}`;
    const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
    const expiresAt = Date.now() + (expiresInDays * 24 * 60 * 60 * 1000);
    inMemoryStore.set(key, { value, expiresAt });
  }
}

export async function getRefreshToken(refreshTokenId: string): Promise<{ userId: string; tenantId: string } | null> {
  const key = `refresh:${refreshTokenId}`;
  
  // Check in-memory store first
  if (useInMemory || inMemoryStore.has(key)) {
    const stored = inMemoryStore.get(key);
    if (!stored) return null;
    
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

  try {
    const client = await getRedisClient();
    if (!client) {
      const stored = inMemoryStore.get(key);
      if (!stored) return null;
      
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
    
    const value = await client.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  } catch (error) {
    console.warn('Failed to get refresh token from Redis, checking in-memory:', error);
    const stored = inMemoryStore.get(key);
    if (!stored) return null;
    
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
}

export async function deleteRefreshToken(refreshTokenId: string): Promise<void> {
  const key = `refresh:${refreshTokenId}`;
  
  // Delete from in-memory store
  inMemoryStore.delete(key);
  
  try {
    const client = await getRedisClient();
    if (client) {
      await client.del(key);
    }
  } catch (error) {
    console.warn('Failed to delete refresh token from Redis:', error);
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
