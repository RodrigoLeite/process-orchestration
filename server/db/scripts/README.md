# Database Migration Scripts

## migrate_to_tenant.ts

Backfills existing data with default tenant information to enable multi-tenant mode.

### Prerequisites
- Database must be initialized with the new schema (tenants, tenant_users, audit_logs tables)
- Run after `npm run db:push`

### Usage

```bash
# Before deployment, run:
DATABASE_URL="your-database-url" npx tsx server/db/scripts/migrate_to_tenant.ts
```

### What it does
1. Creates a default tenant (if not exists)
2. Updates all existing demands with default tenant_id
3. Updates all existing workflows with default tenant_id  
4. Creates tenant_user mappings for all existing users as "owner" role

### Important Notes
- This is a one-time migration - safe to run multiple times
- All existing data will be associated with the default tenant
- Users are given "owner" role in the default tenant
- For existing internal API calls that don't pass tenant_id, they'll automatically use the default tenant

### Rollback
If something goes wrong, you can rollback the tenant_id updates:
```sql
UPDATE demands SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
UPDATE workflows SET tenant_id = NULL WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
DELETE FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';
DELETE FROM tenant_users WHERE tenant_id = '00000000-0000-0000-0000-000000000000';
```
