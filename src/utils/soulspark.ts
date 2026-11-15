export const VIBRANCY_TYPES = [
  'Inspired',
  'Understood',
  'Hopeful',
  'Curious',
  'Moved',
  'Appreciated',
] as const;

export type VibrancyType = (typeof VIBRANCY_TYPES)[number];

export const EXPRESSION_CATEGORIES = [
  'Poetry',
  'Reflection',
  'Photography',
  'Philosophy',
  'Artwork',
  'Story',
] as const;

export type ExpressionCategory = (typeof EXPRESSION_CATEGORIES)[number];

export const INTEREST_CATALOG = [
  'Poetry',
  'Analog Photography',
  'Philosophy',
  'Contemplation',
  'Visual Art',
  'Astronomy',
  'Slow Living',
  'Kindness',
  'Ecology',
  'Music',
  'Ceramics',
  'Storytelling',
  'Architecture',
  'Hope',
  'Curiosity',
] as const;

export const COLLECTIVE_KINDS = [
  'Collaborative Poetry',
  'Shared Photography',
  'Philosophical Circle',
  'Creative Challenge',
  'Community Story',
] as const;

export const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate or harmful speech',
  'Spam or solicitation',
  'Sensitive personal info exposed',
  'Unsafe content for younger members',
] as const;

export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  interests: string[];
  isMinorProtected: boolean;
  connectionPrivacy: 'public' | 'connections' | 'private';
  commentPrivacy: 'everyone' | 'connections' | 'none';
  onboardingComplete: boolean;
  createdAt: string;
}

export interface VibrancySummary {
  counts: Record<VibrancyType, number>;
  viewerReactions: VibrancyType[];
}

export interface ExpressionComment {
  id: number;
  expressionId: number;
  content: string;
  createdAt: string;
  author: Pick<PublicProfile, 'uid' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface ExpressionItem {
  id: number;
  title: string;
  category: ExpressionCategory | string;
  content: string;
  imageUrl: string | null;
  tags: string[];
  allowComments: 'everyone' | 'connections' | 'off';
  createdAt: string;
  author: PublicProfile;
  vibrancy: VibrancySummary;
  comments: ExpressionComment[];
}

export interface ConnectionRecord {
  id: number;
  status: 'pending' | 'accepted' | 'declined';
  introNote: string;
  createdAt: string;
  peer: PublicProfile;
  direction: 'incoming' | 'outgoing';
  sharedInterests: string[];
}

export interface CollectiveContributionItem {
  id: number;
  spaceId: number;
  content: string;
  imageUrl: string | null;
  createdAt: string;
  author: Pick<PublicProfile, 'uid' | 'username' | 'displayName' | 'avatarUrl'>;
}

export interface CollectiveSpaceItem {
  id: number;
  title: string;
  kind: string;
  prompt: string;
  coverImageUrl: string | null;
  tags: string[];
  createdAt: string;
  creator: Pick<PublicProfile, 'uid' | 'username' | 'displayName' | 'avatarUrl'>;
  contributions: CollectiveContributionItem[];
}

const HARMFUL_PATTERNS = [
  /\b(kill yourself|kys|go die)\b/i,
  /\b(slur_placeholder)\b/i,
];

const SENSITIVE_PII_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN-like
  /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone number
];

const SPAM_PATTERNS = [
  /(.)\1{14,}/, // excessive repeated characters
  /\b(buy now|crypto airdrop|guaranteed returns|dm for promo)\b/i,
];

export function checkContentSafety(text: string): {
  safe: boolean;
  reason?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { safe: false, reason: 'Content cannot be empty.' };
  }

  const urlCount = (trimmed.match(/https?:\/\/\S+/gi) || []).length;
  if (urlCount >= 3) {
    return {
      safe: false,
      reason:
        'This text triggered our anti-spam guard. Please share authentic human expression without promotional link lists.',
    };
  }

  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason:
          'SOULSPARK does not permit harassment, bullying, or harmful content.',
      };
    }
  }

  for (const pattern of SENSITIVE_PII_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason:
          'For your privacy, please avoid sharing phone numbers or sensitive personal identifiers.',
      };
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        safe: false,
        reason:
          'This text triggered our anti-spam guard. Please share authentic human expression without promotional links or repetition.',
      };
    }
  }

  return { safe: true };
}

export function validateExpressionInput(input: {
  title: string;
  category: string;
  content: string;
  tags?: string[];
}): { valid: boolean; error?: string } {
  const title = input.title.trim();
  const content = input.content.trim();

  if (title.length < 3 || title.length > 140) {
    return {
      valid: false,
      error: 'Title must be between 3 and 140 characters.',
    };
  }

  if (!EXPRESSION_CATEGORIES.includes(input.category as ExpressionCategory)) {
    return { valid: false, error: 'Please select a valid expression category.' };
  }

  if (content.length < 10 || content.length > 4000) {
    return {
      valid: false,
      error: 'Expression content must be between 10 and 4,000 characters.',
    };
  }

  const titleCheck = checkContentSafety(title);
  if (!titleCheck.safe) {
    return { valid: false, error: titleCheck.reason };
  }

  const contentCheck = checkContentSafety(content);
  if (!contentCheck.safe) {
    return { valid: false, error: contentCheck.reason };
  }

  return { valid: true };
}

export function computeSharedInterests(
  viewerInterests: string[],
  otherInterests: string[]
): string[] {
  const normalizedViewer = new Set(
    viewerInterests.map((i) => i.trim().toLowerCase())
  );
  return otherInterests.filter((interest) =>
    normalizedViewer.has(interest.trim().toLowerCase())
  );
}

/**
 * Diversifies a chronological list of expressions so no single author or category
 * dominates consecutive slots, explicitly avoiding popularity-based ranking.
 */
export function diversifyFeed<
  T extends { author: { uid: string }; category: string; createdAt: string }
>(items: T[]): T[] {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const result: T[] = [];
  const pool = [...sorted];

  while (pool.length > 0) {
    const prev = result[result.length - 1];
    if (!prev) {
      result.push(pool.shift()!);
      continue;
    }

    const diverseIdx = pool.findIndex(
      (candidate) =>
        candidate.author.uid !== prev.author.uid &&
        candidate.category !== prev.category
    );
    const authorDiverseIdx =
      diverseIdx !== -1
        ? diverseIdx
        : pool.findIndex((candidate) => candidate.author.uid !== prev.author.uid);

    const pickIdx = authorDiverseIdx !== -1 ? authorDiverseIdx : 0;
    result.push(pool.splice(pickIdx, 1)[0]);
  }

  return result;
}

export function canUserComment(params: {
  allowComments: 'everyone' | 'connections' | 'off';
  authorCommentPrivacy: 'everyone' | 'connections' | 'none';
  authorIsMinorProtected: boolean;
  viewerUid: string | null;
  authorUid: string;
  isConnected: boolean;
  isBlocked: boolean;
}): { allowed: boolean; reason?: string } {
  if (!params.viewerUid) {
    return { allowed: false, reason: 'Sign in to leave a thoughtful reflection.' };
  }
  if (params.isBlocked) {
    return { allowed: false, reason: 'Comments are unavailable for this account.' };
  }
  if (params.viewerUid === params.authorUid) {
    if (params.allowComments === 'off') {
      return { allowed: false, reason: 'Comments are turned off for this expression.' };
    }
    return { allowed: true };
  }
  if (params.allowComments === 'off' || params.authorCommentPrivacy === 'none') {
    return { allowed: false, reason: 'The author has turned off comments here.' };
  }
  if (
    params.allowComments === 'connections' ||
    params.authorCommentPrivacy === 'connections' ||
    params.authorIsMinorProtected
  ) {
    if (!params.isConnected) {
      return {
        allowed: false,
        reason: 'Only accepted Soul Connections can comment on this expression.',
      };
    }
  }
  return { allowed: true };
}

export function canSendConnectionRequest(params: {
  senderUid: string;
  recipientUid: string;
  recipientIsMinorProtected: boolean;
  isBlocked: boolean;
  existingStatus: 'pending' | 'accepted' | 'declined' | null;
}): { allowed: boolean; reason?: string } {
  if (params.senderUid === params.recipientUid) {
    return { allowed: false, reason: 'You cannot connect with yourself.' };
  }
  if (params.isBlocked) {
    return { allowed: false, reason: 'Connection unavailable.' };
  }
  if (params.recipientIsMinorProtected) {
    return {
      allowed: false,
      reason:
        'This member uses younger-user protection mode, which pauses unsolicited connection requests.',
    };
  }
  if (params.existingStatus === 'pending') {
    return { allowed: false, reason: 'A connection request is already pending.' };
  }
  if (params.existingStatus === 'accepted') {
    return { allowed: false, reason: 'You are already Soul Connections.' };
  }
  return { allowed: true };
}

export function createEmptyVibrancyCounts(): Record<VibrancyType, number> {
  return {
    Inspired: 0,
    Understood: 0,
    Hopeful: 0,
    Curious: 0,
    Moved: 0,
    Appreciated: 0,
  };
}

export function sanitizeUsername(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return cleaned.length >= 3 ? cleaned : `soul_${cleaned || 'traveler'}`;
}
