import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import { and, desc, eq, or } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import {
  blocks,
  collectiveContributions,
  collectiveSpaces,
  comments,
  connections,
  expressions,
  reactions,
  users,
} from './src/db/schema.ts';
import {
  getOrCreateUser,
  getUserByUid,
  getUserByUsername,
  toPublicProfile,
} from './src/db/users.ts';
import {
  createSafetyReport,
  enrichExpressions,
  getBlockedUidsForUser,
  getConnectedUidSet,
  getDiscoverData,
  getMediaUploadById,
  getUserSelectedReactionsSummary,
  listCollectiveSpaces,
  listConnectionsForUser,
  listExpressions,
  saveMediaUpload,
} from './src/db/soulsparkQueries.ts';
import { AuthRequest, optionalAuth, requireAuth } from './src/middleware/auth.ts';
import {
  canSendConnectionRequest,
  canUserComment,
  checkContentSafety,
  COLLECTIVE_KINDS,
  createEmptyVibrancyCounts,
  PublicProfile,
  REPORT_REASONS,
  sanitizeUsername,
  validateExpressionInput,
  VIBRANCY_TYPES,
  VibrancyType,
} from './src/utils/soulspark.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Current authenticated member profile & private safety settings
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const userRow = await getOrCreateUser({
        uid,
        email,
        displayName: req.user!.name,
        avatarUrl: req.user!.picture || null,
      });

      const blockedRows = await db
        .select()
        .from(blocks)
        .where(eq(blocks.blockerUid, uid));

      res.json({
        profile: toPublicProfile(userRow),
        privateSettings: {
          email: userRow.email,
          recoveryHintEmail: userRow.recoveryHintEmail ?? '',
        },
        blockedUids: blockedRows.map((b) => b.blockedUid),
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load profile.';
      res.status(500).json({ error: message });
    }
  });

  app.patch('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const current = await getOrCreateUser({ uid, email });

      const {
        displayName,
        username,
        bio,
        interests,
        avatarUrl,
        isMinorProtected,
        connectionPrivacy,
        commentPrivacy,
        recoveryHintEmail,
        onboardingComplete,
      } = req.body ?? {};

      const nextDisplayName =
        typeof displayName === 'string'
          ? displayName.trim().slice(0, 60)
          : current.displayName;
      const nextBio =
        typeof bio === 'string' ? bio.trim().slice(0, 400) : current.bio;

      if (!nextDisplayName || nextDisplayName.length < 2) {
        return res
          .status(400)
          .json({ error: 'Display name must be at least 2 characters.' });
      }

      const nameSafety = checkContentSafety(nextDisplayName);
      if (!nameSafety.safe) {
        return res.status(400).json({ error: nameSafety.reason });
      }
      if (nextBio) {
        const bioSafety = checkContentSafety(nextBio);
        if (!bioSafety.safe) {
          return res.status(400).json({ error: bioSafety.reason });
        }
      }

      let nextUsername = current.username;
      if (typeof username === 'string' && username.trim()) {
        const sanitized = sanitizeUsername(username);
        if (sanitized !== current.username) {
          const existing = await getUserByUsername(sanitized);
          if (existing && existing.uid !== uid) {
            return res
              .status(409)
              .json({ error: 'That username is already taken.' });
          }
          nextUsername = sanitized;
        }
      }

      const nextInterests = Array.isArray(interests)
        ? interests
            .filter((i): i is string => typeof i === 'string')
            .map((i) => i.trim())
            .filter(Boolean)
            .slice(0, 12)
        : current.interests;

      const validConnPrivacy = ['public', 'connections', 'private'].includes(
        connectionPrivacy
      )
        ? connectionPrivacy
        : current.connectionPrivacy;

      const validCommentPrivacy = ['everyone', 'connections', 'none'].includes(
        commentPrivacy
      )
        ? commentPrivacy
        : current.commentPrivacy;

      const updated = await db
        .update(users)
        .set({
          displayName: nextDisplayName,
          username: nextUsername,
          bio: nextBio,
          interests: nextInterests,
          avatarUrl:
            avatarUrl === null || typeof avatarUrl === 'string'
              ? avatarUrl
              : current.avatarUrl,
          isMinorProtected:
            typeof isMinorProtected === 'boolean'
              ? isMinorProtected
              : current.isMinorProtected,
          connectionPrivacy: validConnPrivacy,
          commentPrivacy: validCommentPrivacy,
          recoveryHintEmail:
            typeof recoveryHintEmail === 'string'
              ? recoveryHintEmail.trim().slice(0, 120)
              : current.recoveryHintEmail,
          onboardingComplete:
            typeof onboardingComplete === 'boolean'
              ? onboardingComplete
              : true,
        })
        .where(eq(users.uid, uid))
        .returning();

      res.json({
        profile: toPublicProfile(updated[0]),
        privateSettings: {
          email: updated[0].email,
          recoveryHintEmail: updated[0].recoveryHintEmail ?? '',
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to update profile.';
      res.status(500).json({ error: message });
    }
  });

  // Home feed & filtered expressions
  app.get('/api/expressions', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const interest =
        typeof req.query.interest === 'string' ? req.query.interest : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const authorUid =
        typeof req.query.authorUid === 'string'
          ? req.query.authorUid
          : undefined;

      const items = await listExpressions({
        viewerUid: req.user?.uid ?? null,
        category,
        interest,
        q,
        authorUid,
      });

      res.json({ expressions: items });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load feed.';
      res.status(500).json({ error: message });
    }
  });

  // Publish new Soul Expression
  app.post('/api/expressions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({
        uid,
        email: req.user!.email || '',
        displayName: req.user!.name,
      });

      const { title, category, content, imageUrl, tags, allowComments } =
        req.body ?? {};

      const validation = validateExpressionInput({
        title: String(title ?? ''),
        category: String(category ?? ''),
        content: String(content ?? ''),
      });
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Simple anti-spam duplicate / rapid post check (20 seconds)
      const recent = await db
        .select()
        .from(expressions)
        .where(eq(expressions.authorUid, uid))
        .orderBy(desc(expressions.createdAt))
        .limit(1);

      if (recent.length > 0) {
        const elapsedMs = Date.now() - recent[0].createdAt.getTime();
        if (elapsedMs < 15000 && recent[0].content.trim() === String(content).trim()) {
          return res.status(429).json({
            error:
              'Please take a quiet breath before sharing the same expression again.',
          });
        }
      }

      const cleanTags = Array.isArray(tags)
        ? tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 6)
        : [];

      const validCommentPolicy = ['everyone', 'connections', 'off'].includes(
        allowComments
      )
        ? allowComments
        : 'everyone';

      const inserted = await db
        .insert(expressions)
        .values({
          authorUid: uid,
          title: String(title).trim(),
          category: String(category).trim(),
          content: String(content).trim(),
          imageUrl:
            typeof imageUrl === 'string' && imageUrl.trim()
              ? imageUrl.trim()
              : null,
          tags: cleanTags,
          allowComments: validCommentPolicy,
          moderationStatus: 'approved',
        })
        .returning();

      const [enriched] = await enrichExpressions(
        inserted,
        uid,
        await getBlockedUidsForUser(uid)
      );

      res.status(201).json({ expression: enriched });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to publish expression.';
      res.status(500).json({ error: message });
    }
  });

  app.delete(
    '/api/expressions/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const exprId = Number(req.params.id);
        if (!Number.isInteger(exprId)) {
          return res.status(400).json({ error: 'Invalid expression ID.' });
        }

        const existing = await db
          .select()
          .from(expressions)
          .where(eq(expressions.id, exprId))
          .limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Expression not found.' });
        }
        if (existing[0].authorUid !== req.user!.uid) {
          return res
            .status(403)
            .json({ error: 'You can only remove your own expressions.' });
        }

        await db.delete(expressions).where(eq(expressions.id, exprId));
        res.json({ ok: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to delete expression.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Toggle Vibrancy Reaction
  app.post(
    '/api/expressions/:id/reactions',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        await getOrCreateUser({ uid, email: req.user!.email || '' });

        const exprId = Number(req.params.id);
        const type = String(req.body?.type ?? '');

        if (!Number.isInteger(exprId)) {
          return res.status(400).json({ error: 'Invalid expression ID.' });
        }
        if (!VIBRANCY_TYPES.includes(type as VibrancyType)) {
          return res.status(400).json({ error: 'Invalid vibrancy reaction.' });
        }

        const existing = await db
          .select()
          .from(reactions)
          .where(
            and(
              eq(reactions.expressionId, exprId),
              eq(reactions.userUid, uid),
              eq(reactions.type, type)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db.delete(reactions).where(eq(reactions.id, existing[0].id));
        } else {
          await db.insert(reactions).values({
            expressionId: exprId,
            userUid: uid,
            type,
          });
        }

        const blockedSet = await getBlockedUidsForUser(uid);
        const allForExpr = await db
          .select()
          .from(reactions)
          .where(eq(reactions.expressionId, exprId));

        const counts = createEmptyVibrancyCounts();
        const viewerReactions: VibrancyType[] = [];

        for (const r of allForExpr) {
          if (blockedSet.has(r.userUid)) continue;
          if (VIBRANCY_TYPES.includes(r.type as VibrancyType)) {
            const t = r.type as VibrancyType;
            counts[t] += 1;
            if (r.userUid === uid) viewerReactions.push(t);
          }
        }

        res.json({ vibrancy: { counts, viewerReactions } });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to update reaction.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Comment on an Expression
  app.post(
    '/api/expressions/:id/comments',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        const viewerRow = await getOrCreateUser({
          uid,
          email: req.user!.email || '',
          displayName: req.user!.name,
        });

        const exprId = Number(req.params.id);
        const content = String(req.body?.content ?? '').trim();

        if (!Number.isInteger(exprId)) {
          return res.status(400).json({ error: 'Invalid expression ID.' });
        }
        if (content.length < 2 || content.length > 1200) {
          return res.status(400).json({
            error: 'Comments must be between 2 and 1,200 characters.',
          });
        }

        const safety = checkContentSafety(content);
        if (!safety.safe) {
          return res.status(400).json({ error: safety.reason });
        }

        const exprRows = await db
          .select()
          .from(expressions)
          .where(eq(expressions.id, exprId))
          .limit(1);
        if (exprRows.length === 0) {
          return res.status(404).json({ error: 'Expression not found.' });
        }

        const expr = exprRows[0];
        const author = await getUserByUid(expr.authorUid);
        if (!author) {
          return res.status(404).json({ error: 'Author not found.' });
        }

        const blockedSet = await getBlockedUidsForUser(uid);
        const connectedSet = await getConnectedUidSet(uid);

        const permission = canUserComment({
          allowComments: expr.allowComments as 'everyone' | 'connections' | 'off',
          authorCommentPrivacy: author.commentPrivacy as
            | 'everyone'
            | 'connections'
            | 'none',
          authorIsMinorProtected: author.isMinorProtected,
          viewerUid: uid,
          authorUid: expr.authorUid,
          isConnected: connectedSet.has(expr.authorUid),
          isBlocked: blockedSet.has(expr.authorUid),
        });

        if (!permission.allowed) {
          return res.status(403).json({ error: permission.reason });
        }

        const inserted = await db
          .insert(comments)
          .values({
            expressionId: exprId,
            authorUid: uid,
            content,
          })
          .returning();

        res.status(201).json({
          comment: {
            id: inserted[0].id,
            expressionId: exprId,
            content: inserted[0].content,
            createdAt: inserted[0].createdAt.toISOString(),
            author: {
              uid: viewerRow.uid,
              username: viewerRow.username,
              displayName: viewerRow.displayName,
              avatarUrl: viewerRow.avatarUrl,
            },
          },
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to post comment.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Discover creators & filtered expressions
  app.get('/api/discover', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const interest =
        typeof req.query.interest === 'string' ? req.query.interest : undefined;
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;

      const [creators, exprList] = await Promise.all([
        getDiscoverData({
          viewerUid: req.user?.uid ?? null,
          interest,
          q,
        }),
        listExpressions({
          viewerUid: req.user?.uid ?? null,
          category,
          interest,
          q,
        }),
      ]);

      res.json({ creators, expressions: exprList });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load discovery.';
      res.status(500).json({ error: message });
    }
  });

  // View public profile by username (respecting privacy & blocks)
  app.get(
    '/api/profiles/:username',
    optionalAuth,
    async (req: AuthRequest, res) => {
      try {
        const username = String(req.params.username ?? '').toLowerCase();
        const target = await getUserByUsername(username);
        if (!target) {
          return res.status(404).json({ error: 'Profile not found.' });
        }

        const viewerUid = req.user?.uid ?? null;
        if (viewerUid) {
          const blockedSet = await getBlockedUidsForUser(viewerUid);
          if (blockedSet.has(target.uid)) {
            return res.status(404).json({ error: 'Profile unavailable.' });
          }
        }

        const isOwner = viewerUid === target.uid;
        const connectedSet = viewerUid
          ? await getConnectedUidSet(viewerUid)
          : new Set<string>();
        const isConnected = connectedSet.has(target.uid);

        const [exprs, selectedReactions] = await Promise.all([
          listExpressions({ viewerUid, authorUid: target.uid }),
          getUserSelectedReactionsSummary(target.uid),
        ]);

        let visibleConnections: PublicProfile[] | null = null;
        const canSeeConnections =
          isOwner ||
          target.connectionPrivacy === 'public' ||
          (target.connectionPrivacy === 'connections' && isConnected);

        if (canSeeConnections) {
          const targetConnRows = await db
            .select()
            .from(connections)
            .where(
              and(
                eq(connections.status, 'accepted'),
                or(
                  eq(connections.requesterUid, target.uid),
                  eq(connections.recipientUid, target.uid)
                )
              )
            );
          const peerUids = targetConnRows.map((c) =>
            c.requesterUid === target.uid ? c.recipientUid : c.requesterUid
          );
          if (peerUids.length > 0) {
            const peerRows = await Promise.all(
              peerUids.map((pUid) => getUserByUid(pUid))
            );
            visibleConnections = peerRows
              .filter((r): r is NonNullable<typeof r> => Boolean(r))
              .map(toPublicProfile);
          } else {
            visibleConnections = [];
          }
        }

        res.json({
          profile: toPublicProfile(target),
          expressions: exprs,
          selectedReactions,
          connections: visibleConnections,
          canSeeConnections,
          isConnected,
        });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to load profile.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Connections management
  app.get('/api/connections', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({ uid, email: req.user!.email || '' });
      const data = await listConnectionsForUser(uid);
      res.json(data);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to load connections.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/connections', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({ uid, email: req.user!.email || '' });

      const recipientUid = String(req.body?.recipientUid ?? '');
      const introNote = String(req.body?.introNote ?? '').trim().slice(0, 280);

      if (!recipientUid) {
        return res.status(400).json({ error: 'Recipient is required.' });
      }

      if (introNote) {
        const safety = checkContentSafety(introNote);
        if (!safety.safe) {
          return res.status(400).json({ error: safety.reason });
        }
      }

      const recipient = await getUserByUid(recipientUid);
      if (!recipient) {
        return res.status(404).json({ error: 'Member not found.' });
      }

      const blockedSet = await getBlockedUidsForUser(uid);
      const existingRows = await db
        .select()
        .from(connections)
        .where(
          or(
            and(
              eq(connections.requesterUid, uid),
              eq(connections.recipientUid, recipientUid)
            ),
            and(
              eq(connections.requesterUid, recipientUid),
              eq(connections.recipientUid, uid)
            )
          )
        )
        .limit(1);

      const existing = existingRows[0] ?? null;

      const check = canSendConnectionRequest({
        senderUid: uid,
        recipientUid,
        recipientIsMinorProtected: recipient.isMinorProtected,
        isBlocked: blockedSet.has(recipientUid),
        existingStatus: existing
          ? (existing.status as 'pending' | 'accepted' | 'declined')
          : null,
      });

      if (!check.allowed) {
        return res.status(400).json({ error: check.reason });
      }

      if (existing && existing.status === 'declined') {
        const updated = await db
          .update(connections)
          .set({
            requesterUid: uid,
            recipientUid,
            status: 'pending',
            introNote,
            updatedAt: new Date(),
          })
          .where(eq(connections.id, existing.id))
          .returning();
        return res.status(201).json({ connection: updated[0] });
      }

      const inserted = await db
        .insert(connections)
        .values({
          requesterUid: uid,
          recipientUid,
          status: 'pending',
          introNote,
        })
        .returning();

      res.status(201).json({ connection: inserted[0] });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to send request.';
      res.status(500).json({ error: message });
    }
  });

  app.patch(
    '/api/connections/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        const connId = Number(req.params.id);
        const status = String(req.body?.status ?? '');

        if (!Number.isInteger(connId)) {
          return res.status(400).json({ error: 'Invalid connection ID.' });
        }
        if (!['accepted', 'declined'].includes(status)) {
          return res.status(400).json({ error: 'Invalid connection status.' });
        }

        const existing = await db
          .select()
          .from(connections)
          .where(eq(connections.id, connId))
          .limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Connection request not found.' });
        }
        if (existing[0].recipientUid !== uid) {
          return res.status(403).json({
            error: 'Only the recipient can accept or decline this request.',
          });
        }

        const updated = await db
          .update(connections)
          .set({ status, updatedAt: new Date() })
          .where(eq(connections.id, connId))
          .returning();

        res.json({ connection: updated[0] });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to update connection.';
        res.status(500).json({ error: message });
      }
    }
  );

  app.delete(
    '/api/connections/:id',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        const connId = Number(req.params.id);
        if (!Number.isInteger(connId)) {
          return res.status(400).json({ error: 'Invalid connection ID.' });
        }

        const existing = await db
          .select()
          .from(connections)
          .where(eq(connections.id, connId))
          .limit(1);
        if (existing.length === 0) {
          return res.status(404).json({ error: 'Connection not found.' });
        }
        if (
          existing[0].requesterUid !== uid &&
          existing[0].recipientUid !== uid
        ) {
          return res.status(403).json({ error: 'Unauthorized.' });
        }

        await db.delete(connections).where(eq(connections.id, connId));
        res.json({ ok: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to remove connection.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Collective Creation Spaces
  app.get('/api/collectives', optionalAuth, async (req: AuthRequest, res) => {
    try {
      const spaces = await listCollectiveSpaces(req.user?.uid ?? null);
      res.json({ spaces });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to load collective spaces.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/collectives', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({ uid, email: req.user!.email || '' });

      const { title, kind, prompt, coverImageUrl, tags } = req.body ?? {};
      const cleanTitle = String(title ?? '').trim();
      const cleanPrompt = String(prompt ?? '').trim();
      const cleanKind = String(kind ?? '').trim();

      if (cleanTitle.length < 3 || cleanTitle.length > 100) {
        return res
          .status(400)
          .json({ error: 'Space title must be between 3 and 100 characters.' });
      }
      if (!COLLECTIVE_KINDS.includes(cleanKind as (typeof COLLECTIVE_KINDS)[number])) {
        return res.status(400).json({ error: 'Select a valid space kind.' });
      }
      if (cleanPrompt.length < 10 || cleanPrompt.length > 600) {
        return res
          .status(400)
          .json({ error: 'Prompt must be between 10 and 600 characters.' });
      }

      const safety = checkContentSafety(`${cleanTitle} ${cleanPrompt}`);
      if (!safety.safe) {
        return res.status(400).json({ error: safety.reason });
      }

      const cleanTags = Array.isArray(tags)
        ? tags
            .filter((t): t is string => typeof t === 'string')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 5)
        : [];

      const inserted = await db
        .insert(collectiveSpaces)
        .values({
          title: cleanTitle,
          kind: cleanKind,
          prompt: cleanPrompt,
          coverImageUrl:
            typeof coverImageUrl === 'string' && coverImageUrl.trim()
              ? coverImageUrl.trim()
              : null,
          tags: cleanTags,
          creatorUid: uid,
        })
        .returning();

      res.status(201).json({ spaceId: inserted[0].id });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create collective space.';
      res.status(500).json({ error: message });
    }
  });

  app.post(
    '/api/collectives/:id/contributions',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        await getOrCreateUser({ uid, email: req.user!.email || '' });

        const spaceId = Number(req.params.id);
        const content = String(req.body?.content ?? '').trim();
        const imageUrl =
          typeof req.body?.imageUrl === 'string' && req.body.imageUrl.trim()
            ? req.body.imageUrl.trim()
            : null;

        if (!Number.isInteger(spaceId)) {
          return res.status(400).json({ error: 'Invalid space ID.' });
        }
        if (content.length < 5 || content.length > 2000) {
          return res.status(400).json({
            error: 'Contribution must be between 5 and 2,000 characters.',
          });
        }

        const safety = checkContentSafety(content);
        if (!safety.safe) {
          return res.status(400).json({ error: safety.reason });
        }

        const space = await db
          .select()
          .from(collectiveSpaces)
          .where(eq(collectiveSpaces.id, spaceId))
          .limit(1);
        if (space.length === 0) {
          return res.status(404).json({ error: 'Collective space not found.' });
        }

        const inserted = await db
          .insert(collectiveContributions)
          .values({
            spaceId,
            authorUid: uid,
            content,
            imageUrl,
          })
          .returning();

        res.status(201).json({ contribution: inserted[0] });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to add contribution.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Safety: Block & Unblock
  app.post('/api/blocks', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const blockedUid = String(req.body?.blockedUid ?? '');

      if (!blockedUid || blockedUid === uid) {
        return res.status(400).json({ error: 'Invalid user to block.' });
      }

      await db
        .insert(blocks)
        .values({ blockerUid: uid, blockedUid })
        .onConflictDoNothing();

      // Remove any existing connections between these two users
      await db
        .delete(connections)
        .where(
          or(
            and(
              eq(connections.requesterUid, uid),
              eq(connections.recipientUid, blockedUid)
            ),
            and(
              eq(connections.requesterUid, blockedUid),
              eq(connections.recipientUid, uid)
            )
          )
        );

      res.status(201).json({ ok: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to block user.';
      res.status(500).json({ error: message });
    }
  });

  app.delete(
    '/api/blocks/:blockedUid',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const uid = req.user!.uid;
        const blockedUid = String(req.params.blockedUid ?? '');

        await db
          .delete(blocks)
          .where(
            and(
              eq(blocks.blockerUid, uid),
              eq(blocks.blockedUid, blockedUid)
            )
          );

        res.json({ ok: true });
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Failed to unblock user.';
        res.status(500).json({ error: message });
      }
    }
  );

  // Safety: Report Content or Account
  app.post('/api/reports', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({ uid, email: req.user!.email || '' });

      const targetType = String(req.body?.targetType ?? '');
      const targetId = String(req.body?.targetId ?? '');
      const reason = String(req.body?.reason ?? '');
      const details = String(req.body?.details ?? '').trim().slice(0, 500);

      if (!['expression', 'user', 'comment'].includes(targetType)) {
        return res.status(400).json({ error: 'Invalid report target type.' });
      }
      if (!targetId) {
        return res.status(400).json({ error: 'Target ID is required.' });
      }
      if (!REPORT_REASONS.includes(reason as (typeof REPORT_REASONS)[number])) {
        return res.status(400).json({ error: 'Please select a valid reason.' });
      }

      await createSafetyReport({
        reporterUid: uid,
        targetType: targetType as 'expression' | 'user' | 'comment',
        targetId,
        reason,
        details,
      });

      res.status(201).json({ ok: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit report.';
      res.status(500).json({ error: message });
    }
  });

  // Real Image Upload stored in PostgreSQL
  app.post('/api/uploads', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      await getOrCreateUser({ uid, email: req.user!.email || '' });

      const mimeType = String(req.body?.mimeType ?? '');
      const base64Data = String(req.body?.base64Data ?? '');

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        return res.status(400).json({
          error: 'Only JPEG, PNG, and WebP images are supported.',
        });
      }
      if (!base64Data || base64Data.length > 4_200_000) {
        return res.status(400).json({
          error: 'Image must be under 3 MB.',
        });
      }

      const id = await saveMediaUpload({
        uploaderUid: uid,
        mimeType,
        base64Data,
      });

      res.status(201).json({ url: `/api/media/${id}` });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload image.';
      res.status(500).json({ error: message });
    }
  });

  app.get('/api/media/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).send('Invalid media ID');
      }
      const media = await getMediaUploadById(id);
      if (!media) {
        return res.status(404).send('Not found');
      }
      const buffer = Buffer.from(media.base64Data, 'base64');
      res.setHeader('Content-Type', media.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(buffer);
    } catch {
      res.status(500).send('Failed to serve media');
    }
  });

  // Vite Dev Middleware or Static Production Build
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOULSPARK server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
