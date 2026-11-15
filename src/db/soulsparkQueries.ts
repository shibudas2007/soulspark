import { and, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  blocks,
  collectiveContributions,
  collectiveSpaces,
  comments,
  connections,
  expressions,
  mediaUploads,
  reactions,
  reports,
  users,
} from './schema.ts';
import { toPublicProfile } from './users.ts';
import {
  CollectiveSpaceItem,
  computeSharedInterests,
  ConnectionRecord,
  createEmptyVibrancyCounts,
  diversifyFeed,
  ExpressionItem,
  PublicProfile,
  VIBRANCY_TYPES,
  VibrancyType,
} from '../utils/soulspark.ts';

export async function getBlockedUidsForUser(viewerUid: string): Promise<Set<string>> {
  try {
    const rows = await db
      .select()
      .from(blocks)
      .where(
        or(eq(blocks.blockerUid, viewerUid), eq(blocks.blockedUid, viewerUid))
      );
    const set = new Set<string>();
    for (const row of rows) {
      if (row.blockerUid === viewerUid) set.add(row.blockedUid);
      if (row.blockedUid === viewerUid) set.add(row.blockerUid);
    }
    return set;
  } catch (error) {
    console.error('getBlockedUidsForUser failed:', error);
    throw new Error('Unable to load safety preferences.', { cause: error });
  }
}

export async function getConnectedUidSet(viewerUid: string): Promise<Set<string>> {
  try {
    const rows = await db
      .select()
      .from(connections)
      .where(
        and(
          eq(connections.status, 'accepted'),
          or(
            eq(connections.requesterUid, viewerUid),
            eq(connections.recipientUid, viewerUid)
          )
        )
      );
    const set = new Set<string>();
    for (const row of rows) {
      set.add(
        row.requesterUid === viewerUid ? row.recipientUid : row.requesterUid
      );
    }
    return set;
  } catch (error) {
    console.error('getConnectedUidSet failed:', error);
    throw new Error('Unable to load connections.', { cause: error });
  }
}

export async function enrichExpressions(
  exprRows: Array<typeof expressions.$inferSelect>,
  viewerUid: string | null,
  blockedSet: Set<string>
): Promise<ExpressionItem[]> {
  if (exprRows.length === 0) return [];

  try {
    const visibleRows = exprRows.filter(
      (e) => e.moderationStatus === 'approved' && !blockedSet.has(e.authorUid)
    );
    if (visibleRows.length === 0) return [];

    const exprIds = visibleRows.map((e) => e.id);
    const authorUids = Array.from(new Set(visibleRows.map((e) => e.authorUid)));

    const [authorRows, reactionRows, commentRows] = await Promise.all([
      db.select().from(users).where(inArray(users.uid, authorUids)),
      db.select().from(reactions).where(inArray(reactions.expressionId, exprIds)),
      db
        .select()
        .from(comments)
        .where(inArray(comments.expressionId, exprIds))
        .orderBy(comments.createdAt),
    ]);

    const commentAuthorUids = Array.from(
      new Set(commentRows.map((c) => c.authorUid))
    ).filter((uid) => !authorUids.includes(uid));

    let extraAuthors: Array<typeof users.$inferSelect> = [];
    if (commentAuthorUids.length > 0) {
      extraAuthors = await db
        .select()
        .from(users)
        .where(inArray(users.uid, commentAuthorUids));
    }

    const userMap = new Map<string, PublicProfile>();
    for (const u of [...authorRows, ...extraAuthors]) {
      userMap.set(u.uid, toPublicProfile(u));
    }

    const reactionMap = new Map<
      number,
      { counts: Record<VibrancyType, number>; viewerReactions: VibrancyType[] }
    >();
    for (const id of exprIds) {
      reactionMap.set(id, {
        counts: createEmptyVibrancyCounts(),
        viewerReactions: [],
      });
    }

    for (const r of reactionRows) {
      if (blockedSet.has(r.userUid)) continue;
      const entry = reactionMap.get(r.expressionId);
      if (!entry) continue;
      if (VIBRANCY_TYPES.includes(r.type as VibrancyType)) {
        const type = r.type as VibrancyType;
        entry.counts[type] += 1;
        if (viewerUid && r.userUid === viewerUid) {
          entry.viewerReactions.push(type);
        }
      }
    }

    const commentsMap = new Map<number, ExpressionItem['comments']>();
    for (const c of commentRows) {
      if (blockedSet.has(c.authorUid)) continue;
      const author = userMap.get(c.authorUid);
      if (!author) continue;
      const list = commentsMap.get(c.expressionId) || [];
      list.push({
        id: c.id,
        expressionId: c.expressionId,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        author: {
          uid: author.uid,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
        },
      });
      commentsMap.set(c.expressionId, list);
    }

    const enriched: ExpressionItem[] = [];
    for (const row of visibleRows) {
      const author = userMap.get(row.authorUid);
      if (!author) continue;
      enriched.push({
        id: row.id,
        title: row.title,
        category: row.category,
        content: row.content,
        imageUrl: row.imageUrl ?? null,
        tags: row.tags ?? [],
        allowComments:
          (row.allowComments as ExpressionItem['allowComments']) || 'everyone',
        createdAt: row.createdAt.toISOString(),
        author,
        vibrancy: reactionMap.get(row.id) || {
          counts: createEmptyVibrancyCounts(),
          viewerReactions: [],
        },
        comments: commentsMap.get(row.id) || [],
      });
    }

    return diversifyFeed(enriched);
  } catch (error) {
    console.error('enrichExpressions failed:', error);
    throw new Error('Unable to load expressions.', { cause: error });
  }
}

export async function listExpressions(params: {
  viewerUid: string | null;
  category?: string;
  interest?: string;
  q?: string;
  authorUid?: string;
}) {
  try {
    const blockedSet = params.viewerUid
      ? await getBlockedUidsForUser(params.viewerUid)
      : new Set<string>();

    const rows = params.authorUid
      ? await db
          .select()
          .from(expressions)
          .where(eq(expressions.authorUid, params.authorUid))
          .orderBy(desc(expressions.createdAt))
          .limit(60)
      : await db
          .select()
          .from(expressions)
          .orderBy(desc(expressions.createdAt))
          .limit(60);

    let enriched = await enrichExpressions(rows, params.viewerUid, blockedSet);

    if (params.category && params.category !== 'All') {
      enriched = enriched.filter(
        (e) => e.category.toLowerCase() === params.category!.toLowerCase()
      );
    }
    if (params.interest && params.interest !== 'All') {
      const needle = params.interest.toLowerCase();
      enriched = enriched.filter(
        (e) =>
          e.tags.some((t) => t.toLowerCase() === needle) ||
          e.author.interests.some((t) => t.toLowerCase() === needle)
      );
    }
    if (params.q && params.q.trim()) {
      const q = params.q.trim().toLowerCase();
      enriched = enriched.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.author.displayName.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return enriched;
  } catch (error) {
    console.error('listExpressions failed:', error);
    throw new Error('Unable to load feed expressions.', { cause: error });
  }
}

export async function getDiscoverData(params: {
  viewerUid: string | null;
  interest?: string;
  q?: string;
}) {
  try {
    const blockedSet = params.viewerUid
      ? await getBlockedUidsForUser(params.viewerUid)
      : new Set<string>();

    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

    let viewerInterests: string[] = [];
    if (params.viewerUid) {
      const me = allUsers.find((u) => u.uid === params.viewerUid);
      viewerInterests = me?.interests ?? [];
    }

    const viewerConnRows = params.viewerUid
      ? await db
          .select()
          .from(connections)
          .where(
            or(
              eq(connections.requesterUid, params.viewerUid),
              eq(connections.recipientUid, params.viewerUid)
            )
          )
      : [];

    const connStatusByUid = new Map<
      string,
      { id: number; status: 'pending_sent' | 'pending_received' | 'accepted' | 'declined' }
    >();
    for (const c of viewerConnRows) {
      const peerUid =
        c.requesterUid === params.viewerUid ? c.recipientUid : c.requesterUid;
      if (c.status === 'accepted') {
        connStatusByUid.set(peerUid, { id: c.id, status: 'accepted' });
      } else if (c.status === 'pending') {
        connStatusByUid.set(peerUid, {
          id: c.id,
          status:
            c.requesterUid === params.viewerUid
              ? 'pending_sent'
              : 'pending_received',
        });
      } else {
        connStatusByUid.set(peerUid, { id: c.id, status: 'declined' });
      }
    }

    let creators = allUsers
      .filter(
        (u) =>
          u.onboardingComplete &&
          u.uid !== params.viewerUid &&
          !blockedSet.has(u.uid)
      )
      .map((u) => {
        const pub = toPublicProfile(u);
        const sharedInterests = computeSharedInterests(
          viewerInterests,
          pub.interests
        );
        const conn = connStatusByUid.get(pub.uid);
        return {
          profile: pub,
          sharedInterests,
          connectionStatus: conn?.status ?? 'none',
          connectionId: conn?.id ?? null,
        };
      });

    if (params.interest && params.interest !== 'All') {
      const needle = params.interest.toLowerCase();
      creators = creators.filter((c) =>
        c.profile.interests.some((i) => i.toLowerCase() === needle)
      );
    }

    if (params.q && params.q.trim()) {
      const q = params.q.trim().toLowerCase();
      creators = creators.filter(
        (c) =>
          c.profile.displayName.toLowerCase().includes(q) ||
          c.profile.username.toLowerCase().includes(q) ||
          c.profile.bio.toLowerCase().includes(q) ||
          c.profile.interests.some((i) => i.toLowerCase().includes(q))
      );
    }

    // Sort gently by shared interest resonance (not follower count!)
    creators.sort((a, b) => b.sharedInterests.length - a.sharedInterests.length);

    return creators;
  } catch (error) {
    console.error('getDiscoverData failed:', error);
    throw new Error('Unable to load community discovery.', { cause: error });
  }
}

export async function listConnectionsForUser(viewerUid: string): Promise<{
  incoming: ConnectionRecord[];
  outgoing: ConnectionRecord[];
  accepted: ConnectionRecord[];
  blocked: PublicProfile[];
}> {
  try {
    const blockedRows = await db
      .select()
      .from(blocks)
      .where(eq(blocks.blockerUid, viewerUid));
    const blockedByMe = new Set(blockedRows.map((b) => b.blockedUid));
    const allBlocked = await getBlockedUidsForUser(viewerUid);

    const connRows = await db
      .select()
      .from(connections)
      .where(
        or(
          eq(connections.requesterUid, viewerUid),
          eq(connections.recipientUid, viewerUid)
        )
      )
      .orderBy(desc(connections.updatedAt));

    const peerUids = Array.from(
      new Set([
        viewerUid,
        ...connRows.map((c) =>
          c.requesterUid === viewerUid ? c.recipientUid : c.requesterUid
        ),
        ...Array.from(blockedByMe),
      ])
    );

    const userRows =
      peerUids.length > 0
        ? await db.select().from(users).where(inArray(users.uid, peerUids))
        : [];
    const userMap = new Map<string, PublicProfile>();
    for (const u of userRows) {
      userMap.set(u.uid, toPublicProfile(u));
    }

    const viewerProfile = userMap.get(viewerUid);
    const viewerInterests = viewerProfile?.interests ?? [];

    const incoming: ConnectionRecord[] = [];
    const outgoing: ConnectionRecord[] = [];
    const accepted: ConnectionRecord[] = [];

    for (const c of connRows) {
      const isRequester = c.requesterUid === viewerUid;
      const peerUid = isRequester ? c.recipientUid : c.requesterUid;
      if (allBlocked.has(peerUid)) continue;
      const peer = userMap.get(peerUid);
      if (!peer) continue;

      const record: ConnectionRecord = {
        id: c.id,
        status: c.status as ConnectionRecord['status'],
        introNote: c.introNote,
        createdAt: c.createdAt.toISOString(),
        peer,
        direction: isRequester ? 'outgoing' : 'incoming',
        sharedInterests: computeSharedInterests(viewerInterests, peer.interests),
      };

      if (c.status === 'accepted') {
        accepted.push(record);
      } else if (c.status === 'pending') {
        if (isRequester) outgoing.push(record);
        else incoming.push(record);
      }
    }

    const blocked: PublicProfile[] = Array.from(blockedByMe)
      .map((uid) => userMap.get(uid))
      .filter((p): p is PublicProfile => Boolean(p));

    return { incoming, outgoing, accepted, blocked };
  } catch (error) {
    console.error('listConnectionsForUser failed:', error);
    throw new Error('Unable to load connections.', { cause: error });
  }
}

export async function listCollectiveSpaces(
  viewerUid: string | null
): Promise<CollectiveSpaceItem[]> {
  try {
    const blockedSet = viewerUid
      ? await getBlockedUidsForUser(viewerUid)
      : new Set<string>();

    const spaceRows = await db
      .select()
      .from(collectiveSpaces)
      .orderBy(desc(collectiveSpaces.createdAt));

    if (spaceRows.length === 0) return [];

    const spaceIds = spaceRows.map((s) => s.id);
    const contribRows = await db
      .select()
      .from(collectiveContributions)
      .where(inArray(collectiveContributions.spaceId, spaceIds))
      .orderBy(collectiveContributions.createdAt);

    const uids = Array.from(
      new Set([
        ...spaceRows.map((s) => s.creatorUid),
        ...contribRows.map((c) => c.authorUid),
      ])
    );

    const userRows =
      uids.length > 0
        ? await db.select().from(users).where(inArray(users.uid, uids))
        : [];
    const userMap = new Map<string, PublicProfile>();
    for (const u of userRows) {
      userMap.set(u.uid, toPublicProfile(u));
    }

    const contribMap = new Map<number, CollectiveSpaceItem['contributions']>();
    for (const c of contribRows) {
      if (blockedSet.has(c.authorUid)) continue;
      const author = userMap.get(c.authorUid);
      if (!author) continue;
      const list = contribMap.get(c.spaceId) || [];
      list.push({
        id: c.id,
        spaceId: c.spaceId,
        content: c.content,
        imageUrl: c.imageUrl ?? null,
        createdAt: c.createdAt.toISOString(),
        author: {
          uid: author.uid,
          username: author.username,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl,
        },
      });
      contribMap.set(c.spaceId, list);
    }

    return spaceRows
      .filter((s) => !blockedSet.has(s.creatorUid))
      .map((s) => {
        const creator = userMap.get(s.creatorUid);
        return {
          id: s.id,
          title: s.title,
          kind: s.kind,
          prompt: s.prompt,
          coverImageUrl: s.coverImageUrl ?? null,
          tags: s.tags ?? [],
          createdAt: s.createdAt.toISOString(),
          creator: creator
            ? {
                uid: creator.uid,
                username: creator.username,
                displayName: creator.displayName,
                avatarUrl: creator.avatarUrl,
              }
            : {
                uid: s.creatorUid,
                username: 'community',
                displayName: 'Community Steward',
                avatarUrl: null,
              },
          contributions: contribMap.get(s.id) || [],
        };
      });
  } catch (error) {
    console.error('listCollectiveSpaces failed:', error);
    throw new Error('Unable to load collective creation spaces.', {
      cause: error,
    });
  }
}

export async function getUserSelectedReactionsSummary(targetUid: string) {
  try {
    const givenRows = await db
      .select({
        type: reactions.type,
        expressionId: expressions.id,
        expressionTitle: expressions.title,
        expressionCategory: expressions.category,
        authorName: users.displayName,
      })
      .from(reactions)
      .innerJoin(expressions, eq(reactions.expressionId, expressions.id))
      .innerJoin(users, eq(expressions.authorUid, users.uid))
      .where(
        and(
          eq(reactions.userUid, targetUid),
          eq(expressions.moderationStatus, 'approved')
        )
      )
      .orderBy(desc(reactions.createdAt))
      .limit(12);

    return givenRows;
  } catch (error) {
    console.error('getUserSelectedReactionsSummary failed:', error);
    throw new Error('Unable to load vibrancy resonances.', { cause: error });
  }
}

export async function saveMediaUpload(params: {
  uploaderUid: string;
  mimeType: string;
  base64Data: string;
}) {
  try {
    const inserted = await db
      .insert(mediaUploads)
      .values({
        uploaderUid: params.uploaderUid,
        mimeType: params.mimeType,
        base64Data: params.base64Data,
      })
      .returning({ id: mediaUploads.id });
    return inserted[0].id;
  } catch (error) {
    console.error('saveMediaUpload failed:', error);
    throw new Error('Unable to store uploaded image.', { cause: error });
  }
}

export async function getMediaUploadById(id: number) {
  try {
    const rows = await db
      .select()
      .from(mediaUploads)
      .where(eq(mediaUploads.id, id))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('getMediaUploadById failed:', error);
    throw new Error('Unable to load media asset.', { cause: error });
  }
}

export async function createSafetyReport(params: {
  reporterUid: string;
  targetType: 'expression' | 'user' | 'comment';
  targetId: string;
  reason: string;
  details: string;
}) {
  try {
    await db.insert(reports).values({
      reporterUid: params.reporterUid,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      details: params.details,
    });

    if (params.targetType === 'expression') {
      const exprId = Number(params.targetId);
      if (Number.isInteger(exprId)) {
        const [{ count }] = await db
          .select({ count: sql<number>`count(distinct ${reports.reporterUid})` })
          .from(reports)
          .where(
            and(
              eq(reports.targetType, 'expression'),
              eq(reports.targetId, String(exprId))
            )
          );
        if (Number(count) >= 3) {
          await db
            .update(expressions)
            .set({ moderationStatus: 'flagged' })
            .where(eq(expressions.id, exprId));
        }
      }
    }
  } catch (error) {
    console.error('createSafetyReport failed:', error);
    throw new Error('Unable to submit safety report.', { cause: error });
  }
}
