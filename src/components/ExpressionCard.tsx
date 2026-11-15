import React, { useState } from 'react';
import {
  Check,
  Flag,
  HeartHandshake,
  Lightbulb,
  MessageCircle,
  Send,
  Share2,
  ShieldBan,
  Sparkles,
  Sun,
  Compass,
  Trash2,
  Eye,
} from 'lucide-react';
import {
  canUserComment,
  ExpressionItem,
  PublicProfile,
  VIBRANCY_TYPES,
  VibrancyType,
} from '../utils/soulspark';
import { Avatar, ResilientImage } from './MediaFrame';

interface ExpressionCardProps {
  item: ExpressionItem;
  viewer: PublicProfile | null;
  connectedUids: Set<string>;
  onToggleVibrancy: (expressionId: number, type: VibrancyType) => Promise<void>;
  onAddComment: (expressionId: number, content: string) => Promise<void>;
  onDeleteExpression: (expressionId: number) => Promise<void>;
  onInspectProfile: (username: string) => void;
  onReport: (targetType: 'expression' | 'user', targetId: string, label: string) => void;
  onBlockUser: (uid: string, displayName: string) => Promise<void>;
  onRequireAuth: () => void;
}

const VIBRANCY_META: Record<
  VibrancyType,
  { icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  Inspired: {
    icon: Sparkles,
    accent: 'border-amber-300/50 bg-amber-400/15 text-amber-100',
  },
  Understood: {
    icon: HeartHandshake,
    accent: 'border-cyan-300/50 bg-cyan-400/15 text-cyan-100',
  },
  Hopeful: {
    icon: Sun,
    accent: 'border-amber-200/50 bg-amber-300/15 text-amber-50',
  },
  Curious: {
    icon: Compass,
    accent: 'border-sky-300/50 bg-sky-400/15 text-sky-100',
  },
  Moved: {
    icon: Eye,
    accent: 'border-violet-300/50 bg-violet-400/15 text-violet-100',
  },
  Appreciated: {
    icon: Lightbulb,
    accent: 'border-indigo-300/50 bg-indigo-400/15 text-indigo-100',
  },
};

export const ExpressionCard: React.FC<ExpressionCardProps> = ({
  item,
  viewer,
  connectedUids,
  onToggleVibrancy,
  onAddComment,
  onDeleteExpression,
  onInspectProfile,
  onReport,
  onBlockUser,
  onRequireAuth,
}) => {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [reactingType, setReactingType] = useState<VibrancyType | null>(null);

  const isOwner = viewer?.uid === item.author.uid;
  const formattedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const commentPermission = canUserComment({
    allowComments: item.allowComments,
    authorCommentPrivacy: item.author.commentPrivacy,
    authorIsMinorProtected: item.author.isMinorProtected,
    viewerUid: viewer?.uid ?? null,
    authorUid: item.author.uid,
    isConnected: connectedUids.has(item.author.uid),
    isBlocked: false,
  });

  const handleReact = async (type: VibrancyType) => {
    if (!viewer) {
      onRequireAuth();
      return;
    }
    setReactingType(type);
    try {
      await onToggleVibrancy(item.id, type);
    } finally {
      setReactingType(null);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewer) {
      onRequireAuth();
      return;
    }
    const clean = commentText.trim();
    if (clean.length < 2) {
      setCommentError('Please write at least 2 characters.');
      return;
    }
    setCommentError(null);
    setSubmittingComment(true);
    try {
      await onAddComment(item.id, clean);
      setCommentText('');
    } catch (err: unknown) {
      setCommentError(
        err instanceof Error ? err.message : 'Unable to post comment.'
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?expression=${item.id}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  return (
    <article
      data-testid="expression-card"
      className="rounded-2xl border border-white/10 bg-[#0B1120]/85 p-6 sm:p-7 transition-colors hover:border-white/15"
    >
      {/* Author Header */}
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={() => onInspectProfile(item.author.username)}
          className="flex items-center gap-3.5 text-left group cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 rounded-lg"
        >
          <Avatar
            src={item.author.avatarUrl}
            name={item.author.displayName}
          />
          <div>
            <p className="text-sm font-semibold text-slate-100 group-hover:text-amber-200 transition-colors">
              {item.author.displayName}
            </p>
            <p className="text-xs text-slate-400">
              @{item.author.username} <span aria-hidden="true">·</span>{' '}
              <span>{item.category}</span> <span aria-hidden="true">·</span>{' '}
              <time dateTime={item.createdAt}>{formattedDate}</time>
            </p>
          </div>
        </button>

        {/* Secondary safety & share actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleShare}
            aria-label={`Share "${item.title}"`}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100 cursor-pointer"
          >
            {copiedShare ? (
              <>
                <Check className="h-3.5 w-3.5 text-cyan-300" />
                <span className="text-cyan-200">Copied</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {isOwner ? (
            <button
              type="button"
              onClick={() => onDeleteExpression(item.id)}
              aria-label={`Delete "${item.title}"`}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-200 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!viewer) return onRequireAuth();
                  onReport('expression', String(item.id), item.title);
                }}
                aria-label={`Report "${item.title}"`}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-amber-200 cursor-pointer"
              >
                <Flag className="h-3.5 w-3.5" />
              </button>
              {viewer && (
                <button
                  type="button"
                  onClick={() =>
                    onBlockUser(item.author.uid, item.author.displayName)
                  }
                  aria-label={`Block ${item.author.displayName}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-200 cursor-pointer"
                >
                  <ShieldBan className="h-3.5 w-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Expression Content */}
      <div className="mt-5 space-y-4">
        <h2 className="font-display text-xl font-medium tracking-tight text-slate-50 sm:text-2xl">
          {item.title}
        </h2>

        {item.imageUrl && (
          <ResilientImage
            src={item.imageUrl}
            alt={item.title}
            aspectClass="aspect-[16/10]"
          />
        )}

        <p
          className={`max-w-[68ch] whitespace-pre-line text-[15px] leading-[1.7] text-slate-200 ${
            item.category === 'Poetry' ? 'font-display text-lg text-slate-100' : ''
          }`}
        >
          {item.content}
        </p>

        {item.tags.length > 0 && (
          <p className="text-xs text-slate-400">
            {item.tags.join(' · ')}
          </p>
        )}
      </div>

      {/* Vibrancy Reactions */}
      <div className="mt-6 border-t border-white/[0.08] pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {VIBRANCY_TYPES.map((type) => {
            const count = item.vibrancy.counts[type] || 0;
            const active = item.vibrancy.viewerReactions.includes(type);
            const meta = VIBRANCY_META[type];
            const Icon = meta.icon;

            return (
              <button
                key={type}
                type="button"
                disabled={reactingType === type}
                onClick={() => handleReact(type)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                  active
                    ? `${meta.accent} vibrancy-aura`
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{type}</span>
                {count > 0 && (
                  <span className="tabular-nums text-[11px] opacity-85">
                    {count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setCommentsOpen((prev) => !prev)}
            aria-expanded={commentsOpen}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>Reflections</span>
            <span className="tabular-nums text-[11px] text-slate-400">
              {item.comments.length}
            </span>
          </button>
        </div>

        {/* Comments Drawer */}
        {commentsOpen && (
          <div className="mt-5 space-y-4 border-t border-white/[0.06] pt-4">
            {item.comments.length === 0 ? (
              <p className="text-xs text-slate-400">
                No reflections yet. Share a thoughtful response if it resonates.
              </p>
            ) : (
              <ul className="space-y-3">
                {item.comments.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 rounded-xl bg-white/[0.025] p-3.5"
                  >
                    <Avatar
                      src={c.author.avatarUrl}
                      name={c.author.displayName}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => onInspectProfile(c.author.username)}
                          className="font-medium text-slate-100 hover:text-amber-200 cursor-pointer"
                        >
                          {c.author.displayName}
                        </button>
                        <span className="text-slate-500">
                          @{c.author.username} ·{' '}
                          {new Date(c.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">
                        {c.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {commentPermission.allowed ? (
              <form onSubmit={handleCommentSubmit} className="space-y-2">
                <div className="flex gap-2">
                  <label htmlFor={`comment-${item.id}`} className="sr-only">
                    Write a thoughtful reflection
                  </label>
                  <input
                    id={`comment-${item.id}`}
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a thoughtful, kind reflection..."
                    maxLength={1200}
                    className="flex-1 rounded-lg border border-white/15 bg-[#060913]/80 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submittingComment}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{submittingComment ? 'Sending...' : 'Reply'}</span>
                  </button>
                </div>
                {commentError && (
                  <p className="text-xs text-rose-300" role="alert">
                    {commentError}
                  </p>
                )}
              </form>
            ) : (
              <p className="text-xs text-slate-400">
                {commentPermission.reason}{' '}
                {!viewer && (
                  <button
                    type="button"
                    onClick={onRequireAuth}
                    className="text-amber-200 underline underline-offset-4 cursor-pointer"
                  >
                    Sign in
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
