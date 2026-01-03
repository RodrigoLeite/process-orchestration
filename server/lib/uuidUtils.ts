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
export function normalizeUUID(value: any): string | undefined {
  // Return undefined for empty strings, null, or undefined
  if (!value || value === '' || value === null || value === undefined) return undefined;
  
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
    
    // If it's a non-empty string that's not a UUID, return undefined
    return undefined;
  }
  
  // Buffer, Uint8Array, or Array of bytes
  if (Buffer.isBuffer(value) || Array.isArray(value) || value instanceof Uint8Array) {
    const bytes: number[] = Array.from(value as any);
    return bytesToUUID(bytes);
  }
  
  // For any other type, return undefined
  return undefined;
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

/**
 * List of common UUID field names in the database
 */
const UUID_FIELDS = [
  'id', 'tenantId', 'tenant_id', 'userId', 'user_id', 
  'boardId', 'board_id', 'phaseId', 'phase_id', 'cardId', 'card_id',
  'teamId', 'team_id', 'roleId', 'role_id', 'demandId', 'demand_id',
  'workflowId', 'workflow_id', 'createdBy', 'created_by', 'updatedBy', 'updated_by',
  'assignedTo', 'ownerId', 'owner_id', 'parentId', 'parent_id',
  'areaId', 'area_id'
];

/**
 * Normalize all UUID fields in an object
 */
export function normalizeRecord<T extends Record<string, any>>(record: T): T {
  if (!record || typeof record !== 'object') return record;
  
  const normalized: any = { ...record };
  
  for (const key of Object.keys(normalized)) {
    const value = normalized[key];
    if (UUID_FIELDS.includes(key) && value !== null && value !== undefined) {
      // Check if it's a comma-separated string, array of bytes, Uint8Array, or Buffer
      if ((typeof value === 'string' && value.includes(',')) || 
          Array.isArray(value) || 
          value instanceof Uint8Array ||
          Buffer.isBuffer(value)) {
        normalized[key] = normalizeUUID(value);
      }
    }
  }
  
  return normalized as T;
}

/**
 * Normalize all UUID fields in an array of objects
 */
export function normalizeRecords<T extends Record<string, any>>(records: T[]): T[] {
  if (!records || !Array.isArray(records)) return [] as T[];
  return records.map(record => normalizeRecord(record));
}
