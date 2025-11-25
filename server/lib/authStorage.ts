import { storage } from "../storage";

export async function createOrUpdateGoogleUser(profile: any) {
  const email = profile.emails?.[0]?.value;
  const image = profile.photos?.[0]?.value;
  const googleId = profile.id;
  const displayName = profile.displayName;

  if (!email) {
    throw new Error("Google profile must have an email");
  }

  // Try to get existing user by email
  try {
    const user = await storage.getUser(googleId || email);
    
    if (user) {
      // User exists, could update but Drizzle storage doesn't have update user method
      return user;
    }
  } catch (error) {
    // User doesn't exist, create new one
  }

  // Create new user
  return await storage.createUser({
    email,
    name: displayName,
    image,
    googleId,
  });
}
