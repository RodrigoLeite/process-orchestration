#!/usr/bin/env node

/**
 * Migration script to backfill tenant_id for existing data
 * This script should be run ONCE before deploying multi-tenant changes
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";

const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000000";
const DEFAULT_TENANT_NAME = "Default";
const DEFAULT_TENANT_SLUG = "default";

async function migrate() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }

    const sqlClient = neon(process.env.DATABASE_URL);
    const db = drizzle(sqlClient);

    console.log("[MIGRATION] Starting tenant migration...");
    console.log(`[MIGRATION] Default Tenant ID: ${DEFAULT_TENANT_ID}`);

    // 1. Create default tenant
    console.log("[MIGRATION] Creating default tenant...");
    await db.execute(sql`
      INSERT INTO tenants (id, name, slug, plan, created_at)
      VALUES (${DEFAULT_TENANT_ID}, ${DEFAULT_TENANT_NAME}, ${DEFAULT_TENANT_SLUG}, 'free', NOW())
      ON CONFLICT (id) DO NOTHING
    `);
    console.log("[MIGRATION] ✓ Default tenant created/ensured");

    // 2. Backfill tenant_id in demands table (where not already set)
    console.log("[MIGRATION] Backfilling tenant_id in demands...");
    const demandsResult = await db.execute(sql`
      UPDATE demands 
      SET tenant_id = ${DEFAULT_TENANT_ID}
      WHERE tenant_id IS NULL
      RETURNING id
    `);
    console.log(`[MIGRATION] ✓ Updated ${demandsResult.rowCount || 0} demands`);

    // 3. Backfill tenant_id in workflows table (where not already set)
    console.log("[MIGRATION] Backfilling tenant_id in workflows...");
    const workflowsResult = await db.execute(sql`
      UPDATE workflows 
      SET tenant_id = ${DEFAULT_TENANT_ID}
      WHERE tenant_id IS NULL
      RETURNING id
    `);
    console.log(`[MIGRATION] ✓ Updated ${workflowsResult.rowCount || 0} workflows`);

    // 4. Create default tenant_user for all existing users (if any)
    console.log("[MIGRATION] Creating tenant_user mappings...");
    const usersResult = await db.execute(sql`
      INSERT INTO tenant_users (tenant_id, user_id, role, created_at)
      SELECT ${DEFAULT_TENANT_ID}, id, 'owner', NOW()
      FROM users
      ON CONFLICT DO NOTHING
    `);
    console.log(`[MIGRATION] ✓ Created ${usersResult.rowCount || 0} tenant_user mappings`);

    console.log("[MIGRATION] ✅ Migration complete!");
    console.log("[MIGRATION] All existing data is now associated with the default tenant");
    console.log("[MIGRATION] Ready for multi-tenant deployment");

  } catch (error) {
    console.error("[MIGRATION] ❌ Migration failed:", error);
    process.exit(1);
  }
}

migrate();
