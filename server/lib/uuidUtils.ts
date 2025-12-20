/**
 * UUID conversion utilities
 * Handles conversion of UUID values that may come in different formats from the database
 */

/**
 * Convert a UUID value to standard string format
 * Handles:
 * - Already formatted UUID strings (returns as-is)
 * - Comma-separated byte strings like "153,73,164,252,..."
 * - Buffer/Uint8Array
 */
export function normalizeUUID(value: any): string {
  if (!value) return value;
  
  // Already a properly formatted UUID string
  if (typeof value === 'string') {
    // Check if it's a UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return value;
    }
    
    // Comma-separated byte string
    if (value.includes(',')) {
      const bytes = value.split(',').map((n: string) => parseInt(n.trim(), 10));
      return bytesToUUID(bytes);
    }
    
    return value;
  }
  
  // Buffer or Uint8Array
  if (Array.isArray(value) || value instanceof Uint8Array) {
    const bytes: number[] = Array.from(value as any);
    return bytesToUUID(bytes);
  }
  
  return String(value);
}

/**
 * Convert an array of bytes to UUID string format
 */
function bytesToUUID(bytes: number[]): string {
  const toHex = (b: number) => b.toString(16).padStart(2, '0');
  return [
    bytes.slice(0, 4).map(toHex).join(''),
    bytes.slice(4, 6).map(toHex).join(''),
    bytes.slice(6, 8).map(toHex).join(''),
    bytes.slice(8, 10).map(toHex).join(''),
    bytes.slice(10, 16).map(toHex).join('')
  ].join('-');
}

/**
 * Normalize a tenant user record's UUID fields
 */
export function normalizeTenantUser(tenantUser: any): any {
  if (!tenantUser) return tenantUser;
  
  return {
    ...tenantUser,
    id: normalizeUUID(tenantUser.id),
    tenantId: normalizeUUID(tenantUser.tenantId),
  };
}
