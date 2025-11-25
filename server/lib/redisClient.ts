import { createClient } from 'redis';

let redisClient: any;

export async function getRedisClient() {
  if (!redisClient) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
    redisClient.on('connect', () => console.log('Connected to Redis'));

    await redisClient.connect();
  }

  return redisClient;
}

export async function setRefreshToken(
  refreshTokenId: string,
  userId: string,
  tenantId: string,
  expiresInDays = 30
): Promise<void> {
  const client = await getRedisClient();
  const key = `refresh:${refreshTokenId}`;
  const value = JSON.stringify({ userId, tenantId, createdAt: new Date().toISOString() });
  const ttl = expiresInDays * 24 * 60 * 60; // Convert to seconds
  
  await client.setEx(key, ttl, value);
}

export async function getRefreshToken(refreshTokenId: string): Promise<{ userId: string; tenantId: string } | null> {
  const client = await getRedisClient();
  const key = `refresh:${refreshTokenId}`;
  const value = await client.get(key);
  
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function deleteRefreshToken(refreshTokenId: string): Promise<void> {
  const client = await getRedisClient();
  const key = `refresh:${refreshTokenId}`;
  await client.del(key);
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.disconnect();
    redisClient = null;
  }
}
