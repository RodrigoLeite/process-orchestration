import { Router } from "express";
import passport from "passport";
import { storage } from "../storage";
import { normalizeUUID } from "../lib/uuidUtils";

const router = Router();

// Google OAuth login
router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login?error=auth_failed" }),
  async (req, res) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect("/login?error=no_user");
      }

      // Check if user has a tenant, if not create one
      const tenantUsers = await storage.getTenantUsersByUserId(user.id);

      let tenantId = tenantUsers[0]?.tenantId;

      if (!tenantId) {
        // Create a new tenant for this user
        const tenant = await storage.createTenant({
          name: `${user.name || "My"} Workspace`,
          slug: `ws-${user.id.substring(0, 8)}`,
        });

        // Link user to tenant as owner
        await storage.createTenantUser({
          tenantId: tenant.id,
          userId: user.id,
          role: "owner",
        });

        tenantId = tenant.id;
      }

      // Store tenant ID in session
      (req.session as any).tenantId = tenantId;
      (req.session as any).userId = user.id;

      res.redirect("/dashboard");
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect("/login?error=callback_failed");
    }
  }
);

// Logout
router.post("/auth/logout", (req, res) => {
  req.logout((err: any) => {
    if (err) {
      return res.status(500).json({ error: "Logout failed" });
    }
    res.json({ success: true });
  });
});

// Get session
router.get("/auth/session", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.json(null);
  }

  res.json({
    user: req.user,
    tenantId: (req.session as any).tenantId,
  });
});

// Get user tenants
router.get("/auth/tenants", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = normalizeUUID((req.user as any)?.id);
    const tenantUsers = await storage.getTenantUsersByUserId(userId);

    const tenantsData = [];
    for (const tu of tenantUsers) {
      const tenantId = normalizeUUID(tu.tenantId);
      const tenant = await storage.getTenant(tenantId);
      if (tenant) {
        tenantsData.push({
          ...tenant,
          role: tu.role,
        });
      }
    }

    res.json(tenantsData);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

// Switch tenant
router.post("/auth/switch-tenant/:tenantId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = normalizeUUID((req.user as any)?.id);
    const tenantId = normalizeUUID(req.params.tenantId);

    // Verify user has access to this tenant
    const tenantUser = await storage.getTenantUser(tenantId, userId);
    if (!tenantUser) {
      return res.status(403).json({ error: "Access denied" });
    }

    (req.session as any).tenantId = tenantId;
    res.json({ success: true, tenantId });
  } catch (error) {
    console.error("Error switching tenant:", error);
    res.status(500).json({ error: "Failed to switch tenant" });
  }
});

export default router;
