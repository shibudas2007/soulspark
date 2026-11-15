import React, { useState } from 'react';
import { ArrowRight, Feather, Sparkles } from 'lucide-react';
import {
  CollectiveSpaceItem,
  EXPRESSION_CATEGORIES,
  ExpressionItem,
  PublicProfile,
  VibrancyType,
} from '../utils/soulspark';
import { ExpressionCard } from './ExpressionCard';

interface HomeViewProps {
  expressions: ExpressionItem[];
  collectives: CollectiveSpaceItem[];
  loading: boolean;
  error: string | null;
  viewer: PublicProfile | null;
  connectedUids: Set<string>;
  onToggleVibrancy: (expressionId: number, type: VibrancyType) => Promise<void>;
  onAddComment: (expressionId: number, content: string) => Promise<void>;
  onDeleteExpression: (expressionId: number) => Promise<void>;
  onInspectProfile: (username: string) => void;
  onReport: (targetType: 'expression' | 'user', targetId: string, label: string) => void;
  onBlockUser: (uid: string, displayName: string) => Promise<void>;
  onRequireAuth: () => void;
  onGoExpress: () => void;
  onOpenCollective: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  expressions,
  collectives,
  loading,
  error,
  viewer,
  connectedUids,
  onToggleVibrancy,
  onAddComment,
  onDeleteExpression,
  onInspectProfile,
  onReport,
  onBlockUser,
  onRequireAuth,
  onGoExpress,
  onOpenCollective,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [personalizedOnly, setPersonalizedOnly] = useState(false);

  const filtered = expressions.filter((item) => {
    if (
      selectedCategory !== 'All' &&
      item.category.toLowerCase() !== selectedCategory.toLowerCase()
    ) {
      return false;
    }
    if (personalizedOnly && viewer && viewer.interests.length > 0) {
      const viewerSet = new Set(viewer.interests.map((i) => i.toLowerCase()));
      const matchesTag = item.tags.some((t) => viewerSet.has(t.toLowerCase()));
      const matchesAuthor = item.author.interests.some((t) =>
        viewerSet.has(t.toLowerCase())
      );
      const isConnection = connectedUids.has(item.author.uid);
      return matchesTag || matchesAuthor || isConnection;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        {/* Main Feed Column */}
        <div className="space-y-6 lg:col-span-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-normal tracking-tight text-slate-50 sm:text-3xl">
                Sanctuary Feed
              </h1>
              <p className="text-sm text-slate-400">
                Diverse human expressions ordered with calm intention, never by
                popularity.
              </p>
            </div>

            <button
              type="button"
              onClick={onGoExpress}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Feather className="h-3.5 w-3.5" />
              <span>Share Expression</span>
            </button>
          </div>

          {/* Category Filter Tabs & Resonance Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div
              role="tablist"
              aria-label="Filter expressions by category"
              className="flex flex-wrap items-center gap-1.5"
            >
              {['All', ...EXPRESSION_CATEGORIES].map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-white/15 text-amber-100'
                        : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {viewer && (
              <button
                type="button"
                onClick={() => setPersonalizedOnly((p) => !p)}
                aria-pressed={personalizedOnly}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  personalizedOnly
                    ? 'border-cyan-400/50 bg-cyan-400/15 text-cyan-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                }`}
              >
                {personalizedOnly ? 'Matching My Interests' : 'All Perspectives'}
              </button>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0B1120]/70 p-10 text-center space-y-3">
              <p className="font-display text-lg text-slate-100">
                Quiet horizon in this filter
              </p>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                No expressions match the selected filter yet. Try viewing all
                perspectives or be the first to contribute a thought.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setPersonalizedOnly(false);
                }}
                className="rounded-lg border border-white/15 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.06] cursor-pointer"
              >
                Show All Perspectives
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filtered.map((item) => (
                <ExpressionCard
                  key={item.id}
                  item={item}
                  viewer={viewer}
                  connectedUids={connectedUids}
                  onToggleVibrancy={onToggleVibrancy}
                  onAddComment={onAddComment}
                  onDeleteExpression={onDeleteExpression}
                  onInspectProfile={onInspectProfile}
                  onReport={onReport}
                  onBlockUser={onBlockUser}
                  onRequireAuth={onRequireAuth}
                />
              ))}

              {/* Mindful Horizon End Card (anti-infinite-scroll ethos) */}
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/30 via-[#0B1120] to-cyan-950/20 p-6 text-center space-y-2">
                <Sparkles className="mx-auto h-5 w-5 text-amber-200/80" />
                <p className="font-display text-lg text-slate-100">
                  You have reached the quiet edge of today’s stream.
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Take a breath, write a reflection of your own, or step away
                  into the world beyond the screen.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Side Column: Collective Creation Spotlight & Healthy Habits */}
        <aside className="space-y-6 lg:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-[#0B1120]/80 p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-normal text-slate-50">
                Collective Creation
              </h2>
              <button
                type="button"
                onClick={onOpenCollective}
                className="inline-flex items-center gap-1 text-xs font-medium text-amber-200 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Join spaces</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-xs leading-relaxed text-slate-400">
              Co-create living poetry, shared photography, and philosophical
              circles with fellow travelers.
            </p>

            <div className="space-y-4">
              {collectives.slice(0, 3).map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={onOpenCollective}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-violet-400/40 hover:bg-white/[0.04] cursor-pointer"
                >
                  <p className="text-[11px] font-medium text-cyan-200/90">
                    {space.kind} · {space.contributions.length}{' '}
                    {space.contributions.length === 1
                      ? 'contribution'
                      : 'contributions'}
                  </p>
                  <h3 className="mt-1 font-display text-base font-medium text-slate-100">
                    {space.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">
                    {space.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1120]/60 p-6 space-y-3">
            <h2 className="font-display text-lg font-normal text-slate-100">
              Gentle Rhythm
            </h2>
            <p className="text-xs leading-relaxed text-slate-400">
              SOULSPARK has no public follower rankings, no countdown streaks,
              and no autoplay feeds. Every reaction is a quiet signal of human
              resonance.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
