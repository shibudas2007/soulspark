import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';
import { PublicProfile, sanitizeUsername } from '../utils/soulspark.ts';

export function toPublicProfile(row: typeof users.$inferSelect): PublicProfile {
  return {
    uid: row.uid,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl ?? null,
    bio: row.bio,
    interests: row.interests ?? [],
    isMinorProtected: row.isMinorProtected,
    connectionPrivacy:
      (row.connectionPrivacy as PublicProfile['connectionPrivacy']) || 'connections',
    commentPrivacy:
      (row.commentPrivacy as PublicProfile['commentPrivacy']) || 'everyone',
    onboardingComplete: row.onboardingComplete,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getOrCreateUser(params: {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string | null;
}) {
  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, params.uid))
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].email !== params.email && params.email) {
        const updated = await db
          .update(users)
          .set({ email: params.email })
          .where(eq(users.uid, params.uid))
          .returning();
        return updated[0];
      }
      return existing[0];
    }

    const baseHandle = sanitizeUsername(
      params.displayName || params.email.split('@')[0] || 'traveler'
    );
    const suffix = params.uid.slice(-4).toLowerCase().replace(/[^a-z0-9]/g, '7');
    const candidateUsername = `${baseHandle}_${suffix}`.slice(0, 28);

    const inserted = await db
      .insert(users)
      .values({
        uid: params.uid,
        email: params.email,
        username: candidateUsername,
        displayName: params.displayName?.trim() || 'Soul Traveler',
        avatarUrl: params.avatarUrl ?? null,
        bio: '',
        interests: ['Poetry', 'Contemplation', 'Kindness'],
        onboardingComplete: false,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: params.email },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database getOrCreateUser failed:', error);
    throw new Error('Unable to load or create user profile.', { cause: error });
  }
}

export async function getUserByUid(uid: string) {
  try {
    const rows = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database getUserByUid failed:', error);
    throw new Error('Unable to fetch user profile.', { cause: error });
  }
}

export async function getUserByUsername(username: string) {
  try {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database getUserByUsername failed:', error);
    throw new Error('Unable to fetch user profile.', { cause: error });
  }
}
