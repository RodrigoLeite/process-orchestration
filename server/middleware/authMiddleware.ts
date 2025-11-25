import { Request, Response, NextFunction } from "express";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { neon } from "@neondatabase/serverless";
import PassportGoogleOAuth from "passport-google-oauth20";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      name?: string;
      image?: string;
    }
    interface Request {
      userId?: string;
      tenantId?: string;
    }
  }
}

export function configureSession() {
  const PgSession = pgSession(session);
  const sql = neon(process.env.DATABASE_URL!);

  return session({
    store: new PgSession({
      pool: sql as any,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
    },
  });
}

export function configurePassport() {
  const Strategy = (PassportGoogleOAuth as any).Strategy;
  const { createOrUpdateGoogleUser } = require("../lib/authStorage");

  passport.use(
    new Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/api/auth/google/callback",
      },
      async (accessToken: string, refreshToken: string, profile: any, done: any) => {
        try {
          const user = await createOrUpdateGoogleUser(profile);
          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done: any) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const { storage } = await import("../storage");
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    req.userId = req.user?.id;
    next();
  } else {
    res.status(401).json({ error: "Not authenticated" });
  }
}

export function requireAuthRedirect(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    req.userId = req.user?.id;
    next();
  } else {
    res.redirect("/auth/login");
  }
}
